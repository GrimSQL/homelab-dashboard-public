import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useTweaks, ACCENT_HUES, TWEAK_DEFAULTS } from "./tweaks";

describe("tweaks store", () => {
  beforeEach(() => {
    localStorage.clear();
    useTweaks.setState(TWEAK_DEFAULTS, true);
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("starts from defaults", () => {
    expect(useTweaks.getState()).toMatchObject(TWEAK_DEFAULTS);
  });

  it("applies accent hue to --accent-hue on set", () => {
    act(() => useTweaks.getState().set({ accent: "cyan" }));
    expect(document.documentElement.style.getPropertyValue("--accent-hue"))
      .toBe(String(ACCENT_HUES.cyan));
  });

  it("applies theme class on html", () => {
    act(() => useTweaks.getState().set({ theme: "light" }));
    expect(document.documentElement.classList.contains("theme-light")).toBe(true);
    act(() => useTweaks.getState().set({ theme: "dark" }));
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    expect(document.documentElement.classList.contains("theme-light")).toBe(false);
  });

  it("persists to localStorage under ui-tweaks", () => {
    act(() => useTweaks.getState().set({ accent: "lime" }));
    const stored = JSON.parse(localStorage.getItem("ui-tweaks") || "null");
    expect(stored.accent).toBe("lime");
  });

  it("sets font-size for density", () => {
    act(() => useTweaks.getState().set({ density: "compact" }));
    expect(document.documentElement.style.fontSize).toBe("13px");
    act(() => useTweaks.getState().set({ density: "cozy" }));
    expect(document.documentElement.style.fontSize).toBe("14px");
  });

  it("hydrate merges stored state with defaults", () => {
    localStorage.setItem("ui-tweaks", JSON.stringify({ accent: "magenta" }));
    useTweaks.getState().hydrate();
    expect(useTweaks.getState().accent).toBe("magenta");
    expect(useTweaks.getState().theme).toBe(TWEAK_DEFAULTS.theme);
  });
});
