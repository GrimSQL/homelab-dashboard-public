// Demo projects list. Replace with your own seeds, or wire up
// /admin/projects + the GitHub auto-sync to populate dynamically.
import type { Project } from "./types";

export const PROJECTS: Project[] = [
  {
    slug: "demo-app-1",
    group: "Products",
    title: "Demo App 1",
    tags: ["typescript", "react"],
    date: "2026-01-01",
    url: "app1",
    repoUrl: "https://github.com/example-user/demo-app-1",
    summary: "Example application slot. Edit src/lib/data/projects.ts or use /admin/projects to manage entries.",
    status: "live",
  },
  {
    slug: "demo-app-2",
    group: "Tools",
    title: "Demo App 2",
    tags: ["python", "cli"],
    date: "2026-02-01",
    url: null,
    repoUrl: "https://github.com/example-user/demo-app-2",
    summary: "Another placeholder entry. The /projects page reads from this list.",
    status: "live",
  },
];

// READMEs keyed by slug. The original repo cached project READMEs here.
// Public version ships an empty map; populate via the admin UI or sync route.
export const PROJECTS_MD: Record<string, string> = {};
