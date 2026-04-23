// Status page — 90-min uptime timeline per service.
// Ported from design_handoff/src/Pages.jsx (StatusPage).
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";

export function StatusPage({ data }: { data: HomelabData }) {
  const CELLS = 90;
  const withCells = data.services.map(s => {
    const seed = s.name.charCodeAt(0) + s.name.charCodeAt(1);
    const cells: string[] = [];
    for (let i = 0; i < CELLS; i++) {
      const r = (seed * (i+1) * 31 + i*7) % 1000 / 1000;
      let k = "ok";
      if (s.status === "warn" && r > 0.78) k = "warn";
      if (s.status === "deg" && r > 0.62) k = "warn";
      if (s.uptime < 99.8 && r > 0.92) k = "warn";
      cells.push(k);
    }
    return { ...s, cells };
  });

  const summary = {
    total: withCells.length,
    ok: withCells.filter(s => s.status === "ok").length,
    warn: withCells.filter(s => s.status === "warn" || s.status === "deg").length,
    err: withCells.filter(s => s.status === "err").length,
  };

  return (
    <section className="page anchor" id="status">
      <SectionHeader num="05" title="Uptime" sub="Each cell = 1 minute. 90 minutes back. Data from Uptime Kuma." />

      <div className="kpi-grid">
        <KPI label="TOTAL"       value={summary.total} trend={<span>Kuma + internal probes</span>} />
        <KPI label="HEALTHY"     value={summary.ok}    trend={<StatusDot s="ok" />} />
        <KPI label="DEGRADED"    value={summary.warn}  trend={<StatusDot s="warn" />} />
        <KPI label="DOWN"        value={summary.err}   trend={<StatusDot s={summary.err ? "err" : "ok"} label={summary.err ? "ACTIVE" : "NONE"} />} />
      </div>

      <Panel title="Timeline" meta="90 min · now →">
        {withCells.map((s,i) => (
          <div className="uptime-row" key={i}>
            <div>
              <div className="svc"><span style={{color:"var(--ink)"}}>{s.name}</span></div>
              <div style={{fontFamily:"var(--mono)", fontSize:10, color:"var(--ink-mute)"}}>{s.host} · {s.cat}</div>
            </div>
            <div className="uptime-cells">
              {s.cells.map((c, j) => (
                <div key={j} className={"cell " + (c==="ok" ? "" : c)} title={`t−${90-j} min · ${c}`} />
              ))}
            </div>
            <div className="pct">{s.uptime.toFixed(2)}%</div>
          </div>
        ))}
      </Panel>
    </section>
  );
}
