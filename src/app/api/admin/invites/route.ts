import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin";
import { generateInviteCode } from "@/lib/invites";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  role: z.enum(["user", "admin"]).default("user"),
  note: z.string().trim().max(200).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
});

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const invites = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { email: true } },
      usedBy: { select: { email: true } },
    },
  });
  return NextResponse.json({ invites });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000);

  const invite = await prisma.inviteCode.create({
    data: {
      code,
      role: parsed.data.role,
      note: parsed.data.note,
      expiresAt,
      createdById: guard.userId,
    },
    include: {
      createdBy: { select: { email: true } },
      usedBy: { select: { email: true } },
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
