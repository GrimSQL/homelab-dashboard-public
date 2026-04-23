import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";

// Same isolation pattern as bootstrap-admin.test.ts: set DATABASE_URL before
// any module import that instantiates PrismaClient.
const TEST_DB_ABS = path.resolve(process.cwd(), "prisma/invites-test.db");
process.env.DATABASE_URL = `file:${TEST_DB_ABS.replace(/\\/g, "/")}`;

async function loadFresh() {
  const vitest = await import("vitest");
  vitest.vi.resetModules();
  const db = await import("./db");
  const invites = await import("./invites");
  return { prisma: db.prisma, ...invites };
}

async function seedUser(prisma: Awaited<ReturnType<typeof loadFresh>>["prisma"]) {
  return prisma.user.create({
    data: {
      email: `inviter-${Date.now()}-${Math.random()}@example.com`,
      name: "Inviter",
      passwordHash: "x",
      role: "admin",
    },
  });
}

describe("invites", () => {
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
    // Clean slate between tests. Delete invites first (FK).
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("generateInviteCode returns 32 lowercase hex chars", async () => {
    const { generateInviteCode } = await loadFresh();
    for (let i = 0; i < 20; i++) {
      const c = generateInviteCode();
      expect(c).toHaveLength(32);
      expect(c).toMatch(/^[a-f0-9]{32}$/);
    }
  });

  it("generateInviteCode produces unique codes across calls", async () => {
    const { generateInviteCode } = await loadFresh();
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(generateInviteCode());
    expect(set.size).toBe(100);
  });

  it("validateInviteCode rejects garbage / wrong-length / non-hex codes", async () => {
    const { validateInviteCode } = await loadFresh();
    const bad = ["", "abc", "zzzz", "A".repeat(32), "g".repeat(32), "0".repeat(31), "0".repeat(33)];
    for (const c of bad) {
      const r = await validateInviteCode(c);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("not-found");
    }
  });

  it("validateInviteCode returns not-found for a well-formed code that was never issued", async () => {
    const { validateInviteCode } = await loadFresh();
    const r = await validateInviteCode("0".repeat(32));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not-found");
  });

  it("validateInviteCode returns ok for a fresh invite with a future expiry", async () => {
    const { prisma, generateInviteCode, validateInviteCode } = await loadFresh();
    const u = await seedUser(prisma);
    const code = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        code,
        role: "user",
        createdById: u.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const r = await validateInviteCode(code);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.invite.code).toBe(code);
      expect(r.invite.role).toBe("user");
    }
  });

  it("validateInviteCode surfaces expired invites", async () => {
    const { prisma, generateInviteCode, validateInviteCode } = await loadFresh();
    const u = await seedUser(prisma);
    const code = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        code,
        role: "user",
        createdById: u.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const r = await validateInviteCode(code);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("validateInviteCode surfaces revoked invites", async () => {
    const { prisma, generateInviteCode, validateInviteCode } = await loadFresh();
    const u = await seedUser(prisma);
    const code = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        code,
        role: "user",
        createdById: u.id,
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: new Date(),
      },
    });
    const r = await validateInviteCode(code);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("revoked");
  });

  it("validateInviteCode surfaces already-used invites", async () => {
    const { prisma, generateInviteCode, validateInviteCode } = await loadFresh();
    const u = await seedUser(prisma);
    const code = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        code,
        role: "user",
        createdById: u.id,
        expiresAt: new Date(Date.now() + 86_400_000),
        usedAt: new Date(),
        usedById: u.id,
      },
    });
    const r = await validateInviteCode(code);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("already-used");
  });

  it("revoked takes precedence over expired / already-used in the validity check order", async () => {
    // Admins revoke invites mainly to deactivate them mid-life. If a
    // revoked code also happens to be expired, we still want "revoked" in
    // the UI copy since that was the explicit admin action.
    const { prisma, generateInviteCode, validateInviteCode } = await loadFresh();
    const u = await seedUser(prisma);
    const code = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        code,
        role: "user",
        createdById: u.id,
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: new Date(),
      },
    });
    const r = await validateInviteCode(code);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("revoked");
  });
});
