import "server-only";
import { env } from "@/lib/env";
import { writeCache } from "@/lib/cache";
import { fetchHassSlice } from "@/lib/sources/ha";
import { fetchPveSlice } from "@/lib/sources/pve";
import { fetchPortainerSlice } from "@/lib/sources/portainer";

let scheduled = false;

// Refresh every CACHE_TTL_SECONDS (default 15s). Clamp to a 5s floor so a
// misconfigured env var can't melt upstream APIs.
// Note: Portainer's per-container stats fetch can take 10s+ due to 53
// containers each getting their own /stats call. That latency is paid
// out-of-band here and does NOT block user requests.
const INTERVAL_MS = Math.max(5_000, Number(env.cacheTtlSeconds ?? 15) * 1000);

async function refreshSource(
  key: string,
  configured: boolean,
  fn: () => Promise<unknown>,
): Promise<void> {
  if (!configured) {
    writeCache(key, null, "skipped");
    return;
  }
  try {
    const value = await fn();
    writeCache(key, value, "ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[data-refresh] ${key} failed: ${msg}`);
    // Preserve any previous value; just flip status + record the error.
    // We pass null here, but getHomelab() merges with MOCK_HOMELAB so a
    // failed slice just means that slice falls back to mock until next
    // successful refresh.
    writeCache(key, null, "fail", msg);
  }
}

async function refreshAll(): Promise<void> {
  await Promise.all([
    refreshSource("ha", !!env.ha.token, fetchHassSlice),
    refreshSource("pve", !!env.pve.tokenSecret, fetchPveSlice),
    refreshSource("portainer", !!env.portainer.apiKey, fetchPortainerSlice),
  ]);
}

/**
 * Schedule recurring HA / PVE / Portainer cache refresh.
 *
 * Safe to call on every request: a module-level latch ensures only the
 * first call wires up the timer. Subsequent calls no-op.
 *
 * Kicks off the first refresh immediately (non-blocking) so cache warms
 * up ASAP after container boot. Until the first refresh completes, user
 * requests fall through to MOCK_HOMELAB with source status "never".
 */
export function scheduleDataRefresh(): void {
  if (scheduled) return;
  scheduled = true;

  console.log(`[data-refresh] scheduling every ${INTERVAL_MS / 1000}s`);

  refreshAll().catch((err) =>
    console.error("[data-refresh] initial run failed", err),
  );

  setInterval(() => {
    refreshAll().catch((err) =>
      console.error("[data-refresh] periodic run failed", err),
    );
  }, INTERVAL_MS);
}

/**
 * Test-only reset of the scheduled latch.
 */
export function __resetScheduledForTests(): void {
  scheduled = false;
}
