import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/require-admin";
import { createProject, listProjects } from "@/lib/services/projects";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/i, "slug must be alphanumeric + dashes"),
  title: z.string().min(1).max(200),
  group: z.string().min(1).max(100),
  summary: z.string().max(2000).default(""),
  tags: z.array(z.string()).default([]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .default(""),
  url: z
    .string()
    .regex(/^[a-z0-9-]+$/, "url must be lowercase alphanumeric + dashes")
    .nullable()
    .optional(),
  repoUrl: z.string().url().nullable().optional(),
  status: z.enum(["live", "private", "doc", "archived"]).nullable().optional(),
  markdown: z.string().nullable().optional(),
});

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const project = await createProject(parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
