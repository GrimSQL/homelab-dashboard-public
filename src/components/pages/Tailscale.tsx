// Tailscale page — mesh map, DERP relays, OS grouping, full node table.
// Ported from design_handoff/src/Security.jsx (TailscalePage).
import type { HomelabData, TailscaleNode } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

export function TailscalePage({ data }: { data: HomelabData }) {
  const ts = data.tailscale;
  const online = ts.nodes.filter(n => n.online);
  const offline = ts.nodes.filter(n => !n.online);
  const exits = ts.nodes.filter(n => n.exit);

  const groupByOS: Record<string, TailscaleNode[]> = {};
  ts.nodes.forEach(n => { (groupByOS[n.os] = groupByOS[n.os] || []).push(n); });

  return (
    <section className="page anchor" id="tailscale">
      <SectionHeader num="11" title="Tailscale mesh" sub={`Tailnet ${ts.tailnet} · ${ts.nodes.length} devices · DERP via ${ts.derp.primary} (${ts.derp.ms} ms).`} />

      <div className="kpi-grid">
        <KPI label="Online" value={online.length} trend={<StatusDot s="ok" label="CONNECTED" />} />
        <KPI label="Offline" value={offline.length} trend={<span>last seen: {offline[0]?.lastSeen || "—"}</span>} />
        <KPI label="Exit nodes" value={exits.length} trend={<span>{exits.map(e=>e.host.split("-")[0]).join(" · ")}</span>} />
        <KPI label="DERP latency" value={ts.derp.ms} unit="ms" trend={<span>{ts.derp.primary} · {ts.derp.others.length} others</span>} spark={seededWalk(21, 40, ts.derp.ms, 3)} />
      </div>

      <Panel title="Mesh map" meta="100.64.0.0/10">
        <MeshMap nodes={ts.nodes} />
      </Panel>

      <div className="two-col">
        <Panel title="DERP relays" meta="Tailscale-operated coordinators">
          <div className="derp-list">
            <div className="derp-row active"><span>● {ts.derp.primary}</span><span className="mono">{ts.derp.ms} ms</span><span className="caps">primary</span></div>
            {ts.derp.others.map(d => (
              <div className="derp-row" key={d.name}><span>○ {d.name}</span><span className="mono">{d.ms} ms</span><span className="caps">backup</span></div>
            ))}
          </div>
        </Panel>

        <Panel title="By operating system" meta="nodes grouped">
          <div className="os-grid">
            {Object.entries(groupByOS).map(([os, ns]) => (
              <div key={os} className="os-cell">
                <div className="caps">{os}</div>
                <div className="os-v">{ns.length}</div>
                <div className="os-list">{ns.map(n => n.host).join(", ")}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="All nodes" meta={`${ts.nodes.length} devices`}>
        <table className="table">
          <thead>
            <tr>
              <th style={{width:26}}></th>
              <th>Host</th>
              <th style={{width:180}}>Tailscale IP</th>
              <th style={{width:90}}>OS</th>
              <th>Role</th>
              <th style={{width:70}}>Exit</th>
              <th style={{width:110}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ts.nodes.map(n => (
              <tr key={n.ip}>
                <td><span className={"dot-ts " + (n.online ? "on" : "off")} /></td>
                <td className="mono" style={{color:"var(--ink)"}}>{n.host}</td>
                <td className="mono num">{n.ip}{n.pub ? <span style={{color:"var(--ink-mute)"}}> · {n.pub}</span> : null}</td>
                <td><span className="cat-chip">{n.os}</span></td>
                <td className="mono" style={{color:"var(--ink-dim)"}}>{n.role}</td>
                <td className="mono" style={{color: n.exit ? "var(--accent)" : "var(--ink-mute)"}}>{n.exit ? "EXIT" : "—"}</td>
                <td>{n.online ? <StatusDot s="ok" label="ONLINE" /> : <StatusDot s="info" label={n.lastSeen || "OFFLINE"} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}

function MeshMap({ nodes }: { nodes: TailscaleNode[] }) {
  // Arrange nodes in a ring around a central DERP node
  const w = 720, h = 360, cx = w/2, cy = h/2;
  const ring = Math.min(w, h) * 0.38;
  const placed = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI/2;
    return { ...n, x: cx + Math.cos(a)*ring, y: cy + Math.sin(a)*ring };
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="360" style={{display:"block"}}>
      {placed.map((n, i) => (
        <line key={"l"+i} x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke={n.online ? "var(--accent)" : "var(--rule-2)"}
          strokeOpacity={n.online ? 0.35 : 0.5}
          strokeDasharray={n.online ? "0" : "3 4"}
          strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <circle cx={cx} cy={cy} r="34" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x={cx} y={cy-2} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--accent)">DERP</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-mute)">Helsinki</text>
      {placed.map((n, i) => {
        const r = n.exit ? 11 : 8;
        const fill = n.online ? (n.exit ? "var(--accent)" : "var(--bg-2)") : "var(--bg-1)";
        const stroke = n.online ? "var(--accent)" : "var(--ink-mute)";
        const dy = n.y > cy ? 22 : -14;
        return (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke={stroke} strokeWidth="1.5" />
            <text x={n.x} y={n.y + dy} textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
              fill={n.online ? "var(--ink)" : "var(--ink-mute)"}>{n.host.split("-")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}
