import "server-only";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, { timeCost: 3, memoryCost: 65536, parallelism: 4 });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password);
  } catch {
    return false;
  }
}

export type PasswordPolicyError = { ok: false; reason: string };
export type PasswordPolicyOk = { ok: true };
export type PasswordPolicyResult = PasswordPolicyOk | PasswordPolicyError;

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < 12) return { ok: false, reason: "Password must be at least 12 characters." };
  if (!/[a-z]/.test(password)) return { ok: false, reason: "Password must contain a lowercase letter." };
  if (!/[A-Z]/.test(password)) return { ok: false, reason: "Password must contain an uppercase letter." };
  if (!/[0-9]/.test(password)) return { ok: false, reason: "Password must contain a digit." };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, reason: "Password must contain a symbol." };
  return { ok: true };
}
