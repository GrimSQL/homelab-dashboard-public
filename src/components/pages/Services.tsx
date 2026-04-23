"use client";
// Services page — catalog table with category filter chips.
// Ported from design_handoff/src/Infra.jsx (ServicesPage).
import { useState } from "react";
import type { HomelabData } from "@/lib/data/types";
import { Panel, SectionHeader, StatusDot } from "@/components/primitives";

export function ServicesPage({ data }: { data: HomelabData }) {
  const [filter, setFilter] = useState("all");
  const cats = ["all", ...Array.from(new Set(data.services.map(s => s.cat)))];
  const rows = data.services.filter(s => filter === "all" || s.cat === filter);

  return (
    <section className="page anchor" id="services">
      <SectionHeader num="02" title="Services" sub={`${data.services.length} running services · ${data.services.filter(s=>s.host==="docker").length} Docker containers on LXC 101 · ${data.services.filter(s=>s.host==="hass-vm").length} Home Assistant add-ons.`} />

      <Panel flush
        title="Catalog"
        head={
          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
            {cats.map(c => (
              <button key={c}
                onClick={() => setFilter(c)}
                style={{
                  background: filter===c ? "var(--accent-2)" : "transparent",
                  color: filter===c ? "var(--accent)" : "var(--ink-dim)",
                  border: "1px solid " + (filter===c ? "var(--accent)" : "var(--rule-2)"),
                  padding: "4px 10px", borderRadius: 999, fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer"
                }}>
                {c}
              </button>
            ))}
          </div>
        }>
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Host</th>
              <th>Category</th>
              <th style={{width:140}}>RAM</th>
              <th style={{width:90}}>Port</th>
              <th style={{width:80}}>Uptime</th>
              <th style={{width:90}}>Status</th>
              <th style={{width:180}}>Publik</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s,i) => (
              <tr key={i}>
                <td><span style={{color:"var(--ink)", fontFamily:"var(--mono)"}}>{s.name}</span></td>
                <td className="mono" style={{color:"var(--ink-dim)"}}>{s.host}</td>
                <td><span className="cat-chip">{s.cat}</span></td>
                <td>
                  <div style={{display:"flex", gap:8, alignItems:"center"}}>
                    <div className="bar"><i style={{width: Math.min(100, s.ram/20) + "%", background: "oklch(0.75 0.11 235)"}}/></div>
                    <span className="num" style={{color:"var(--ink-dim)"}}>{s.ram < 1000 ? s.ram + " MB" : (s.ram/1000).toFixed(2) + " GB"}</span>
                  </div>
                </td>
                <td className="num" style={{color:"var(--ink-mute)"}}>{s.port ? ":"+s.port : "—"}</td>
                <td className="num" style={{color:"var(--ink-dim)"}}>{s.uptime.toFixed(2)}%</td>
                <td><StatusDot s={s.status} /></td>
                <td>{s.url ? <a className="svc-link" href={`https://${s.url}.example.com`} target="_blank" rel="noopener noreferrer">{s.url}.example.com ↗</a> : <span style={{color:"var(--ink-mute)", fontFamily:"var(--mono)", fontSize:11}}>internal</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}
