import "server-only";
import { prisma } from "@/lib/db";
import { isGithubConfigured } from "@/lib/env";
import { listOwnerRepos, fetchReadme, type GithubRepo } from "@/lib/sources/github";

export type SyncResult = {
  ok: boolean;
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  at: Date;
};

function repoUrlFor(fullName: string): string {
  return `https://github.com/${fullName}`;
}

export function slugFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
}

export function groupFromRepo(repo: Pick<GithubRepo, "topics" | "language" | "fork" | "archived">): string {
  if (repo.fork) return "Forks";
  if (repo.archived) return "Archived";
  const t = (repo.topics ?? []).map((x) => x.toLowerCase());
  if (t.includes("homelab") || t.includes("homelab-notes")) return "Homelab notes";
  if (t.includes("game-bot") || t.includes("game") || t.includes("example-scripts")) return "example-scripts (Game)";
  if (t.includes("bot")) return "Bots";
  if (t.includes("product") || t.includes("saas")) return "Products";
  if (t.includes("utility") || t.includes("utilities")) return "Utilities";
  return "Unsorted";
}

function statusFor(repo: Pick<GithubRepo, "archived" | "private">): string {
  if (repo.archived) return "archived";
  if (repo.private) return "private";
  return "live";
}

function tagsFor(repo: Pick<GithubRepo, "topics" | "language">): string[] {
  if (repo.topics && repo.topics.length > 0) return repo.topics;
  if (repo.language) return [repo.language.toLowerCase()];
  return [];
}

/**
 * Sync example-user GitHub repos into the Project table.
 *
 * Behavior:
 *   - Repos not in DB → created with source="github" and full metadata
 *     (including a one-time README fetch for markdown).
 *   - Repos in DB with source="github" → full refresh of summary/tags/status.
 *   - Repos in DB with source="manual" → only empty fields get filled; admin
 *     edits are never clobbered.
 *   - DB-only projects (not on GitHub) are left alone: they may be virtual,
 *     doc-only, or archived elsewhere.
 *
 * Records `github.lastSyncAt` in AppSetting regardless of per-repo outcome.
 */
export async function syncFromGithub(): Promise<SyncResult> {
  const result: SyncResult = {
    ok: false,
    scanned: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    at: new Date(),
  };

  if (!isGithubConfigured()) {
    result.errors.push("GITHUB_TOKEN not configured");
    return result;
  }

  let repos: GithubRepo[];
  try {
    repos = await listOwnerRepos();
  } catch (err) {
    result.errors.push(`listOwnerRepos failed: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.scanned = repos.length;

  // Match existing rows by repoUrl first (primary key for a github-sourced
  // project), then fall back to the slug we would derive from the repo name
  // so that admin-seeded rows without repoUrl still get picked up instead
  // of causing slug-collision "create" failures.
  const candidateRepoUrls = repos.map((r) => repoUrlFor(r.full_name));
  const candidateSlugs = repos.map((r) => slugFrom(r.name)).filter((s) => s.length > 0);
  const existingRows = await prisma.project.findMany({
    where: {
      OR: [
        { repoUrl: { in: candidateRepoUrls } },
        { slug: { in: candidateSlugs } },
      ],
    },
  });
  const byRepoUrl = new Map<string, (typeof existingRows)[number]>();
  const bySlug = new Map<string, (typeof existingRows)[number]>();
  for (const row of existingRows) {
    if (row.repoUrl) byRepoUrl.set(row.repoUrl, row);
    bySlug.set(row.slug, row);
  }

  // Also load slug index so we can detect collisions when creating new rows.
  const allSlugs = new Set<string>(
    (await prisma.project.findMany({ select: { slug: true } })).map((r) => r.slug),
  );

  for (const repo of repos) {
    try {
      const rurl = repoUrlFor(repo.full_name);
      const status = statusFor(repo);
      const tags = tagsFor(repo);
      const summary = repo.description ?? "";
      const date = (repo.created_at ?? "").slice(0, 10);

      const derivedSlug = slugFrom(repo.name);
      const existing = byRepoUrl.get(rurl) ?? (derivedSlug ? bySlug.get(derivedSlug) : undefined);
      if (existing) {
        const patch: Record<string, unknown> = { lastSyncedAt: new Date() };
        if (existing.source === "github") {
          patch.summary = summary;
          patch.tags = JSON.stringify(tags);
          patch.status = status;
          patch.title = existing.title || repo.name;
        } else {
          // manual: only fill in blanks, never overwrite admin edits.
          if (!existing.repoUrl) patch.repoUrl = rurl;
          if (!existing.status) patch.status = status;
          if (!existing.tags || existing.tags === "[]") patch.tags = JSON.stringify(tags);
          if (!existing.summary) patch.summary = summary;
        }
        await prisma.project.update({ where: { id: existing.id }, data: patch });
        result.updated += 1;
        continue;
      }

      // New row. Make sure the derived slug is usable and unique.
      const slug = derivedSlug;
      if (!slug) {
        result.errors.push(`${repo.full_name}: empty slug after normalization`);
        result.skipped += 1;
        continue;
      }
      if (allSlugs.has(slug)) {
        result.errors.push(`${repo.full_name}: slug '${slug}' already exists, skipping`);
        result.skipped += 1;
        continue;
      }

      const maxOrder = (await prisma.project.aggregate({ _max: { order: true } }))._max.order ?? 0;
      let readme: string | null = null;
      try {
        readme = await fetchReadme(repo.full_name, repo.default_branch);
      } catch {
        // best effort; a missing README is fine.
      }

      await prisma.project.create({
        data: {
          slug,
          title: repo.name,
          group: groupFromRepo(repo),
          summary,
          tags: JSON.stringify(tags),
          date,
          url: null,
          repoUrl: rurl,
          status,
          markdown: readme,
          order: maxOrder + 1,
          source: "github",
          lastSyncedAt: new Date(),
        },
      });
      allSlugs.add(slug);
      result.created += 1;
    } catch (err) {
      result.errors.push(`${repo.full_name}: ${err instanceof Error ? err.message : String(err)}`);
      result.skipped += 1;
    }
  }

  await prisma.appSetting.upsert({
    where: { key: "github.lastSyncAt" },
    update: { value: result.at.toISOString() },
    create: { key: "github.lastSyncAt", value: result.at.toISOString() },
  });

  // Consider the run "ok" if we scanned 0 (no repos) or at least one repo succeeded.
  result.ok = result.scanned === 0 || result.errors.length < result.scanned;
  console.log(
    `[github-sync] scanned=${result.scanned} created=${result.created} updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length}`,
  );
  return result;
}

export async function getLastSyncAt(): Promise<Date | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: "github.lastSyncAt" } });
  return row ? new Date(row.value) : null;
}
