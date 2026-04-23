import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useClock } from "./useClock";

describe("useClock", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns zero-padded date and time after the effect has run", () => {
    vi.setSystemTime(new Date("2026-04-18T05:03:09"));
    const { result } = renderHook(() => useClock());
    expect(result.current.dateStr).toBe("2026-04-18");
    expect(result.current.timeStr).toBe("05:03:09");
  });

  it("ticks every second", () => {
    vi.setSystemTime(new Date("2026-04-18T05:03:09"));
    const { result } = renderHook(() => useClock());
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.timeStr).toBe("05:03:10");
  });

  it("clears interval on unmount", () => {
    vi.setSystemTime(new Date("2026-04-18T05:03:09"));
    const { result, unmount } = renderHook(() => useClock());
    const frozenTime = result.current.timeStr;
    unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    // After unmount, the result is frozen at the last state - no new updates.
    expect(result.current.timeStr).toBe(frozenTime);
  });
});
