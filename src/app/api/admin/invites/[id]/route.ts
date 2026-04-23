import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const invite = await prisma.inviteCode.findUnique({ where: { id } });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "Already used" }, { status: 400 });
  if (invite.revokedAt) return NextResponse.json({ error: "Already revoked" }, { status: 400 });

  const updated = await prisma.inviteCode.update({
    where: { id },
    data: { revokedAt: new Date() },
    include: {
      createdBy: { select: { email: true } },
      usedBy: { select: { email: true } },
    },
  });

  return NextResponse.json({ invite: updated });
}
