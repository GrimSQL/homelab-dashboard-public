import { describe, it, expect, beforeEach } from "vitest";
import { clearCache, readCache, writeCache, runOnce } from "./cache";

describe("readCache / writeCache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("returns status 'never' for a key that was never written", () => {
    const r = readCache<number>("missing");
    expect(r.value).toBeNull();
    expect(r.status).toBe("never");
    expect(r.ageMs).toBe(Infinity);
    expect(r.lastError).toBeNull();
  });

  it("round-trips a value with status 'ok'", () => {
    writeCache("k1", 42, "ok");
    const r = readCache<number>("k1");
    expect(r.value).toBe(42);
    expect(r.status).toBe("ok");
    expect(r.lastError).toBeNull();
  });

  it("round-trips a failure status with a lastError message", () => {
    writeCache("k2", null, "fail", "upstream 503");
    const r = readCache<unknown>("k2");
    expect(r.value).toBeNull();
    expect(r.status).toBe("fail");
    expect(r.lastError).toBe("upstream 503");
  });

  it("computes ageMs correctly from writeCache time", () => {
    const originalNow = Date.now;
    let t = 1_700_000_000_000;
    Date.now = () => t;
    try {
      writeCache("k3", "hello", "ok");
      expect(readCache<string>("k3").ageMs).toBe(0);
      t += 750;
      expect(readCache<string>("k3").ageMs).toBe(750);
      t += 60_000;
      expect(readCache<string>("k3").ageMs).toBe(60_750);
    } finally {
      Date.now = originalNow;
    }
  });

  it("clearCache wipes all entries", () => {
    writeCache("k4", 1, "ok");
    writeCache("k5", 2, "ok");
    clearCache();
    expect(readCache("k4").status).toBe("never");
    expect(readCache("k5").status).toBe("never");
  });

  it("overwriting a key replaces status + value + updatedAt", () => {
    const originalNow = Date.now;
    let t = 2_000_000_000_000;
    Date.now = () => t;
    try {
      writeCache("k6", "first", "ok");
      t += 500;
      writeCache("k6", null, "fail", "boom");
      const r = readCache<string>("k6");
      expect(r.value).toBeNull();
      expect(r.status).toBe("fail");
      expect(r.lastError).toBe("boom");
      expect(r.ageMs).toBe(0);
    } finally {
      Date.now = originalNow;
    }
  });
});

describe("runOnce", () => {
  beforeEach(() => {
    clearCache();
  });

  it("writes value with status 'ok' on success", async () => {
    const v = await runOnce("r1", async () => 99);
    expect(v).toBe(99);
    const r = readCache<number>("r1");
    expect(r.value).toBe(99);
    expect(r.status).toBe("ok");
  });

  it("preserves previous value but flips status to 'fail' on throw", async () => {
    writeCache("r2", 7, "ok");
    await expect(
      runOnce("r2", async () => {
        throw new Error("network down");
      }),
    ).rejects.toThrow("network down");
    const r = readCache<number>("r2");
    expect(r.value).toBe(7);
    expect(r.status).toBe("fail");
    expect(r.lastError).toBe("network down");
  });
});
