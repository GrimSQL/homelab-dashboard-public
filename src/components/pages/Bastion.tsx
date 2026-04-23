// Bastion page — Oracle Cloud jump host with spec table, containers, scripts.
// Ported from design_handoff/src/Security.jsx (BastionPage).
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

export function BastionPage({ data }: { data: HomelabData }) {
  const b = data.bastion;
  const [l1, l5, l15] = b.load;

  return (
    <section className="page anchor" id="bastion">
      <SectionHeader num="13" title={"Bastion · " + b.host} sub={`${b.provider}. Public ${b.pubIp} · Tailscale ${b.tsIp} · independent of home WAN.`} />

      <div className="kpi-grid">
        <KPI label="Uptime" value={b.uptime.split(" ")[0] ?? b.uptime} unit="d" trend={<span>{b.uptime}</span>} />
        <KPI label="Load 1m" value={l1.toFixed(2)} trend={<span>5m {l5.toFixed(2)} · 15m {l15.toFixed(2)}</span>} spark={seededWalk(33, 40, l1*100, 18)} color="oklch(0.78 0.12 155)" />
        <KPI label="Location" value="IE" unit="· FRA" trend={<span>Oracle Cloud EU-West</span>} />
        <KPI label="Purpose" value={b.purpose.length} trend={<span>observer · exit · jump</span>} />
      </div>

      <div className="two-col">
        <Panel title="System" meta={b.os}>
          <div className="spec-table">
            <div className="row"><span className="k">host</span><span className="v">{b.host}</span></div>
            <div className="row"><span className="k">provider</span><span className="v">{b.provider}</span></div>
            <div className="row"><span className="k">os</span><span className="v">{b.os}</span></div>
            <div className="row"><span className="k">public ip</span><span className="v">{b.pubIp}</span></div>
            <div className="row"><span className="k">tailscale</span><span className="v">{b.tsIp}</span></div>
            <div className="row"><span className="k">uptime</span><span className="v">{b.uptime}</span></div>
            <div className="row"><span className="k">load</span><span className="v">{l1.toFixed(2)} · {l5.toFixed(2)} · {l15.toFixed(2)}</span></div>
          </div>
        </Panel>

        <Panel title="Purpose" meta="why it exists">
          <ol className="purpose-list">
            {b.purpose.map((p,i) => (
              <li key={i}>
                <span className="caps">0{i+1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          <div className="note" style={{marginTop: 14}}>
            If home internet dies, bastion&apos;s Uptime Kuma keeps watching — and you can still SSH into any Tailscale exit node through it.
          </div>
        </Panel>
      </div>

      <Panel title="Containers on bastion" meta="docker-compose">
        <table className="table">
          <thead><tr><th>Container</th><th>Image</th><th>Status</th></tr></thead>
          <tbody>
            {b.containers.map(c => (
              <tr key={c.name}>
                <td className="mono" style={{color:"var(--ink)"}}>{c.name}</td>
                <td className="mono" style={{color:"var(--ink-dim)"}}>{c.image}</td>
                <td><StatusDot s="ok" label={c.status.toUpperCase()} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Scheduled scripts" meta="cron jobs pulling home → cloud">
        <div style={{display:"grid", gap:10}}>
          {b.backup.map(s => (
            <div key={s} className="script-row">
              <span className="mono" style={{color:"var(--ink)"}}>{s}</span>
              <StatusDot s="ok" label="DAILY" />
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
