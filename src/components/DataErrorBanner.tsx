import type { SourceStatus } from "@/lib/data/homelab";

type Sources = { ha: SourceStatus; pve: SourceStatus; portainer: SourceStatus };

export function DataErrorBanner({ sources }: { sources: Sources }) {
  const entries = Object.entries(sources) as Array<[string, SourceStatus]>;
  const failed = entries.filter(([, s]) => s === "fail").map(([k]) => k.toUpperCase());
  const initializing = entries
    .filter(([, s]) => s === "never")
    .map(([k]) => k.toUpperCase());

  if (failed.length === 0 && initializing.length === 0) return null;

  // Failed takes precedence: if anything actually failed, show the
  // "offline" banner. "Initializing" is only shown when all non-ok
  // entries are in the never-seen-yet state (cold process boot).
  if (failed.length > 0) {
    return (
      <div className="data-error-banner" role="status">
        <span className="status err">
          <span className="dot" />
          SOURCE{failed.length > 1 ? "S" : ""} OFFLINE
        </span>
        <span>{failed.join(", ")} — showing fallback/cached data</span>
      </div>
    );
  }

  return (
    <div className="data-error-banner" role="status">
      <span className="status warn">
        <span className="dot" />
        INITIALIZING
      </span>
      <span>{initializing.join(", ")} — warming up cache…</span>
    </div>
  );
}
