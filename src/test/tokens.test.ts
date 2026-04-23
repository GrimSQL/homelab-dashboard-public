import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

describe("design tokens", () => {
  const required = [
    "--bg", "--bg-1", "--bg-2", "--paper", "--rule", "--rule-2",
    "--ink", "--ink-dim", "--ink-mute",
    "--accent", "--accent-2", "--ok", "--warn", "--err", "--info",
    "--radius", "--radius-lg", "--accent-hue",
  ];
  it.each(required)("declares %s", (name) => {
    expect(css).toContain(name + ":");
  });

  it("defines light theme overrides", () => {
    expect(css).toMatch(/\.theme-light\s*\{/);
  });

  it("defines dark theme overrides or :root baseline", () => {
    expect(css).toMatch(/(\.theme-dark|:root)\s*\{/);
  });
});
