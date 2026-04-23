import "server-only";
import { prisma } from "@/lib/db";

// Sliding-window rate limit on the credentials login endpoint.
// After MAX_FAILURES failed attempts for a given email OR IP inside
// WINDOW_MS, the account/IP pair is locked out for LOCKOUT_MS. Successful
// logins are recorded but do not contribute to the lockout counter.
export const WINDOW_MS = 15 * 60 * 1000; // 15 min sliding window
export const MAX_FAILURES = 5;            // 5 failures per window → lockout
export const LOCKOUT_MS = 30 * 60 * 1000; // 30 min lockout after tripping

export type ThrottleResult =
  | { ok: true }
  | { ok: false; reason: "locked"; retryAfterSec: number };

export async function checkLoginAllowed(email: string, ip: string): Promise<ThrottleResult> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS);
  const lockoutStart = new Date(now - LOCKOUT_MS);

  // Count failures in last window, keyed by email and IP separately.
  // Either axis exceeding MAX_FAILURES trips the lockout — prevents both
  // credential stuffing (many emails from one IP) and targeted brute force
  // (many passwords against one account from a botnet).
  const [failsByEmail, failsByIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { email, success: false, createdAt: { gte: windowStart } },
    }),
    prisma.loginAttempt.count({
      where: { ip, success: false, createdAt: { gte: windowStart } },
    }),
  ]);

  const over = Math.max(failsByEmail, failsByIp);
  if (over >= MAX_FAILURES) {
    // retry-after = (earliest contributing failure + LOCKOUT_MS) - now
    const earliest = await prisma.loginAttempt.findFirst({
      where: {
        OR: [{ email }, { ip }],
        success: false,
        createdAt: { gte: lockoutStart },
      },
      orderBy: { createdAt: "asc" },
    });
    const retryAtMs = earliest
      ? earliest.createdAt.getTime() + LOCKOUT_MS
      : now + LOCKOUT_MS;
    return {
      ok: false,
      reason: "locked",
      retryAfterSec: Math.max(1, Math.ceil((retryAtMs - now) / 1000)),
    };
  }

  return { ok: true };
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ip, success } });
  // Opportunistic cleanup: delete records older than 24h. Only ~1% of the
  // time so we don't hammer the DB — attempts are low-volume anyway.
  if (Math.random() < 0.01) {
    await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  }
}
