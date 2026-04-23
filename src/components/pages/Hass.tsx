// Home Assistant page — rooms with live light control + sensor tiles.
// Ported from design_handoff/src/Pages.jsx (HassPage),
// extended with room cards wired into the HA REST API.
import type { HomelabData, HassEntity } from "@/lib/data/types";
import { Panel, SectionHeader, Sparkline } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";
import { ROOMS } from "@/lib/data/rooms";
import { RoomsGrid } from "@/components/hass/RoomsGrid";
import { env, isHaConfigured } from "@/lib/env";

type RoomState = {
  lightOn: boolean;
  brightness: number | null;
  supportsBrightness: boolean;
  temperatureC: number | null;
};
type HaState = { entity_id: string; state: string; attributes: Record<string, unknown> };

async function fetchRoomsInitial(): Promise<Record<string, RoomState>> {
  if (!isHaConfigured()) return {};
  try {
    const res = await fetch(`${env.ha.baseUrl}/api/states`, {
      headers: { Authorization: `Bearer ${env.ha.token}` },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const states = (await res.json()) as HaState[];
    const byId = new Map(states.map((s) => [s.entity_id, s]));
    const out: Record<string, RoomState> = {};
    for (const r of ROOMS) {
      const light = byId.get(r.lightEntityId);
      const temp = r.tempEntityId ? byId.get(r.tempEntityId) : undefined;
      const brightnessAttr = light?.attributes.brightness;
      const supportedColorModes = light?.attributes.supported_color_modes;
      out[r.id] = {
        lightOn: light?.state === "on",
        brightness:
          typeof brightnessAttr === "number"
            ? Math.round((brightnessAttr / 255) * 100)
            : null,
        supportsBrightness:
          Array.isArray(supportedColorModes) &&
          (supportedColorModes as string[]).some((m) => m !== "onoff"),
        temperatureC:
          temp?.state && !Number.isNaN(parseFloat(temp.state))
            ? parseFloat(temp.state)
            : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function HassPage({ data }: { data: HomelabData }) {
  const initialRooms = await fetchRoomsInitial();

  const indoor = data.hassEntities.filter(e => e.kind === "temp-indoor");
  const hwtemps = data.hassEntities.filter(e => e.kind === "temp-hw");
  const disks = data.hassEntities.filter(e => e.kind === "disk");
  const powers = data.hassEntities.filter(e => e.kind === "power" || e.kind === "power-main");
  const doors = data.hassEntities.filter(e => e.kind === "door");

  return (
    <section className="page anchor" id="hass">
      <SectionHeader num="06" title="Home Assistant" sub="Rooms + selected entities · live from HA VM 100." />

      <Panel title="Rooms & Lights" meta="tap to toggle · drag for brightness">
        <RoomsGrid initialRooms={initialRooms} />
      </Panel>

      <div>
        <div className="caps" style={{marginBottom: 10}}>Indoor · climate</div>
        <div className="hass-grid">{indoor.map(e => <TempTile key={e.id} e={e} />)}</div>
      </div>
      <div>
        <div className="caps" style={{marginBottom: 10}}>Hardware · rooms & cabinet</div>
        <div className="hass-grid">{hwtemps.map(e => <TempTile key={e.id} e={e} />)}</div>
      </div>
      <div>
        <div className="caps" style={{marginBottom: 10}}>Disks · temperature</div>
        <div className="hass-grid">{disks.map(e => <DiskTile key={e.id} e={e} />)}</div>
      </div>
      <div>
        <div className="caps" style={{marginBottom: 10}}>Power · Power meter</div>
        <div className="hass-grid">{powers.map(e => <PowerTile key={e.id} e={e} />)}</div>
      </div>
      <div>
        <div className="caps" style={{marginBottom: 10}}>Contacts · security</div>
        <div className="hass-grid">{doors.map(e => <DoorTile key={e.id} e={e} />)}</div>
      </div>
    </section>
  );
}

function TempTile({ e }: { e: HassEntity }) {
  const v = Number(e.value);
  const pct = Math.max(0, Math.min(100, ((v + 20) / 60) * 100));
  return (
    <div className="tile" style={{paddingRight: 28}}>
      <div className="label">{e.name}</div>
      <div className="big">{v.toFixed(1)}<small> °C</small></div>
      <div className="sub">{e.id}</div>
      <div className="thermo"><i style={{height: pct + "%"}} /></div>
    </div>
  );
}

function DiskTile({ e }: { e: HassEntity }) {
  return (
    <div className="tile">
      <div className="label">{e.name}</div>
      <div className="big">{e.value}<small> °C</small></div>
      <div className="sub">{e.meta || e.id}</div>
    </div>
  );
}

function PowerTile({ e }: { e: HassEntity }) {
  const v = Number(e.value) || 0;
  const walk = seededWalk(e.id.length, 40, v, Math.max(v*0.18, 6));
  return (
    <div className="tile">
      <div className="label">{e.name}</div>
      <div className="big">{typeof e.value === "number" && e.value > 1000 ? e.value.toLocaleString("en-US") : e.value}<small> {e.unit}</small></div>
      <div className="sub">{e.id}</div>
      <div style={{height: 36, marginTop: 4}}><Sparkline values={walk} color="oklch(0.78 0.12 155)" height={36} /></div>
    </div>
  );
}

function DoorTile({ e }: { e: HassEntity }) {
  const str = String(e.value);
  return (
    <div className="tile door">
      <div className="label">{e.name}</div>
      <div className="big" style={{color: /closed|stängd/i.test(str) ? "var(--ok)" : "var(--warn)"}}>
        <span style={{display:"inline-block", width:10, height:10, borderRadius:2, marginRight:8, background:"currentColor"}} />
        {e.value}
      </div>
      <div className="sub">{e.id}</div>
    </div>
  );
}
