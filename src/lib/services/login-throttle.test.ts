import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";

// Isolated sqlite file. Must be set before any import that reaches prisma.
const TEST_DB_ABS = path.resolve(process.cwd(), "prisma/test-login-throttle.db");
process.env.DATABASE_URL = `file:${TEST_DB_ABS.replace(/\\/g, "/")}`;

async function loadFresh() {
  const vitest = await import("vitest");
  vitest.vi.resetModules();
  const db = await import("../db");
  const svc = await import("./login-throttle");
  return { prisma: db.prisma, svc };
}

describe("login-throttle", () => {
  beforeAll(() => {
    if (existsSync(TEST_DB_ABS)) unlinkSync(TEST_DB_ABS);
    execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
  });

  afterAll(async () => {
    const { prisma } = await loadFresh();
    await prisma.$disconnect();
    if (existsSync(TEST_DB_ABS)) unlinkSync(TEST_DB_ABS);
  });

  beforeEach(async () => {
    const { prisma } = await loadFresh();
    await prisma.loginAttempt.deleteMany({});
    vi.useRealTimers();
  });

  it("allows login when no failures recorded", async () => {
    const { svc } = await loadFresh();
    const r = await svc.checkLoginAllowed("a@example.com", "1.2.3.4");
    expect(r.ok).toBe(true);
  }, 20_000);

  it("locks account after 5 failures within the window", async () => {
    const { svc } = await loadFresh();
    for (let i = 0; i < 5; i++) {
      await svc.recordLoginAttempt("b@example.com", "1.2.3.4", false);
    }
    const r = await svc.checkLoginAllowed("b@example.com", "1.2.3.4");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("locked");
      // Lockout is 30 min = 1800s. Just-after-trip retry should be close to that.
      expect(r.retryAfterSec).toBeGreaterThan(1700);
      expect(r.retryAfterSec).toBeLessThanOrEqual(1800);
    }
  }, 20_000);

  it("locks by IP axis when same IP hammers many emails", async () => {
    const { svc } = await loadFresh();
    for (let i = 0; i < 5; i++) {
      await svc.recordLoginAttempt(`user${i}@example.com`, "5.6.7.8", false);
    }
    // Distinct email that has no direct failures, but the IP is over-limit.
    const r = await svc.checkLoginAllowed("fresh@example.com", "5.6.7.8");
    expect(r.ok).toBe(false);
  }, 20_000);

  it("does not count successful logins toward the lockout", async () => {
    const { svc } = await loadFresh();
    for (let i = 0; i < 10; i++) {
      await svc.recordLoginAttempt("c@example.com", "9.9.9.9", true);
    }
    const r = await svc.checkLoginAllowed("c@example.com", "9.9.9.9");
    expect(r.ok).toBe(true);
  }, 20_000);

  it("unlocks after the lockout window has passed (faked clock)", async () => {
    const { svc, prisma } = await loadFresh();
    // Insert 5 failures, stamped 31 minutes ago so the sliding window has cleared them.
    const oldCreatedAt = new Date(Date.now() - 31 * 60 * 1000);
    for (let i = 0; i < 5; i++) {
      await prisma.loginAttempt.create({
        data: {
          email: "d@example.com",
          ip: "2.2.2.2",
          success: false,
          createdAt: oldCreatedAt,
        },
      });
    }
    const r = await svc.checkLoginAllowed("d@example.com", "2.2.2.2");
    expect(r.ok).toBe(true);
  }, 20_000);

  it("recordLoginAttempt writes a row", async () => {
    const { svc, prisma } = await loadFresh();
    await svc.recordLoginAttempt("e@example.com", "3.3.3.3", false);
    const rows = await prisma.loginAttempt.findMany({
      where: { email: "e@example.com" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.success).toBe(false);
    expect(rows[0]!.ip).toBe("3.3.3.3");
  }, 20_000);
});
