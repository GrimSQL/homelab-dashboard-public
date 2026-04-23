/* eslint-disable @next/next/no-img-element */
// Network page — topology panel, ingress/tunnels, VLAN grid.
// Ported from design_handoff/src/Infra.jsx (NetworkPage).
import type { HomelabData } from "@/lib/data/types";
import { Panel, SectionHeader } from "@/components/primitives";

export function NetworkPage({ data }: { data: HomelabData }) {
  return (
    <section className="page anchor" id="network">
      <SectionHeader num="03" title="Network" sub={`${data.meta.isp} · Public IP ${data.meta.publicIp} · 10 GbE backbone between laundry and core · Wi-Fi 7 everywhere.`} />

      <div className="two-col">
        <Panel title="Topology" meta="home network overview">
          <img
            src="/assets/topology.svg"
            alt="Home network topology"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--rule)",
              background: "var(--bg-1)"
            }}
          />
        </Panel>

        <Panel title="Proxy & tunnels" meta="how traffic gets in">
          <ul style={{margin:0, padding:"0 0 0 18px", color:"var(--ink-dim)", fontFamily:"var(--mono)", fontSize:12, lineHeight:1.7}}>
            <li><b style={{color:"var(--ink)"}}>Traefik v3.1</b> — TLS terminator for all <code>*.example.com</code></li>
            <li><b style={{color:"var(--ink)"}}>Cloudflare Tunnel</b> — public ingress without open ports</li>
            <li><b style={{color:"var(--ink)"}}>Tailscale mesh</b> — proxmox-ts, pbs-ts, pbs-offsite, HA-addon, bastion</li>
            <li><b style={{color:"var(--ink)"}}>NordVPN</b> — WireGuard egress via UDM</li>
            <li><b style={{color:"var(--ink)"}}>playit.gg</b> — Minecraft tunnel</li>
            <li><b style={{color:"var(--ink)"}}>Bastion</b> — Oracle Cloud Free Tier jump host + Kuma</li>
          </ul>
        </Panel>
      </div>

      <div>
        <div className="caps" style={{marginBottom: 10}}>VLANs · 8 segments</div>
        <div className="vlan-grid">
          {data.vlans.map(v => (
            <div className="vlan" key={String(v.id)}>
              <div className="h"><b>VLAN {v.id}</b><span>{v.subnet}</span></div>
              <div className="n" style={{color:"var(--ink)", marginTop:6, fontFamily:"var(--mono)"}}>{v.name}</div>
              <div className="n">{v.note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
