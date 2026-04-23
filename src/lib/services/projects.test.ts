import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";

// Isolated test sqlite file, same pattern as bootstrap-admin.test.ts. Set
// BEFORE importing anything that reaches @prisma/client.
const TEST_DB_ABS = path.resolve(process.cwd(), "prisma/test-projects.db");
process.env.DATABASE_URL = `file:${TEST_DB_ABS.replace(/\\/g, "/")}`;

async function loadFresh() {
  const vitest = await import("vitest");
  vitest.vi.resetModules();
  const db = await import("../db");
  const svc = await import("./projects");
  return { prisma: db.prisma, svc };
}

describe("projects service", () => {
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
    await prisma.project.deleteMany({});
  });

  it("creates and lists projects, parsing tags JSON back to an array", async () => {
    const { svc } = await loadFresh();
    await svc.createProject({
      slug: "t1",
      title: "T1",
      group: "G",
      summary: "s",
      tags: ["a", "b"],
      date: "2026-01-01",
    });
    const list = await svc.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0]!.slug).toBe("t1");
    expect(list[0]!.tags).toEqual(["a", "b"]);
    expect(list[0]!.summary).toBe("s");
    expect(list[0]!.status).toBeNull();
  }, 20_000);

  it("orders by `order` asc, then createdAt asc", async () => {
    const { svc, prisma } = await loadFresh();
    // Create three projects and then rewrite their `order` field to flip it
    await svc.createProject({ slug: "a", title: "A", group: "G", summary: "", tags: [], date: "2026-01-01" });
    await svc.createProject({ slug: "b", title: "B", group: "G", summary: "", tags: [], date: "2026-01-01" });
    await svc.createProject({ slug: "c", title: "C", group: "G", summary: "", tags: [], date: "2026-01-01" });
    const all = await prisma.project.findMany();
    const [a, b, c] = all;
    await svc.updateProject(a!.id, { order: 3 });
    await svc.updateProject(b!.id, { order: 1 });
    await svc.updateProject(c!.id, { order: 2 });
    const list = await svc.listProjects();
    expect(list.map((p) => p.slug)).toEqual(["b", "c", "a"]);
  }, 20_000);

  it("patch updates tags round-trip via JSON encoding", async () => {
    const { svc } = await loadFresh();
    const p = await svc.createProject({
      slug: "t2",
      title: "T",
      group: "G",
      summary: "",
      tags: [],
      date: "2026-01-01",
    });
    const updated = await svc.updateProject(p.id, { tags: ["x", "y"] });
    expect(updated.tags).toEqual(["x", "y"]);
  }, 20_000);

  it("patch can set nullable fields back to null", async () => {
    const { svc } = await loadFresh();
    const p = await svc.createProject({
      slug: "t4",
      title: "T",
      group: "G",
      summary: "",
      tags: [],
      date: "2026-01-01",
      url: "some-slug",
      repoUrl: "https://github.com/example-user/x",
      status: "live",
      markdown: "# hi",
    });
    const cleared = await svc.updateProject(p.id, {
      url: null,
      repoUrl: null,
      status: null,
      markdown: null,
    });
    expect(cleared.url).toBeNull();
    expect(cleared.repoUrl).toBeNull();
    expect(cleared.status).toBeNull();
    expect(cleared.markdown).toBeNull();
  }, 20_000);

  it("getProject returns null when slug does not exist", async () => {
    const { svc } = await loadFresh();
    const r = await svc.getProject("does-not-exist");
    expect(r).toBeNull();
  }, 10_000);

  it("delete removes the project", async () => {
    const { svc } = await loadFresh();
    const p = await svc.createProject({
      slug: "t3",
      title: "T",
      group: "G",
      summary: "",
      tags: [],
      date: "2026-01-01",
    });
    await svc.deleteProject(p.id);
    const list = await svc.listProjects();
    expect(list).toHaveLength(0);
  }, 20_000);
});
