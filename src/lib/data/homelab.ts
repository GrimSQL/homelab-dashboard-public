import "server-only";
import { MOCK_HOMELAB } from "./mock";
import { readCache } from "@/lib/cache";
import { env } from "@/lib/env";
import type { HomelabData } from "./types";

export type SourceStatus = "ok" | "fail" | "skipped" | "never";

export type DataWithStatus = HomelabData & {
  sources: { ha: SourceStatus; pve: SourceStatus; portainer: SourceStatus };
};

// If the last successful fetch is older than this, treat the source as
// failed even if its last observed status was "ok". Covers the case
// where the refresher itself hangs indefinitely.
const STALE_AFTER_MS = 60_000;

function statusFor(key: string, configured: boolean): SourceStatus {
  if (!configured) return "skipped";
  const { status, ageMs } = readCache(key);
  if (status === "never") return "never";
  if (status === "fail") return "fail";
  if (status === "skipped") return "skipped";
  if (ageMs > STALE_AFTER_MS) return "fail";
  return "ok";
}

/**
 * Read the merged homelab snapshot from the in-memory cache. Returns in
 * under 5 ms — never awaits any network fetch. The cache is populated by
 * the background refresher (see bootstrap-data-refresh.ts) scheduled
 * from the dashboard layout.
 *
 * Stays `async` to minimize call-site churn; callers still await it.
 */
export async function getHomelab(): Promise<DataWithStatus> {
  const ha = readCache<Partial<HomelabData>>("ha");
  const pve = readCache<Partial<HomelabData>>("pve");
  const portainer = readCache<Partial<HomelabData>>("portainer");

  // Merge in a deterministic order so a later source can overwrite an
  // earlier one. Missing slices fall back to MOCK_HOMELAB (cold boot).
  const merged: HomelabData = {
    ...MOCK_HOMELAB,
    ...(ha.value ?? {}),
    ...(pve.value ?? {}),
    ...(portainer.value ?? {}),
  };

  return {
    ...merged,
    sources: {
      ha: statusFor("ha", !!env.ha.token),
      pve: statusFor("pve", !!env.pve.tokenSecret),
      portainer: statusFor("portainer", !!env.portainer.apiKey),
    },
  };
}
