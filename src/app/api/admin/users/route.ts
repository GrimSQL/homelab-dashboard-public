import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin";
import { checkPasswordPolicy, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(100).optional(),
  password: z.string(),
  role: z.enum(["user", "admin"]).default("user"),
});

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const policy = checkPasswordPolicy(parsed.data.password);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name || null,
      role: parsed.data.role,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
