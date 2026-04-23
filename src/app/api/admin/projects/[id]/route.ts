import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/require-admin";
import { deleteProject, updateProject } from "@/lib/services/projects";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/i)
    .optional(),
  title: z.string().min(1).max(200).optional(),
  group: z.string().min(1).max(100).optional(),
  summary: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  url: z
    .string()
    .regex(/^[a-z0-9-]+$/, "url must be lowercase alphanumeric + dashes")
    .nullable()
    .optional(),
  repoUrl: z.string().url().nullable().optional(),
  status: z.enum(["live", "private", "doc", "archived"]).nullable().optional(),
  markdown: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const project = await updateProject(id, parsed.data);
    return NextResponse.json({ project });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "P2002") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  try {
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}
