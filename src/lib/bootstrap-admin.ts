import "server-only";
import { prisma } from "./db";
import { hashPassword, checkPasswordPolicy } from "./password";

let bootstrapped = false;

/**
 * Idempotent first-boot admin seeding.
 *
 * If ADMIN_EMAIL + ADMIN_PASSWORD are set AND no user exists with that email,
 * create the admin user. On subsequent calls (same process or different
 * containers that share the mounted SQLite file) this is a no-op.
 *
 * Password changes after first boot must go through the admin UI — re-running
 * this with a different ADMIN_PASSWORD does NOT rewrite the hash. That's by
 * design: a leaked env file should not be able to hijack the admin account.
 */
export async function bootstrapAdmin(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("[bootstrap] ADMIN_EMAIL/ADMIN_PASSWORD not set - skipping admin seed");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[bootstrap] admin user ${email} already exists`);
    return;
  }

  const policy = checkPasswordPolicy(password);
  if (!policy.ok) {
    console.error(`[bootstrap] ADMIN_PASSWORD fails policy: ${policy.reason}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, name: "Admin", passwordHash, role: "admin" },
  });
  console.log(`[bootstrap] created admin user ${email}`);
}

/**
 * Test-only reset of the "already bootstrapped" latch.
 */
export function __resetBootstrappedForTests(): void {
  bootstrapped = false;
}
