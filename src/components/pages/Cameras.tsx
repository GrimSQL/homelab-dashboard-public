// Cameras page — Frigate tile grid, recent events, storage details.
// Ported from design_handoff/src/Fleet.jsx (CamerasPage).
import type { HomelabData } from "@/lib/data/types";
import { KPI, Panel, SectionHeader, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";
import { CameraTile } from "@/components/pages/CameraTile";
import { isHaConfigured } from "@/lib/env";

export function CamerasPage({ data }: { data: HomelabData }) {
  const cams = data.cameras;
  const recording = cams.filter(c => c.status === "recording");
  const idle = cams.filter(c => c.status === "idle");
  const outdoor = cams.filter(c => /outdoor|driveway/i.test(c.location));
  const haEnabled = isHaConfigured();

  const events = [
    { t: "14:42", cam: "cam-driveway",    tag: "person", note: "Admin arriving (known face)" },
    { t: "14:37", cam: "cam-driveway",    tag: "car",    note: "Sedan pulling into driveway" },
    { t: "12:18", cam: "cam-driveway_high_resolution_channel", tag: "person", note: "Mail carrier · 8 s clip" },
    { t: "11:02", cam: "cam-a",            tag: "motion", note: "Privacy-gated · not recorded" },
    { t: "09:55", cam: "cam-driveway",    tag: "car",    note: "User departing · Compact EV" },
    { t: "07:14", cam: "cam-driveway",    tag: "person", note: "Running (exercise)" },
    { t: "04:31", cam: "cam-b",             tag: "animal", note: "Cat visited the litterbox" },
    { t: "02:17", cam: "cam-driveway",    tag: "animal", note: "Fox crossing (ignored)" },
  ];

  return (
    <section className="page anchor" id="cameras">
      <SectionHeader num="14" title="Cameras · Frigate" sub={`${cams.length} cameras total · ${recording.length} recording 24/7 · VLAN 40 (surveillance) · object detection offloaded to Coral USB. Privacy-gated streams skip recording entirely.`} />

      <div className="kpi-grid">
        <KPI label="Recording" value={recording.length} trend={<StatusDot s="ok" label="LIVE" />} />
        <KPI label="Idle" value={idle.length} trend={<span>on motion trigger only</span>} />
        <KPI label="Outdoor" value={outdoor.length} trend={<span>driveway coverage</span>} />
        <KPI label="Object detect" value="3.4" unit="%" trend={<span>Coral USB offload</span>} spark={seededWalk(44, 40, 3.4, 0.8)} color="oklch(0.78 0.12 155)" />
      </div>

      <Panel title="Camera grid" meta={haEnabled ? "live snapshots" : "placeholder · HA_TOKEN not set"}>
        <div className="cam-grid">
          {cams.map(c => (
            <CameraTile key={c.id} cam={c} haEnabled={haEnabled} />
          ))}
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="Recent events" meta="24 h · object detection">
          <div className="feed">
            {events.map((e, i) => (
              <div className="ev" key={i}>
                <span className="t">{e.t}</span>
                <span className={"tag " + (e.tag === "person" ? "warn" : "info")}>{e.tag}</span>
                <span className="body"><b>{e.cam}</b> — {e.note}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Storage & retention" meta="PVE Server · /mnt/frigate">
          <div className="spec-table">
            <div className="row"><span className="k">codec</span><span className="v">H.265 · 4K main</span></div>
            <div className="row"><span className="k">recording</span><span className="v">24/7 all motion · 7 d keep</span></div>
            <div className="row"><span className="k">events</span><span className="v">30 d keep</span></div>
            <div className="row"><span className="k">storage</span><span className="v">412 GB used · 2 TB allocated</span></div>
            <div className="row"><span className="k">privacy</span><span className="v">cam-a + cam-b · live only</span></div>
            <div className="row"><span className="k">public</span><span className="v">frigate.example.com</span></div>
            <div className="row"><span className="k">inference</span><span className="v">Coral USB TPU · &lt; 4 % CPU on i5-14500</span></div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
