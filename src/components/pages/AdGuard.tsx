// AdGuard page — primary/backup instance cards, blocklists, top blocked.
// Ported from design_handoff/src/Security.jsx (AdGuardPage).
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";

export function AdGuardPage({ data }: { data: HomelabData }) {
  const ag = data.adguard;
  const qTotal = 48213;
  const qBlocked = Math.round(qTotal * 0.237);
  const pct = (qBlocked/qTotal)*100;
  // Synthesize 24h query series
  const queries = Array.from({length:24}, (_,h) => Math.round(1200 + Math.sin(h/3)*500 + (h>=17 && h<=22 ? 900 : 0) + (h>=6 && h<=9 ? 400 : 0)));
  // Deterministic pseudo-noise (mirrors Math.random * 80 from source, SSR-safe).
  const blocked = queries.map((q, i) => Math.round(q*0.18 + ((i*47 + 13) % 80)));

  // Top blocked (synthetic but plausible)
  const topBlocked = [
    { domain: "graph.facebook.com",           hits: 842, list: "HaGeZi" },
    { domain: "app-measurement.com",          hits: 731, list: "AdGuard DNS" },
    { domain: "doubleclick.net",              hits: 619, list: "AdGuard DNS" },
    { domain: "google-analytics.com",         hits: 487, list: "Frellwit (SE)" },
    { domain: "ads.tv4.se",                   hits: 412, list: "TV4 (SE)" },
    { domain: "telemetry.microsoft.com",      hits: 389, list: "Smart-TV" },
    { domain: "samsung-gls.samsungelectronics.com", hits: 326, list: "Smart-TV" },
    { domain: "crashlytics.com",              hits: 264, list: "HaGeZi" },
    { domain: "bitmoji.api.snapchat.com",     hits: 211, list: "AdGuard DNS" },
    { domain: "adtech.se",                    hits: 189, list: "Frellwit (SE)" },
  ];
  const maxH = topBlocked[0]?.hits ?? 1;

  return (
    <section className="page anchor" id="adguard">
      <SectionHeader num="12" title="AdGuard DNS" sub={`Two instances (active/standby): ${ag.instances.map(i=>i.host).join(" · ")}. Query log retained ${ag.queryRetention} days, stats ${ag.statsRetention} h.`} />

      <div className="kpi-grid">
        <KPI label="Queries (24 h)" value={(qTotal/1000).toFixed(1)} unit="k" trend={<span>all clients</span>} spark={queries} />
        <KPI label="Blocked" value={(qBlocked/1000).toFixed(1)} unit="k" trend={<span>{pct.toFixed(1)}% block rate</span>} spark={blocked} color="oklch(0.74 0.16 25)" />
        <KPI label="Active lists" value={ag.blocklists.filter(b=>b.active).length + " / " + ag.blocklists.length} trend={<span>+ {ag.allowlists.filter(a=>a.active).length} allowlists</span>} />
        <KPI label="Rate limit" value={ag.rateLimit.reqPerClient} unit="rps" trend={<span>subnet group {ag.rateLimit.subnetGroup}</span>} />
      </div>

      <Panel title="Instances" meta="primary / backup">
        <div className="instance-row">
          {ag.instances.map(inst => (
            <div key={inst.id} className="instance-card">
              <div className="instance-head">
                <div>
                  <div className="caps">{inst.id}</div>
                  <div style={{fontFamily:"var(--mono)", fontSize:14, color:"var(--ink)"}}>{inst.name}</div>
                </div>
                <StatusDot s={inst.status} />
              </div>
              <div className="instance-grid">
                <div><span className="caps">Host</span><span className="mono">{inst.host}</span></div>
                <div><span className="caps">Version</span><span className="mono">{inst.version}</span></div>
                <div><span className="caps">Port</span><span className="mono">:{inst.port}</span></div>
                <div><span className="caps">Login</span><span className="mono">{inst.login}</span></div>
              </div>
              <a className="svc-link" href={`https://${inst.url}.example.com`} target="_blank" rel="noopener noreferrer">{inst.url}.example.com ↗</a>
            </div>
          ))}
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="Blocklists" meta={`${ag.blocklists.filter(b=>b.active).length} of ${ag.blocklists.length} active`}>
          <div style={{display:"grid", gap: 6}}>
            {ag.blocklists.map((bl,i) => (
              <div key={i} className="list-row">
                <span className={"ledot " + (bl.active ? "on" : "off")} />
                <span className="mono" style={{color: bl.active ? "var(--ink)" : "var(--ink-mute)"}}>{bl.name}</span>
                <span className="lang-chip">{bl.lang}</span>
              </div>
            ))}
          </div>
          <div className="caps" style={{marginTop: 14, marginBottom: 6, color:"var(--ink-mute)"}}>Allowlists</div>
          <div style={{display:"grid", gap: 6}}>
            {ag.allowlists.map((al,i) => (
              <div key={i} className="list-row">
                <span className={"ledot " + (al.active ? "on" : "off")} />
                <span className="mono">{al.name}</span>
                <span className="lang-chip">allow</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top blocked · 24 h" meta="synthesized from active lists">
          <div style={{display:"grid", gap:4}}>
            {topBlocked.map((b,i) => (
              <div key={i} className="block-row">
                <span className="mono" style={{color:"var(--ink)"}}>{b.domain}</span>
                <span className="block-bar"><i style={{width: (b.hits/maxH*100) + "%"}}/></span>
                <span className="num" style={{color:"var(--ink-mute)"}}>{b.hits}</span>
                <span className="lang-chip">{b.list}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
