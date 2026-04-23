import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";

// Use an isolated test sqlite file. Set this BEFORE importing anything that
// reaches @prisma/client, since PrismaClient captures DATABASE_URL at init.
// Note: SQLite file paths in Prisma are resolved relative to the schema
// file, so we use an absolute path to avoid surprises.
const TEST_DB_ABS = path.resolve(process.cwd(), "prisma/test.db");
process.env.DATABASE_URL = `file:${TEST_DB_ABS.replace(/\\/g, "/")}`;

async function loadFresh() {
  // Drop module caches so db.ts re-reads DATABASE_URL.
  const vitest = await import("vitest");
  vitest.vi.resetModules();
  const db = await import("./db");
  const boot = await import("./bootstrap-admin");
  return { prisma: db.prisma, bootstrapAdmin: boot.bootstrapAdmin, __reset: boot.__resetBootstrappedForTests };
}

describe("bootstrapAdmin", () => {
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
    const { prisma, __reset } = await loadFresh();
    await prisma.user.deleteMany({});
    __reset();
  });

  it("creates the admin user when ADMIN_EMAIL + ADMIN_PASSWORD are set and the user doesn't exist", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "GoodAdmin1!Password";

    const { prisma, bootstrapAdmin } = await loadFresh();
    await bootstrapAdmin();

    const user = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
    expect(user?.passwordHash.length).toBeGreaterThan(20);
  }, 20_000);

  it("is idempotent: running twice results in a single user and does not rewrite the hash", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "GoodAdmin1!Password";

    const { prisma, bootstrapAdmin } = await loadFresh();
    await bootstrapAdmin();
    const first = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
    expect(first).not.toBeNull();

    // Second run with a DIFFERENT password — should be a no-op
    process.env.ADMIN_PASSWORD = "DifferentPassword2!";
    const reloaded = await loadFresh();
    await reloaded.bootstrapAdmin();

    const users = await reloaded.prisma.user.findMany({ where: { email: "admin@example.com" } });
    expect(users).toHaveLength(1);
    expect(users[0]!.passwordHash).toBe(first!.passwordHash);
  }, 30_000);

  it("skips silently when ADMIN_EMAIL / ADMIN_PASSWORD are not set", async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    const { prisma, bootstrapAdmin } = await loadFresh();
    await bootstrapAdmin();

    const count = await prisma.user.count();
    expect(count).toBe(0);
  }, 10_000);

  it("skips (and does not throw) when ADMIN_PASSWORD fails policy", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "weak";

    const { prisma, bootstrapAdmin } = await loadFresh();
    await bootstrapAdmin();

    const count = await prisma.user.count();
    expect(count).toBe(0);
  }, 10_000);
});
