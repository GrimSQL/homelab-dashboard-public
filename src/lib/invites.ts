import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";

/**
 * Generate a 32-char lowercase hex invite code (128 bits of entropy).
 * Large enough that brute-force guessing is infeasible even if the attacker
 * can bypass rate limiting.
 */
export function generateInviteCode(): string {
  return randomBytes(16).toString("hex");
}

export type InviteValidity =
  | { ok: true; invite: { id: string; code: string; role: string; expiresAt: Date } }
  | { ok: false; reason: "not-found" | "already-used" | "revoked" | "expired" };

/**
 * Look up an invite code and classify it. Callers should treat any non-ok
 * result as "don't create a user" — the `reason` is safe to surface in UI
 * copy but does not reveal whether the code ever existed beyond a boolean.
 */
export async function validateInviteCode(code: string): Promise<InviteValidity> {
  if (!code || code.length !== 32 || !/^[a-f0-9]{32}$/.test(code)) {
    return { ok: false, reason: "not-found" };
  }
  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite) return { ok: false, reason: "not-found" };
  if (invite.revokedAt) return { ok: false, reason: "revoked" };
  if (invite.usedAt) return { ok: false, reason: "already-used" };
  if (invite.expiresAt < new Date()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    invite: {
      id: invite.id,
      code: invite.code,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
  };
}
