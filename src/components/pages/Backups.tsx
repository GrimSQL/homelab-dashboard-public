// Backups page — 5-tier chain, retention grid, 30-day heatmap, extra scripts.
// Ported from design_handoff/src/Security.jsx (BackupsPage).
import { Fragment } from "react";
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

export function BackupsPage({ data }: { data: HomelabData }) {
  const b = data.backups;
  const chain = b.chain;
  const pbs = chain.find(c => c.usedTB);
  const pbsPct = pbs && pbs.totalTB ? ((pbs.usedTB ?? 0) / pbs.totalTB) * 100 : 0;

  // Synthesize a 30-day "age of latest backup" heatmap — demonstrates freshness
  const days = 30;
  const heat = Array.from({length: days}, (_,i) => {
    const r = ((i*17 + 3) % 100) / 100;
    return r < 0.88 ? "ok" : r < 0.96 ? "warn" : "err";
  });

  return (
    <section className="page anchor" id="backups">
      <SectionHeader num="10" title="Backups" sub="Five-tier chain: live → local PBS → offsite PBS at parents' house → Synology Hyper Backup → Google Drive config. Retention: 3 / 24 / 7 / 4 / 6 / 2." />

      <div className="kpi-grid">
        <KPI label="PBS used" value={pbs?.usedTB || "—"} unit="TB" trend={<span>{pbs?.totalTB} TB total · {pbsPct.toFixed(0)}%</span>} spark={seededWalk(11, 40, pbsPct, 3)} color="oklch(0.78 0.12 155)" />
        <KPI label="Tiers" value={chain.length} trend={<span>all green</span>} />
        <KPI label="Extra scripts" value={b.extra.length} trend={<span>alva · bastion · certs</span>} />
        <KPI label="Stale sensor" value={b.healthSensor.value.toUpperCase()} trend={<StatusDot s={b.healthSensor.ok ? "ok" : "err"} label={b.healthSensor.ok ? "FRESH" : "STALE"} />} />
      </div>

      <Panel title="Backup chain" meta="production → long-term off-site">
        <div className="chain">
          {chain.map((c, i) => (
            <Fragment key={i}>
              <div className="chain-step">
                <div className="step-num">0{c.step}</div>
                <div className="step-body">
                  <div className="step-name">{c.name}</div>
                  <div className="step-node">{c.node}</div>
                  <div className="step-role">{c.role}</div>
                  <div className="step-meta">
                    <StatusDot s={c.status} label={c.schedule.toUpperCase()} />
                    {c.usedTB && <span className="pct-bar"><i style={{width: pbsPct + "%"}}/></span>}
                    {c.usedTB && <span className="num-tiny">{c.usedTB} / {c.totalTB} TB</span>}
                    {c.url && <a className="svc-link" href={`https://${c.url}.example.com`} target="_blank" rel="noopener noreferrer">{c.url}↗</a>}
                  </div>
                </div>
              </div>
              {i < chain.length - 1 && <div className="chain-arrow">→</div>}
            </Fragment>
          ))}
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="Retention policy" meta="PBS groups">
          <div className="ret-grid">
            {b.retention.map((r,i) => (
              <div key={i} className="ret-cell">
                <div className="caps">{r.k}</div>
                <div className="ret-v">{r.v}</div>
              </div>
            ))}
          </div>
          <div className="note" style={{marginTop: 10}}>Every PBS group keeps the last 3 snapshots + 24 hourly + 7 daily + 4 weekly + 6 monthly + 2 yearly — about 46 restore points per VM at any moment.</div>
        </Panel>

        <Panel title="30-day freshness heatmap" meta="latest backup age per day">
          <div className="heatmap">
            {heat.map((k,i) => (
              <div key={i} className={"hm-cell " + k} title={`day −${days-i}: ${k}`} />
            ))}
          </div>
          <div className="heatmap-legend">
            <span><span className="sw ok"/>fresh</span>
            <span><span className="sw warn"/>&lt; 36 h</span>
            <span><span className="sw err"/>stale</span>
          </div>
        </Panel>
      </div>

      <Panel title="Extra backup scripts" meta="file-level & scripted">
        <table className="table">
          <thead><tr><th>Script</th><th>Target</th><th style={{width:80}}>Frequency</th><th style={{width:80}}>Keep</th><th style={{width:80}}>Status</th></tr></thead>
          <tbody>
            {b.extra.map(x => (
              <tr key={x.name}>
                <td className="mono" style={{color:"var(--ink)"}}>{x.name}</td>
                <td className="mono" style={{color:"var(--ink-dim)"}}>{x.where}</td>
                <td className="num">{x.freq}</td>
                <td className="num">{x.keep}</td>
                <td><StatusDot s={x.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}
