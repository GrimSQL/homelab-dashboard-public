import "server-only";
import { env, isGithubConfigured } from "@/lib/env";
import { syncFromGithub } from "./services/github-sync";

let scheduled = false;

/**
 * Schedule recurring GitHub -> DB project sync.
 *
 * Safe to call on every request: a module-level latch ensures we only ever
 * wire up one setTimeout/setInterval per Node process. No-op when
 * GITHUB_TOKEN is not configured.
 *
 * Timing:
 *   - One sync 10 seconds after first call (fast "new repo shows up after
 *     container restart" feedback without blocking startup)
 *   - Recurring sync every env.github.syncIntervalMs (default 60 min)
 */
export function scheduleGithubSync(): void {
  if (scheduled) return;
  scheduled = true;

  if (!isGithubConfigured()) {
    console.log("[github-sync] GITHUB_TOKEN not set; auto-sync disabled");
    return;
  }

  const interval = Math.max(60_000, env.github.syncIntervalMs);
  console.log(`[github-sync] scheduling every ${Math.round(interval / 60_000)} min`);

  setTimeout(() => {
    syncFromGithub().catch((err) => console.error("[github-sync] initial run failed", err));
  }, 10_000);

  setInterval(() => {
    syncFromGithub().catch((err) => console.error("[github-sync] periodic run failed", err));
  }, interval);
}

/**
 * Test-only reset of the scheduled latch.
 */
export function __resetScheduledForTests(): void {
  scheduled = false;
}
