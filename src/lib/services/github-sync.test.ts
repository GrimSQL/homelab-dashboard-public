import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import path from "node:path";

// Isolated test sqlite file. Set BEFORE importing anything that reaches
// @prisma/client so PrismaClient picks it up.
const TEST_DB_ABS = path.resolve(process.cwd(), "prisma/test-github-sync.db");
process.env.DATABASE_URL = `file:${TEST_DB_ABS.replace(/\\/g, "/")}`;
// Ensure isGithubConfigured() returns true so the sync actually runs.
process.env.GITHUB_TOKEN = "fake-token-for-tests";
process.env.GITHUB_SYNC_OWNER = "example-user";

import type { GithubRepo } from "../sources/github";

function repo(over: Partial<GithubRepo> = {}): GithubRepo {
  return {
    id: over.id ?? 1,
    name: over.name ?? "demo",
    full_name: over.full_name ?? `example-user/${over.name ?? "demo"}`,
    private: over.private ?? false,
    fork: over.fork ?? false,
    archived: over.archived ?? false,
    description: over.description ?? "demo description",
    html_url: over.html_url ?? `https://github.com/example-user/${over.name ?? "demo"}`,
    topics: over.topics ?? [],
    language: over.language ?? null,
    pushed_at: over.pushed_at ?? "2026-04-01T00:00:00Z",
    updated_at: over.updated_at ?? "2026-04-01T00:00:00Z",
    created_at: over.created_at ?? "2026-01-01T00:00:00Z",
    default_branch: over.default_branch ?? "main",
  };
}

async function loadFresh(mockRepos: GithubRepo[]) {
  vi.resetModules();
  vi.doMock("../sources/github", () => ({
    listOwnerRepos: vi.fn().mockResolvedValue(mockRepos),
    fetchReadme: vi.fn().mockResolvedValue("# README\n\ncontent"),
  }));
  const db = await import("../db");
  const svc = await import("./github-sync");
  return { prisma: db.prisma, svc };
}

describe("syncFromGithub", () => {
  beforeAll(() => {
    if (existsSync(TEST_DB_ABS)) unlinkSync(TEST_DB_ABS);
    execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
  });

  afterAll(async () => {
    const { prisma } = await loadFresh([]);
    await prisma.$disconnect();
    if (existsSync(TEST_DB_ABS)) unlinkSync(TEST_DB_ABS);
  });

  beforeEach(async () => {
    const { prisma } = await loadFresh([]);
    await prisma.project.deleteMany({});
    await prisma.appSetting.deleteMany({});
  });

  it("creates new projects for every GitHub repo when DB is empty", async () => {
    const repos = [
      repo({ name: "app1", topics: ["product", "typescript"], description: "meal planner" }),
      repo({ name: "demo-app", topics: ["product"], description: "demo site" }),
      repo({ name: "demo-scripts", topics: ["game-bot", "game"], description: "Game bots" }),
    ];
    const { prisma, svc } = await loadFresh(repos);

    const result = await svc.syncFromGithub();

    expect(result.ok).toBe(true);
    expect(result.scanned).toBe(3);
    expect(result.created).toBe(3);
    expect(result.updated).toBe(0);
    expect(result.errors).toEqual([]);

    const rows = await prisma.project.findMany({ orderBy: { slug: "asc" } });
    expect(rows.map((r) => r.slug)).toEqual(["app1", "demo-app", "demo-scripts"]);

    const app1 = rows.find((r) => r.slug === "app1")!;
    expect(app1.source).toBe("github");
    expect(app1.repoUrl).toBe("https://github.com/example-user/app1");
    expect(app1.group).toBe("Products");
    expect(JSON.parse(app1.tags)).toEqual(["product", "typescript"]);
    expect(app1.markdown).toContain("# README");
    expect(app1.lastSyncedAt).not.toBeNull();

    const grim = rows.find((r) => r.slug === "demo-scripts")!;
    expect(grim.group).toBe("example-scripts (Game)");
  }, 30_000);

  it("does NOT overwrite admin edits on source=manual rows, only fills empty fields", async () => {
    const { prisma, svc } = await loadFresh([
      repo({ name: "app1", topics: ["product", "typescript"], description: "from-github summary" }),
    ]);

    // Pre-existing manual row: admin has customized title + summary but left
    // tags/status/repoUrl empty.
    await prisma.project.create({
      data: {
        slug: "app1",
        title: "StockPot (my edit)",
        group: "Products",
        summary: "my curated summary",
        tags: "[]",
        date: "2025-10-01",
        url: null,
        repoUrl: null,
        status: null,
        markdown: null,
        order: 1,
        source: "manual",
      },
    });

    const result = await svc.syncFromGithub();
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);

    const row = await prisma.project.findUnique({ where: { slug: "app1" } });
    expect(row!.title).toBe("StockPot (my edit)"); // admin edit preserved
    expect(row!.summary).toBe("my curated summary"); // admin edit preserved
    expect(row!.repoUrl).toBe("https://github.com/example-user/app1"); // filled in
    expect(row!.status).toBe("live"); // filled in
    expect(JSON.parse(row!.tags)).toEqual(["product", "typescript"]); // filled in (was empty)
    expect(row!.source).toBe("manual"); // unchanged
    expect(row!.lastSyncedAt).not.toBeNull();
  }, 30_000);

  it("refreshes summary/tags/status on source=github rows", async () => {
    const { prisma, svc } = await loadFresh([
      repo({
        name: "demo",
        topics: ["product", "updated-tag"],
        description: "new description",
        archived: true,
      }),
    ]);

    await prisma.project.create({
      data: {
        slug: "demo",
        title: "demo",
        group: "Unsorted",
        summary: "old summary",
        tags: JSON.stringify(["old-tag"]),
        date: "2026-01-01",
        url: null,
        repoUrl: "https://github.com/example-user/demo",
        status: "live",
        markdown: null,
        order: 1,
        source: "github",
      },
    });

    const result = await svc.syncFromGithub();
    expect(result.updated).toBe(1);

    const row = await prisma.project.findUnique({ where: { slug: "demo" } });
    expect(row!.summary).toBe("new description");
    expect(JSON.parse(row!.tags)).toEqual(["product", "updated-tag"]);
    expect(row!.status).toBe("archived");
    expect(row!.source).toBe("github");
  }, 30_000);

  it("continues processing other repos when one errors out; last-sync timestamp still recorded", async () => {
    // A repo whose name normalizes to an empty slug (purely non-alphanum
    // chars collapse to "") triggers the "empty slug" error path. The other
    // two repos should still get created.
    const repos = [
      repo({ name: "good1", topics: ["product"] }),
      repo({ name: "---", full_name: "example-user/---", topics: [] }),
      repo({ name: "good2", topics: ["utility"] }),
    ];
    const { prisma, svc } = await loadFresh(repos);

    const result = await svc.syncFromGithub();

    expect(result.scanned).toBe(3);
    expect(result.created).toBe(2); // good1 + good2
    expect(result.skipped).toBe(1); // "---" normalized to empty slug
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/empty slug/i);
    expect(result.ok).toBe(true); // at least one succeeded

    const rows = await prisma.project.findMany({ orderBy: { slug: "asc" } });
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain("good1");
    expect(slugs).toContain("good2");

    const last = await svc.getLastSyncAt();
    expect(last).not.toBeNull();
  }, 30_000);
});
