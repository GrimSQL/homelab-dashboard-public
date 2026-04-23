// Energy & UPS page — 24h stacked bars + UPS battery gauges.
// Ported from design_handoff/src/Pages.jsx (EnergyPage).
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, SectionHeader } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

export function EnergyPage({ data }: { data: HomelabData }) {
  const hours = Array.from({length: 24}, (_, i) => i);
  const use = hours.map(h => {
    const base = 2.0 + Math.abs(Math.sin(h/3)) * 2.2;
    const peak = h>=17 && h<=21 ? 2.3 : 0;
    const morning = h>=6 && h<=8 ? 1.2 : 0;
    return Math.max(0.6, base + peak + morning + (seededWalk(h, 1, 0, 0.4)[0] ?? 0));
  });
  const useToday = use.reduce((a,b)=>a+b, 0);

  return (
    <section className="page anchor" id="energy">
      <SectionHeader num="07" title="Energy & UPS" sub={`${data.ups.length} APC Back-UPS Back-UPS. House pulling ~${Math.round(useToday)} kWh/day right now · ${data.hero.monthlyCost} this month.`} />

      <div className="kpi-grid">
        <KPI label="LIFETIME"  value={(data.hero.lifetimeKWh/1000).toFixed(2)} unit="MWh" trend={<span>since 2018</span>} />
        <KPI label="EV CHARGED" value={(data.hero.evKWh/1000).toFixed(1)} unit="MWh" trend={<span>Sedan + EV via wallbox</span>} spark={seededWalk(2, 40, 50, 30)} color="oklch(0.78 0.12 155)" />
        <KPI label="WHOLE HOUSE" value={4361} unit="W" trend={<span>peak today 4 673 W</span>} spark={seededWalk(3, 40, 4361, 350)} color="oklch(0.80 0.14 45)" />
        <KPI label="MONTH COST" value={data.hero.monthlyCost} unit="$" trend={<span>avg 148</span>} />
      </div>

      <Panel title="24 h consumption" meta="kW · power meter">
        <div style={{display:"grid", gridTemplateColumns:"repeat(24, 1fr)", gap: 4, height: 180, alignItems:"end"}}>
          {hours.map(h => {
            const u = use[h] ?? 0;
            return (
              <div key={h} style={{height: (u/6*100)+"%", background: "oklch(0.75 0.11 45)", opacity: 0.85, borderRadius: 1}} title={`${h}:00 · ${u.toFixed(1)} kW`}/>
            );
          })}
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(24, 1fr)", gap: 4, marginTop: 6, fontFamily:"var(--mono)", fontSize:10, color:"var(--ink-mute)", textAlign:"center"}}>
          {hours.map(h => <div key={h}>{h%3===0 ? String(h).padStart(2,"0") : ""}</div>)}
        </div>
      </Panel>

      <div>
        <div className="caps" style={{marginBottom: 10}}>UPS units · both online</div>
        <div className="ups-row">
          {data.ups.map(u => (
            <div className="ups-card" key={u.id}>
              <UpsGauge battery={u.battery} />
              <div>
                <div style={{fontFamily:"var(--mono)", fontSize:14, color:"var(--ink)"}}>{u.name}</div>
                <div style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-mute)", marginBottom:8}}>{u.model} · {u.status}</div>
                <div style={{display:"grid", gap: 4, fontFamily:"var(--mono)", fontSize:12}}>
                  <UpsRow k="Load"     v={`${u.load} %`} />
                  <UpsRow k="Battery"  v={`${u.battery} %`} />
                  <UpsRow k="Input V"  v={`${u.volt} V`} />
                  <UpsRow k="Protects" v={u.protects.join(", ")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UpsRow({ k, v }: { k: string; v: string }) {
  return <div style={{display:"flex", justifyContent:"space-between", gap:10, borderBottom:"1px dotted var(--rule)", padding:"3px 0"}}>
    <span style={{color:"var(--ink-mute)"}}>{k}</span><span style={{color:"var(--ink-dim)", textAlign:"right"}}>{v}</span>
  </div>;
}

function UpsGauge({ battery }: { battery: number }) {
  const pct = Math.max(0, Math.min(100, battery));
  const r = 46, cx=60, cy=58;
  const a0 = Math.PI, a1 = Math.PI*2;
  const a = a0 + (a1-a0)*(pct/100);
  const px = cx + r*Math.cos(a), py = cy + r*Math.sin(a);
  const large = pct > 50 ? 1 : 0;
  return (
    <div className="gauge">
      <svg viewBox="0 0 120 68" width="120" height="68">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} stroke="var(--rule-2)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${large} 1 ${px} ${py}`} stroke="var(--ok)" strokeWidth="6" fill="none" strokeLinecap="round"/>
      </svg>
      <div className="val">{battery}<span style={{fontSize:12, color:"var(--ink-mute)"}}> %</span></div>
      <div className="lbl">batteri</div>
    </div>
  );
}
