// Zigbee page — coordinator stats, categories, room heatmap, mesh topology.
// Ported from design_handoff/src/Devices.jsx (ZigbeePage).
import type { HomelabData, Zigbee } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

export function ZigbeePage({ data }: { data: HomelabData }) {
  const z = data.zigbee;
  const coord = z.coordinator;
  const chipCrit = coord.chipTempC > 80;

  const catTotal = z.categories.reduce((a,b) => a + b.count, 0);
  const roomTotal = z.rooms.reduce((a,b) => a + b.count, 0);

  return (
    <section className="page anchor" id="zigbee">
      <SectionHeader num="16" title="Zigbee2MQTT" sub={`${z.total} devices across ${z.rooms.length} rooms · coordinator ${coord.model} (PoE) · Z2M ${z.z2m.version} via Mosquitto MQTT broker.`} />

      <div className="kpi-grid">
        <KPI label="Devices" value={z.total} trend={<span>{z.categories.length} categories</span>} />
        <KPI label="Coordinator" value={coord.model} trend={<span>{coord.ip}:{coord.port}</span>} />
        <KPI label="Chip temp" value={coord.chipTempC} unit="°C"
             trend={<StatusDot s={chipCrit ? "warn" : "ok"} label={chipCrit ? "HOT" : "OK"} />}
             spark={seededWalk(55, 40, coord.chipTempC, 2)} color={chipCrit ? "oklch(0.74 0.16 25)" : "oklch(0.78 0.12 155)"} />
        <KPI label="TX power" value={z.z2m.txPowerDbm} unit="dBm" trend={<span>Z2M {z.z2m.ramMB} MB RAM</span>} />
      </div>

      {chipCrit && (
        <div className="panel" style={{borderLeft:"3px solid var(--warn)", padding:"12px 14px"}}>
          <div className="caps" style={{color:"var(--warn)"}}>⚠ Thermal warning</div>
          <div style={{fontFamily:"var(--mono)", fontSize:12, color:"var(--ink-dim)", marginTop:4}}>
            SLZB-06 chip at {coord.chipTempC} °C — upper safe limit. Consider airflow improvement or relocating the coordinator away from the server cabinet.
          </div>
        </div>
      )}

      <div className="two-col">
        <Panel title="By category" meta={`${catTotal} devices`}>
          <div style={{display:"grid", gap: 6}}>
            {z.categories.map(c => {
              const pct = (c.count / z.total) * 100;
              return (
                <div key={c.key} className="zc-row">
                  <span className="mono" style={{color:"var(--ink)", width: 150}}>{c.name}</span>
                  <span className="zc-bar"><i style={{width: pct + "%"}}/></span>
                  <span className="num" style={{width: 30, textAlign:"right"}}>{c.count}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="By room" meta={`${roomTotal} placements`}>
          <div className="room-grid">
            {z.rooms.map(r => {
              const intensity = Math.min(1, r.count / 10);
              return (
                <div key={r.name} className="room-cell" style={{
                  background: `color-mix(in oklch, var(--accent-2) ${Math.round(intensity*60 + 10)}%, transparent)`,
                  borderColor: intensity > 0.5 ? "var(--accent)" : "var(--rule-2)",
                }}>
                  <div className="room-count">{r.count}</div>
                  <div className="caps">{r.name}</div>
                </div>
              );
            })}
          </div>
          <div className="note" style={{marginTop: 12}}>
            Kitchen is the densest room (9 devices) — lights, curtains, leak sensors, plant sensor, and a button bundle.
          </div>
        </Panel>
      </div>

      <Panel title="Mesh topology" meta={`${z.total} devices · ${coord.model} center`}>
        <MeshTopo z={z} />
      </Panel>

      <Panel title="Coordinator details" meta="hardware + firmware">
        <div className="spec-table" style={{maxWidth: 640}}>
          <div className="row"><span className="k">model</span><span className="v">{coord.model}</span></div>
          <div className="row"><span className="k">uplink</span><span className="v">{coord.link} · {coord.ip}:{coord.port}</span></div>
          <div className="row"><span className="k">chip temp</span><span className="v">{coord.chipTempC} °C</span></div>
          <div className="row"><span className="k">z2m version</span><span className="v">{z.z2m.version}</span></div>
          <div className="row"><span className="k">z2m ram</span><span className="v">{z.z2m.ramMB} MB</span></div>
          <div className="row"><span className="k">channel</span><span className="v">{z.z2m.channel}</span></div>
          <div className="row"><span className="k">tx power</span><span className="v">{z.z2m.txPowerDbm} dBm</span></div>
          <div className="row"><span className="k">mqtt broker</span><span className="v">Mosquitto · :1883</span></div>
        </div>
      </Panel>
    </section>
  );
}

// Simple radial topology: coordinator at center, rooms as orbits
function MeshTopo({ z }: { z: Zigbee }) {
  const w = 900, h = 420, cx = w/2, cy = h/2;
  const rooms = z.rooms;
  const ringR = 150;
  const roomPositions = rooms.map((r,i) => {
    const a = (i / rooms.length) * Math.PI * 2 - Math.PI/2;
    return { ...r, x: cx + Math.cos(a)*ringR, y: cy + Math.sin(a)*ringR, a };
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="420">
      {/* orbit */}
      <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />

      {/* room → coordinator lines and nested dots */}
      {roomPositions.map((r, i) => {
        const dotCount = r.count;
        const dotR = 18 + dotCount * 2;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={r.x} y2={r.y} stroke="var(--accent)" strokeOpacity="0.2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {/* mini cluster: circle + count of dots as small dots arranged */}
            <circle cx={r.x} cy={r.y} r={dotR} fill="var(--bg-2)" stroke="var(--accent)" strokeOpacity="0.55" />
            {Array.from({length: Math.min(dotCount, 14)}).map((_, k) => {
              const ka = (k / Math.min(dotCount,14)) * Math.PI * 2;
              const kx = r.x + Math.cos(ka) * (dotR - 6);
              const ky = r.y + Math.sin(ka) * (dotR - 6);
              return <circle key={k} cx={kx} cy={ky} r="2" fill="var(--accent)" />;
            })}
            <text x={r.x} y={r.y + dotR + 14} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{r.name}</text>
            <text x={r.x} y={r.y + dotR + 26} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-mute)">{r.count} dev</text>
          </g>
        );
      })}

      {/* coordinator */}
      <circle cx={cx} cy={cy} r="32" fill="var(--accent-2)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x={cx} y={cy-4} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--accent)">SLZB-06</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-mute)">{z.coordinator.chipTempC}°C</text>
    </svg>
  );
}
