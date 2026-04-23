import { describe, it, expect } from "vitest";
import { sparkPath, seededWalk } from "./spark";

describe("sparkPath", () => {
  it("returns empty string for empty input", () => {
    expect(sparkPath([], 200, 28)).toBe("");
  });
  it("starts with M command", () => {
    expect(sparkPath([1, 2, 3], 200, 28).startsWith("M")).toBe(true);
  });
  it("has one L command per value after the first", () => {
    const d = sparkPath([1, 2, 3, 4], 200, 28);
    expect((d.match(/L/g) || []).length).toBe(3);
  });
  it("maps min value to bottom and max to top", () => {
    const d = sparkPath([0, 10], 200, 28, 2);
    const match = d.match(/M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/);
    expect(match).not.toBeNull();
    const [, , y0, , y1] = match!;
    expect(Number(y0)).toBeGreaterThan(Number(y1));
  });
});

describe("seededWalk", () => {
  it("is deterministic for the same seed", () => {
    expect(seededWalk(7, 10, 50, 10)).toEqual(seededWalk(7, 10, 50, 10));
  });
  it("stays within base ± amp", () => {
    const out = seededWalk(3, 50, 100, 5);
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(95);
      expect(v).toBeLessThanOrEqual(105);
    }
  });
});
