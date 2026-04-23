import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { validateInviteCode } from "@/lib/invites";
import { hashPassword, checkPasswordPolicy } from "@/lib/password";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().length(32),
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(12),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const validity = await validateInviteCode(parsed.data.code);
  if (!validity.ok) {
    return NextResponse.json({ error: `Invite ${validity.reason}` }, { status: 400 });
  }

  const policy = checkPasswordPolicy(parsed.data.password);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Atomic: create the user + mark the invite used in one transaction.
  // If a second request for the same code slips in before this transaction
  // commits, the {usedAt, usedById} write loses a race only when the other
  // winner already flipped usedAt — which we verify via an updateMany with
  // `usedAt: null` as the guard. If zero rows match, we roll back and tell
  // the client the invite was just consumed.
  try {
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
          role: validity.invite.role,
        },
      });
      const claim = await tx.inviteCode.updateMany({
        where: { id: validity.invite.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date(), usedById: u.id },
      });
      if (claim.count !== 1) {
        // Another request won the race. Roll back by throwing.
        throw new Error("invite-race-lost");
      }
      return u;
    });

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "invite-race-lost") {
      return NextResponse.json({ error: "Invite already-used" }, { status: 400 });
    }
    throw err;
  }
}
