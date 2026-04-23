import "server-only";
import { prisma } from "@/lib/db";

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  group: string;
  summary: string;
  tags: string[]; // parsed from JSON
  date: string;
  url: string | null;
  repoUrl: string | null;
  status: string | null;
  markdown: string | null;
  order: number;
  source: string; // "manual" | "github"
  lastSyncedAt: string | null; // ISO string
};

function toRow(dbRow: unknown): ProjectRow {
  const r = dbRow as Record<string, unknown>;
  let tags: string[] = [];
  try {
    const raw = (r.tags as string) ?? "[]";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === "string");
  } catch {
    tags = [];
  }
  const rawSynced = r.lastSyncedAt as Date | string | null | undefined;
  let lastSyncedAt: string | null = null;
  if (rawSynced) {
    lastSyncedAt = rawSynced instanceof Date ? rawSynced.toISOString() : String(rawSynced);
  }
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    group: r.group as string,
    summary: (r.summary as string) ?? "",
    tags,
    date: (r.date as string) ?? "",
    url: (r.url as string | null) ?? null,
    repoUrl: (r.repoUrl as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    markdown: (r.markdown as string | null) ?? null,
    order: (r.order as number) ?? 0,
    source: (r.source as string) ?? "manual",
    lastSyncedAt,
  };
}

export async function listProjects(): Promise<ProjectRow[]> {
  const rows = await prisma.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRow);
}

export async function getProject(slug: string): Promise<ProjectRow | null> {
  const row = await prisma.project.findUnique({ where: { slug } });
  return row ? toRow(row) : null;
}

export type CreateProjectInput = {
  slug: string;
  title: string;
  group: string;
  summary: string;
  tags: string[];
  date: string;
  url?: string | null;
  repoUrl?: string | null;
  status?: string | null;
  markdown?: string | null;
};

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const maxOrder = (await prisma.project.aggregate({ _max: { order: true } }))._max.order ?? 0;
  const row = await prisma.project.create({
    data: {
      slug: input.slug,
      title: input.title,
      group: input.group,
      summary: input.summary,
      tags: JSON.stringify(input.tags),
      date: input.date,
      url: input.url ?? null,
      repoUrl: input.repoUrl ?? null,
      status: input.status ?? null,
      markdown: input.markdown ?? null,
      order: maxOrder + 1,
    },
  });
  return toRow(row);
}

export type UpdateProjectPatch = Partial<CreateProjectInput> & { order?: number };

export async function updateProject(id: string, patch: UpdateProjectPatch): Promise<ProjectRow> {
  const data: Record<string, unknown> = {};
  if (patch.slug !== undefined) data.slug = patch.slug;
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.group !== undefined) data.group = patch.group;
  if (patch.summary !== undefined) data.summary = patch.summary;
  if (patch.tags !== undefined) data.tags = JSON.stringify(patch.tags);
  if (patch.date !== undefined) data.date = patch.date;
  if (patch.url !== undefined) data.url = patch.url;
  if (patch.repoUrl !== undefined) data.repoUrl = patch.repoUrl;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.markdown !== undefined) data.markdown = patch.markdown;
  if (patch.order !== undefined) data.order = patch.order;
  const row = await prisma.project.update({ where: { id }, data });
  return toRow(row);
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}
