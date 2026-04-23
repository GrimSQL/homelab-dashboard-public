import { describe, it, expect } from "vitest";
import { ROOMS, SECTION_LABELS, roomsBySection } from "./rooms";

describe("rooms config", () => {
  it("defines exactly 12 rooms", () => {
    expect(ROOMS).toHaveLength(12);
  });

  it("covers 4 sections with labels", () => {
    const sections = Object.keys(SECTION_LABELS);
    expect(sections).toHaveLength(4);
    expect(sections.sort()).toEqual(["entry", "left", "outdoor", "right"]);
  });

  it("each room has a non-empty lightEntityId", () => {
    for (const r of ROOMS) {
      expect(r.lightEntityId, `room ${r.id}`).toMatch(/^light\..+/);
    }
  });

  it("each room has a unique id", () => {
    const ids = ROOMS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("roomsBySection returns all rooms grouped into the right sections", () => {
    const grouped = roomsBySection();
    expect(grouped.entry.map((r) => r.id)).toEqual(["hall"]);
    expect(grouped.right.map((r) => r.id)).toEqual(["corridor", "bedroom", "craft", "family", "kids", "office"]);
    expect(grouped.left.map((r) => r.id)).toEqual(["living", "laundry", "kitchen"]);
    expect(grouped.outdoor.map((r) => r.id)).toEqual(["garage", "outdoor"]);
    const total =
      grouped.entry.length +
      grouped.right.length +
      grouped.left.length +
      grouped.outdoor.length;
    expect(total).toBe(ROOMS.length);
  });

  it("temperature sensors use the expected HA naming patterns", () => {
    const withTemp = ROOMS.filter((r) => r.tempEntityId);
    for (const r of withTemp) {
      expect(r.tempEntityId, `room ${r.id}`).toMatch(/^sensor\..+_temperature$/);
    }
    const hall = ROOMS.find((r) => r.id === "hall");
    expect(hall?.tempEntityId).toBeUndefined();
  });
});
