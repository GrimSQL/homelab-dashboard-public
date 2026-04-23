import "server-only";

/**
 * Background-refresh cache.
 *
 * User requests NEVER block on network — they read the last known value
 * (or nothing, on a cold process). A separate background refresher
 * (see bootstrap-data-refresh.ts) writes to this cache on a timer.
 *
 * Pattern: stale-while-revalidate. Reads are O(1) Map lookups.
 */

type Status = "ok" | "fail" | "skipped";

type Entry<T> = {
  value: T;
  updatedAt: number;
  status: Status;
  lastError: string | null;
};

const cache = new Map<string, Entry<unknown>>();

export type ReadStatus = "ok" | "fail" | "skipped" | "never";

export type ReadResult<T> = {
  value: T | null;
  status: ReadStatus;
  ageMs: number;
  lastError: string | null;
};

export function readCache<T>(key: string): ReadResult<T> {
  const e = cache.get(key) as Entry<T> | undefined;
  if (!e) return { value: null, status: "never", ageMs: Infinity, lastError: null };
  return {
    value: e.value,
    status: e.status,
    ageMs: Date.now() - e.updatedAt,
    lastError: e.lastError,
  };
}

export function writeCache<T>(
  key: string,
  value: T,
  status: Status,
  lastError: string | null = null,
): void {
  cache.set(key, { value, updatedAt: Date.now(), status, lastError });
}

export function clearCache(): void {
  cache.clear();
}

/** For tests or manual forced refreshes. */
export async function runOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  try {
    const value = await fn();
    writeCache(key, value, "ok");
    return value;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Preserve the previous value, flip status to fail.
    const prev = readCache<T>(key).value as T;
    writeCache(key, prev, "fail", msg);
    throw err;
  }
}
