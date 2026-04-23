// Overview page — hero with big brag stats + KPIs + activity feed
// Ported from design_handoff/src/Overview.jsx.
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

type Feed = {
  t: string;
  tag: "ok" | "info" | "warn" | "err";
  msg: React.ReactNode;
};

export function OverviewPage({ data }: { data: HomelabData }) {
  const findVal = <T,>(sub: string, dflt: T): number | string | T => {
    const e = data.hassEntities.find(e => e.id.includes(sub));
    return e ? e.value : dflt;
  };
  const totalPower = findVal("power_meter_house_power", 4361) as number;
  const avgPower = findVal("average_power", 4526) as number;
  const serverCab = findVal("serverskap", 28.9) as number;
  const outdoor = findVal("utomhus", 8.9) as number;
  const hero = data.hero;
  const monthly = hero.monthlyCost ?? 0;

  const svcUp = data.services.filter(s => s.status === "ok").length;
  const svcTotal = data.services.length;

  const powerWalk = seededWalk(3, 60, totalPower, 380);
  const tempWalk = seededWalk(4, 60, serverCab, 1.4);

  const feed: Feed[] = [
    { t: "14:38", tag: "ok",   msg: <><b>plex-media</b> · v1.41.2 deployed via Watchtower</> },
    { t: "14:12", tag: "info", msg: <><b>Zigbee2MQTT</b> · new device paired: <code>kitchen-table-2</code></> },
    { t: "13:47", tag: "ok",   msg: <><b>frigate</b> · Coral TPU healthy · inference 3.4 % CPU</> },
    { t: "13:02", tag: "ok",   msg: <><b>PBS → NAS</b> · nightly sync, 2.1 TB in 41 min</> },
    { t: "11:18", tag: "info", msg: <><b>Power meter</b> · daily peak 4 673 W at 07:45</> },
    { t: "09:44", tag: "err",  msg: <><b>UDM Pro</b> · temp 67 °C (upper normal spec)</> },
    { t: "07:01", tag: "ok",   msg: <><b>Home Assistant</b> · snapshot → Google Drive</> },
    { t: "03:00", tag: "info", msg: <><b>NAS Primary</b> · S.M.A.R.T quick test — all drives OK</> },
  ];

  return (
    <section className="page anchor" id="overview">
      <div className="hero">
        <div className="hero-tag">homelab.example.com · {data.meta.isp} · {data.meta.publicIp}</div>
        <h1>Running a data center <em>from the laundry room.</em></h1>
        <div className="sub">
          {hero.containers} Docker containers, {hero.vms} VMs and {hero.addons} HA addons — all on a single MSI mainboard. 41 public subdomains behind Traefik + Cloudflare Tunnel.
        </div>

        <div className="big-stats">
          <BigStat n={hero.containers} label="containers" />
          <BigStat n={hero.subdomains} label="subdomains" />
          <BigStat n={hero.usableTB} unit="TB" label="usable mirror" />
          <BigStat n={((hero.lifetimeKWh ?? 0)/1000).toFixed(1)} unit="MWh" label="lifetime energy" />
          <BigStat n={((hero.evKWh ?? 0)/1000).toFixed(1)} unit="MWh" label="EV charged" />
          <BigStat n={hero.nutUptimeDays} unit="d" label="ups-monitor uptime" />
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Whole house" value={totalPower} unit="W"
             trend={<><span>avg {avgPower} W</span><span>· {monthly} this month</span></>}
             spark={powerWalk} color="oklch(0.78 0.12 155)" />
        <KPI label="Services up" value={`${svcUp}/${svcTotal}`}
             trend={<><StatusDot s={svcUp===svcTotal ? "ok" : "warn"} label={svcUp===svcTotal ? "ALL OK" : "1 DEGR"} /></>}
             spark={seededWalk(10, 40, svcUp, 1)} />
        <KPI label="Server cabinet" value={serverCab.toFixed(1)} unit="°C"
             trend={<><span>Δ outdoor {outdoor.toFixed(1)} °C</span></>}
             spark={tempWalk} />
        <KPI label="Garage cluster" value="184" unit="W"
             trend={<><span>Proxmox + NAS + AP + sw</span></>}
             spark={seededWalk(5, 40, 184, 18)} color="oklch(0.80 0.14 45)" />
      </div>

      <div className="two-col">
        <Panel title="Activity" meta="last 12 h">
          <div className="feed">
            {feed.map((e,i) => (
              <div className="ev" key={i}>
                <span className="t">{e.t}</span>
                <span className={"tag " + e.tag}>{e.tag}</span>
                <span className="body">{e.msg}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Health" meta="passive diagnosis">
          <div style={{display:"grid", gap: 2}}>
            <HealthRow label="Hardware"     val={`${data.hardware.filter(h=>h.status==="ok").length}/${data.hardware.length}`} warn note="UDM Pro RAM tight (3.3/3.9 GB)" />
            <HealthRow label="Services"     val={`${svcUp}/${svcTotal}`} ok note="frigate at 21.8 % CPU" />
            <HealthRow label="Drives"       val="green" ok note="NVMe 3 % wear · 0 errors" />
            <HealthRow label="Proxmox"      val="swap 8/8" warn note="RAM 40/62 GB + swap full" />
            <HealthRow label="Backups"      val="fresh" ok note="PBS + Google Drive + offsite Tailscale" />
            <HealthRow label="Certificates" val="OK" ok note="Cloudflare auto-renew" />
          </div>
        </Panel>
      </div>

      <div>
        <div className="caps" style={{marginBottom: 10}}>41 public subdomains · *.example.com</div>
        <div className="subs-grid">
          {(data.subdomains || []).map(s => (
            <a key={s} className="sub-chip" href={`https://${s}.example.com`} target="_blank" rel="noopener noreferrer">
              <b>{s}</b><span className="tld">.example.com</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function BigStat({ n, unit, label }: { n: React.ReactNode; unit?: string; label: string }) {
  return (
    <div className="big-stat">
      <div className="n">{n}{unit && <small>{unit}</small>}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function HealthRow({ label, val, ok, warn, note }: { label: string; val: string; ok?: boolean; warn?: boolean; note: string }) {
  return (
    <div style={{display:"grid", gridTemplateColumns:"110px 110px 1fr", gap:10, alignItems:"center", borderBottom:"1px dashed var(--rule)", padding:"8px 0", fontFamily:"var(--mono)", fontSize:12}}>
      <span style={{color:"var(--ink-mute)"}}>{label}</span>
      <StatusDot s={warn ? "warn" : ok ? "ok" : "err"} label={val} />
      <span style={{color:"var(--ink-dim)"}}>{note}</span>
    </div>
  );
}
