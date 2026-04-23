import "server-only";
import { env } from "@/lib/env";

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  description: string | null;
  html_url: string;
  topics: string[];
  language: string | null;
  pushed_at: string;
  updated_at: string;
  created_at: string;
  default_branch: string;
};

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${env.github.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "homelab-dashboard",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/**
 * List all repos owned by the configured GitHub user (env.github.owner),
 * paginated. Uses /user/repos with affiliation=owner since it returns both
 * public and private repos the token has access to.
 */
export async function listOwnerRepos(): Promise<GithubRepo[]> {
  const all: GithubRepo[] = [];
  let page = 1;
  while (true) {
    const chunk = await ghFetch<GithubRepo[]>(
      `/user/repos?affiliation=owner&per_page=100&page=${page}&sort=pushed&direction=desc`,
    );
    if (chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
    if (page > 10) break; // safety cap: 1000 repos
  }
  return all.filter((r) => r.full_name.startsWith(`${env.github.owner}/`));
}

/**
 * Best-effort README fetch. Tries the default branch first, then `main` and
 * `master`. Returns null if none of those contain a non-empty README.md.
 */
export async function fetchReadme(fullName: string, branch: string): Promise<string | null> {
  const candidates = [branch, "main", "master"].filter((b, i, arr) => arr.indexOf(b) === i);
  for (const b of candidates) {
    const res = await fetch(`https://raw.githubusercontent.com/${fullName}/${b}/README.md`, {
      headers: {
        Authorization: `Bearer ${env.github.token}`,
        "User-Agent": "homelab-dashboard",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const text = await res.text();
      if (text.trim().length > 0) return text;
    }
  }
  return null;
}
