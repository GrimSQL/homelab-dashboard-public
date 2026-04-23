import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin";
import { checkPasswordPolicy, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  password: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
  name: z.string().trim().max(100).nullable().optional(),
});

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  if (id === guard.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { passwordHash?: string; role?: string; name?: string | null } = {};

  if (parsed.data.password !== undefined) {
    const policy = checkPasswordPolicy(parsed.data.password);
    if (!policy.ok) return NextResponse.json({ error: policy.reason }, { status: 400 });
    data.passwordHash = await hashPassword(parsed.data.password);
    // NOTE: we use JWT sessions, so we can't revoke the user's existing
    // session on password change. Their old JWT is valid until it expires
    // (7d) or AUTH_SECRET is rotated. Acceptable for a homelab app.
  }

  if (parsed.data.role !== undefined) {
    // Prevent demoting yourself from admin — avoids locking yourself out.
    if (id === guard.userId && parsed.data.role !== "admin") {
      return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
    }
    data.role = parsed.data.role;
  }

  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user });
}
