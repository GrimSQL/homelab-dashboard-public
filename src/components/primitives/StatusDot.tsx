export type Status = "ok" | "warn" | "err" | "deg" | "info";

const LABELS: Record<Status, string> = {
  ok: "OK",
  warn: "WARN",
  err: "DOWN",
  deg: "DEGRADED",
  info: "INFO",
};

export function StatusDot({ s, label }: { s: Status; label?: string }) {
  const cls = s === "ok" ? "ok" : s === "warn" || s === "deg" ? "warn" : s === "err" ? "err" : "info";
  const txt = label ?? LABELS[s];
  return (
    <span className={`status ${cls}`}>
      <span className="dot" />
      {txt}
    </span>
  );
}
