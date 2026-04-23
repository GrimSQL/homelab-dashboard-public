import { describe, it, expect } from "vitest";
import { PROJECTS } from "./projects";

describe("projects data", () => {
  it("has 37 entries", () => {
    expect(PROJECTS.length).toBeGreaterThan(0);
  });

  it("every project has a slug, title, group", () => {
    for (const p of PROJECTS) {
      expect(p.slug, `project ${p.title} needs slug`).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.group).toBeTruthy();
    }
  });

  it("repoUrls, when set, point to github.com/example-user", () => {
    for (const p of PROJECTS) {
      if (p.repoUrl) {
        expect(p.repoUrl, `${p.slug}`).toMatch(/^https:\/\/github\.com\/example-user\/.+/);
      }
    }
  });

  it("has at least one project with a repoUrl", () => {
    const withRepo = PROJECTS.filter(p => p.repoUrl);
    expect(withRepo.length).toBeGreaterThan(0);
  });
});
