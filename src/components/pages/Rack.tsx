"use client";
// Rack page — two physical racks (laundry + garage) with clickable U-slots
// and a detail panel driven by local selection state.
// Ported from design_handoff/src/Infra.jsx (RackPage).
import { useState } from "react";
import type { HomelabData, HardwareUnit } from "@/lib/data/types";
import { Panel, SectionHeader, Sparkline, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

type RackSlot = (HardwareUnit & { key: string; empty?: false }) | { empty: true; key: string };

export function RackPage({ data }: { data: HomelabData }) {
  const [sel, setSel] = useState<string>("pve");
  const selected: HardwareUnit | undefined = data.hardware.find(h => h.id === sel) ?? data.hardware[0];
  if (!selected) return null;

  const renderRack = (rackId: string, label: string, maxU: number) => {
    const gear = data.hardware.filter(h => h.rack === rackId).sort((a,b) => a.slot - b.slot);
    const slots: RackSlot[] = [];
    let used = 0;
    for (const hw of gear) { slots.push({ ...hw, key: hw.id }); used += hw.u; }
    while (used < maxU) { slots.push({ empty: true, key: "e"+rackId+used }); used++; }
    return (
      <div className="rack-frame">
        <div className="rack-head">— {label} · {maxU} U —</div>
        <div className="rack-slots">
          {slots.map(s => s.empty ? (
            <div key={s.key} className="rack-u empty" data-u="1"></div>
          ) : (
            <button key={s.key}
              className={"rack-u " + (s.status!=="ok" ? s.status+" " : "") + (sel===s.id ? "sel" : "")}
              data-u={s.u}
              onClick={() => setSel(s.id)}>
              <span className="led" />
              <span className="name">{s.name}</span>
              <span className="vents" />
              <span className="role">{s.role}</span>
            </button>
          ))}
        </div>
        <div className="rack-foot">— {label==="Garage" ? "UPS Garage · 184 W" : "UPS Laundry · 97 W"} —</div>
      </div>
    );
  };

  const tempWalk = seededWalk((selected.slot||1)+7, 60, selected.temp, 1.5);
  const powerWalk = seededWalk((selected.slot||1)+11, 60, selected.power, Math.max(selected.power*0.15,4));

  return (
    <section className="page anchor" id="rack">
      <SectionHeader num="01" title="Rack" sub="Two locations: a small rack in the laundry room (router + switch + UPS) and the compute rack in the garage (Proxmox + NAS + UPS)." />

      <div className="racks">
        {renderRack("laundry-room", "Laundry", 6)}
        {renderRack("garage", "Garage", 8)}
        <div className="rack-detail">
          <div className="hdr">
            <div>
              <div className="caps">{selected.rack} · {selected.u} U</div>
              <h2>{selected.name}</h2>
              <div style={{fontFamily:"var(--mono)", color:"var(--ink-dim)", fontSize:13}}>{selected.role}</div>
            </div>
            <StatusDot s={selected.status} />
          </div>

          <div className="specs">
            <div className="row"><span className="k">cpu</span><span className="v">{selected.cpu}</span></div>
            <div className="row"><span className="k">ram</span><span className="v">{selected.ram}</span></div>
            <div className="row"><span className="k">storage</span><span className="v">{selected.disk}</span></div>
            <div className="row"><span className="k">height</span><span className="v">{selected.u} U</span></div>
            <div className="row"><span className="k">temp</span><span className="v">{selected.temp} °C</span></div>
            <div className="row"><span className="k">power</span><span className="v">{selected.power} W</span></div>
            <div className="row"><span className="k">uptime</span><span className="v">{selected.uptimeDays} d</span></div>
            <div className="row"><span className="k">rack</span><span className="v">{selected.rack}</span></div>
          </div>

          {selected.note && <div className="note">⚠ {selected.note}</div>}

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14, marginTop: 18}}>
            <Panel title="Temperatur" meta="°C · 60 min">
              <div style={{height:100}}><Sparkline values={tempWalk} color="var(--accent)" height={100} /></div>
            </Panel>
            <Panel title="Effekt" meta="W · 60 min">
              <div style={{height:100}}><Sparkline values={powerWalk} color="oklch(0.78 0.12 155)" height={100} /></div>
            </Panel>
          </div>
        </div>
      </div>

      <Panel title="VMs & LXC on PVE Server" meta={`${data.vms.filter(v=>v.status==="running").length} running · ${data.vms.filter(v=>v.status==="stopped").length} stopped`}>
        <table className="table">
          <thead>
            <tr><th style={{width:70}}>VMID</th><th>Namn</th><th style={{width:80}}>Typ</th><th style={{width:100}}>Status</th><th style={{width:90}}>RAM</th><th style={{width:100}}>Disk</th></tr>
          </thead>
          <tbody>
            {data.vms.map(v => (
              <tr key={v.vmid}>
                <td className="num" style={{color:"var(--ink-mute)"}}>{v.vmid}</td>
                <td className="mono">{v.name}</td>
                <td><span className="cat-chip">{v.kind}</span></td>
                <td><StatusDot s={v.status==="running" ? "ok" : "info"} label={v.status} /></td>
                <td className="num">{v.ram}</td>
                <td className="num">{v.disk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}
