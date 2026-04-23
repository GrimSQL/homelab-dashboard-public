import { describe, it, expect } from "vitest";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "./password";

describe("checkPasswordPolicy", () => {
  it("rejects passwords shorter than 12 chars", () => {
    const r = checkPasswordPolicy("Ab1!xxxx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/12 characters/);
  });

  it("rejects passwords without a lowercase letter", () => {
    const r = checkPasswordPolicy("ALLUPPERCASE123!");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/lowercase/);
  });

  it("rejects passwords without an uppercase letter", () => {
    const r = checkPasswordPolicy("alllowercase123!");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/uppercase/);
  });

  it("rejects passwords without a digit", () => {
    const r = checkPasswordPolicy("NoDigitsHere!!!");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/digit/);
  });

  it("rejects passwords without a symbol", () => {
    const r = checkPasswordPolicy("NoSymbolHere123");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/symbol/);
  });

  it("accepts a password that meets all rules", () => {
    expect(checkPasswordPolicy("CorrectHorse1!Staple").ok).toBe(true);
    expect(checkPasswordPolicy("aA1!qwerty12345").ok).toBe(true);
  });
});

describe("hashPassword / verifyPassword", () => {
  // Argon2 with the configured cost takes ~100-300 ms on a modern laptop, so
  // bump the per-test timeout a bit.
  it("hashPassword returns a string that is not the plaintext", async () => {
    const hash = await hashPassword("CorrectHorse1!");
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe("CorrectHorse1!");
    expect(hash.length).toBeGreaterThan(20);
  }, 10_000);

  it("verifyPassword(hash, x) returns true for the matching plaintext", async () => {
    const hash = await hashPassword("CorrectHorse1!");
    expect(await verifyPassword(hash, "CorrectHorse1!")).toBe(true);
  }, 10_000);

  it("verifyPassword(hash, y) returns false for a different plaintext", async () => {
    const hash = await hashPassword("CorrectHorse1!");
    expect(await verifyPassword(hash, "WrongPassword1!")).toBe(false);
  }, 10_000);

  it("verifyPassword returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-real-argon2-hash", "anything")).toBe(false);
  });
});
