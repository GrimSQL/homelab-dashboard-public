// Metrics page — 4 multi-line time-series charts.
// Ported from design_handoff/src/Pages.jsx (MetricsPage + MultiLine).
import type { HomelabData } from "@/lib/data/types";
import { Panel, SectionHeader } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

const SERIES_PALETTE = [
  "oklch(0.78 0.13 45)",   // amber
  "oklch(0.75 0.14 155)",  // green
  "oklch(0.72 0.12 235)",  // blue
  "oklch(0.70 0.18 0)",    // red
  "oklch(0.75 0.13 300)",  // purple
  "oklch(0.80 0.13 95)",   // yellow
];

type Seed = [string, number, number, number];

type ChartSpec = {
  title: string;
  unit: string;
  seeds: Seed[];
};

export function MetricsPage({ data: _data }: { data: HomelabData }) {
  void _data;
  const charts: ChartSpec[] = [
    { title: "CPU · all hosts",       unit: "%",  seeds: [["proxmox",11,20.9,6],["udm",12,24.8,7],["switch-16",13,16,4],["app-vm",14,17,5]] },
    { title: "Temp · disks & cabinet", unit: "°C", seeds: [["rack-cabinet",31,28.9,1.2],["nvme",32,41,1.8],["exos#1",33,30,0.6],["exos#2",34,32,0.6]] },
    { title: "Power · Power meter",        unit: "W",  seeds: [["whole-house",41,4361,320],["garage-cluster",42,184,18]] },
    { title: "RAM · VMs & LXC",       unit: "GB", seeds: [["docker-lxc",21,18,1.2],["hass-vm",22,6,0.4],["app-vm",23,14,0.6],["pbs",24,6,0.4]] },
  ];
  return (
    <section className="page anchor" id="metrics">
      <SectionHeader num="04" title="Metrics" sub="Prometheus pulls every 15 s. Loki handles logs. Grafana behind Authentik." />
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 18}}>
        {charts.map((c,i) => (
          <Panel key={i} title={c.title} meta={`last 60 min · ${c.unit}`}>
            <div className="chart-wrap">
              <MultiLine series={c.seeds.map(([n,s,b,a],k) => ({ name:n, values: seededWalk(s,60,b,a), color: SERIES_PALETTE[k%SERIES_PALETTE.length]! }))} unit={c.unit} />
            </div>
            <div className="chart-legend">
              {c.seeds.map(([n],j) => (
                <span key={j} className="item">
                  <span className="swatch" style={{background: SERIES_PALETTE[j%SERIES_PALETTE.length]}}/>{n}
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

type Series = { name: string; values: number[]; color: string };

function MultiLine({ series, unit }: { series: Series[]; unit: string }) {
  const w = 600, h = 180, padL = 38, padR = 10, padT = 8, padB = 20;
  const all = series.flatMap(s => s.values);
  const min = Math.min(...all), max = Math.max(...all);
  const range = max - min || 1;
  // nice y ticks: min, mid, max
  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000) return (v/1000).toFixed(1) + "k";
    if (Math.abs(v) >= 100) return v.toFixed(0);
    return v.toFixed(1);
  };
  const yTicks = [max, min + range*0.5, min];
  const nPts = series[0]?.values.length || 0;
  const xTicks = [0, Math.floor(nPts*0.25), Math.floor(nPts*0.5), Math.floor(nPts*0.75), nPts-1];
  const xLabel = (i: number) => `−${nPts-1-i}m`;
  const step = nPts > 1 ? (w - padL - padR) / (nPts - 1) : 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
      {/* grid + y-axis labels */}
      {yTicks.map((v, i) => {
        const y = padT + (i/(yTicks.length-1))*(h-padT-padB);
        return (
          <g key={i}>
            <line x1={padL} x2={w-padR} y1={y} y2={y} stroke="var(--rule)" strokeDasharray="2 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={padL-6} y={y+3} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-mute)" textAnchor="end">{fmt(v)}</text>
          </g>
        );
      })}
      {/* x-axis labels */}
      {xTicks.map((i, k) => {
        const x = padL + (i/(nPts-1))*(w-padL-padR);
        return (
          <text key={k} x={x} y={h-6} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-mute)" textAnchor="middle">{xLabel(i)}</text>
        );
      })}
      {series.map((s, j) => {
        const d = s.values.map((v,i) => {
          const x = padL + i*step;
          const y = padT + (h-padT-padB) - ((v-min)/range)*(h-padT-padB);
          return (i?"L":"M") + x.toFixed(1) + " " + y.toFixed(1);
        }).join(" ");
        return <path key={j} d={d} stroke={s.color} strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" />;
      })}
      {/* Invisible hover dots per sample for native <title> tooltips */}
      {series.map((s, j) => (
        <g key={`h-${j}`}>
          {s.values.map((v, i) => {
            const x = padL + i*step;
            const y = padT + (h-padT-padB) - ((v-min)/range)*(h-padT-padB);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={4}
                fill={s.color}
                fillOpacity={0}
                stroke={s.color}
                strokeOpacity={0}
                style={{ pointerEvents: "auto", cursor: "crosshair" }}
              >
                <title>{`${s.name} · ${xLabel(i)} · ${v.toFixed(1)}${unit}`}</title>
              </circle>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
