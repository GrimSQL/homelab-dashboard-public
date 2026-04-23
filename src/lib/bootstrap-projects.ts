import "server-only";
import { prisma } from "./db";
import { PROJECTS, PROJECTS_MD } from "./data/projects";

let bootstrapped = false;

/**
 * Idempotent first-boot project seeding.
 *
 * Populates the Project table from the static PROJECTS + PROJECTS_MD source
 * of truth the first time the table is empty. On subsequent calls this is
 * a no-op — after seed, the admin UI is the source of truth.
 *
 * Note: PROJECTS_MD keys are project slugs (not `file` names). Each project
 * maps to its markdown by slug.
 */
export async function bootstrapProjects(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  const existing = await prisma.project.count();
  if (existing > 0) {
    return;
  }

  console.log(`[bootstrap] seeding ${PROJECTS.length} projects from static data...`);
  const rows = PROJECTS.map((p, index) => ({
    slug: p.slug,
    title: p.title,
    group: p.group,
    summary: typeof p.summary === "string" ? (p.summary as string) : "",
    tags: JSON.stringify(Array.isArray(p.tags) ? p.tags : []),
    date: p.date ?? "",
    url: (p.url as string | null | undefined) ?? null,
    repoUrl: p.repoUrl ?? null,
    status: typeof p.status === "string" ? (p.status as string) : null,
    markdown: PROJECTS_MD[p.slug] ?? null,
    order: index,
  }));
  await prisma.project.createMany({ data: rows });
  console.log(`[bootstrap] seeded ${rows.length} projects`);
}

/**
 * Test-only reset of the one-time latch.
 */
export function __resetBootstrappedProjectsForTests(): void {
  bootstrapped = false;
}
