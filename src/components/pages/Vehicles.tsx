// Vehicles page — Home Assistant-integrated vehicles + EV wallbox stats.
// Ported from design_handoff/src/Fleet.jsx (VehiclesPage).
import type { HomelabData, Vehicle } from "@/lib/data/types";
import { Panel, SectionHeader, Sparkline, StatusDot } from "@/components/primitives";
import { seededWalk } from "@/lib/spark";

export function VehiclesPage({ data }: { data: HomelabData }) {
  const v = data.vehicles;
  const wallbox = data.wallbox;

  return (
    <section className="page anchor" id="vehicles">
      <SectionHeader num="15" title="Vehicles" sub={`${v.length} vehicles integrated into Home Assistant · EV charger with ${wallbox.stations.length} stations has delivered ${wallbox.totalKwh.toLocaleString("en-US")} kWh lifetime.`} />

      <div className="vehicle-row">
        {v.map(car => <VehicleCard key={car.id} car={car} />)}
      </div>

      <Panel title="EV wallbox" meta={`${wallbox.totalKwh.toLocaleString("en-US")} kWh lifetime · both sides active`}>
        <div className="wallbox-grid">
          {wallbox.stations.map((s, i) => {
            const pct = (s.kWh / wallbox.totalKwh) * 100;
            return (
              <div key={i} className="wallbox-cell">
                <div className="caps">station · {s.side.toLowerCase()}</div>
                <div className="wallbox-kwh">{s.kWh.toLocaleString("en-US")}<small> kWh</small></div>
                <div className="wallbox-bar"><i style={{ width: pct + "%" }} /></div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 6 }}>{pct.toFixed(1)}% of lifetime total</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

function VehicleCard({ car }: { car: Vehicle }) {
  const batt = car.batteryPct ?? 0;
  const battColor = batt > 60 ? "var(--ok)" : batt > 25 ? "var(--warn)" : "var(--err)";
  const battWalk = seededWalk(car.id.charCodeAt(0), 40, batt, 6);

  return (
    <div className="vehicle-card" style={{ borderTop: `3px solid ${car.accent}` }}>
      <div className="vehicle-head">
        <div>
          <div className="caps">{car.type}</div>
          <h3 style={{ margin: "2px 0 0 0", fontFamily: "var(--mono)", fontSize: 18, color: "var(--ink)" }}>{car.title}</h3>
          {car.vin && <div className="mono" style={{ fontSize: 10, color: "var(--ink-mute)" }}>VIN {car.vin}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          {car.locked === true && <StatusDot s="ok" label="LOCKED" />}
          {car.locked === false && <StatusDot s="warn" label="UNLOCKED" />}
        </div>
      </div>

      <div className="vehicle-body">
        <div className="batt-ring">
          <svg viewBox="0 0 100 100" width="130" height="130">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--rule-2)" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={battColor} strokeWidth="6"
              strokeDasharray={`${(batt / 100) * 264} 264`} strokeLinecap="round"
              transform="rotate(-90 50 50)" />
            <text x="50" y="48" textAnchor="middle" fontFamily="var(--mono)" fontSize="20" fill="var(--ink)">{batt}</text>
            <text x="50" y="62" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-mute)">% SoC</text>
          </svg>
        </div>

        <div className="vehicle-details">
          {car.rangeKm && <div className="vd"><span className="caps">Range</span><span className="mono">{car.rangeKm} km</span></div>}
          {car.batteryKWh && <div className="vd"><span className="caps">Battery</span><span className="mono">{car.batteryKWh} kWh</span></div>}
          {car.odometer && <div className="vd"><span className="caps">Odometer</span><span className="mono">{car.odometer.toLocaleString("en-US")} km</span></div>}
          {car.location && <div className="vd"><span className="caps">Location</span><span className="mono">{car.location}</span></div>}
          {car.charge && <div className="vd"><span className="caps">Charge</span><span className="mono">{car.charge}</span></div>}
          {car.chargeTarget && <div className="vd"><span className="caps">Target</span><span className="mono">{car.chargeTarget}%</span></div>}
          {car.climatiseTargetC && <div className="vd"><span className="caps">Climate</span><span className="mono">{car.climatiseTargetC} °C</span></div>}
          {car.hvBattMinC != null && <div className="vd"><span className="caps">HV pack</span><span className="mono">{car.hvBattMinC}–{car.hvBattMaxC} °C</span></div>}
          {car.serviceDaysLeft && <div className="vd"><span className="caps">Service</span><span className="mono">{car.serviceDaysLeft} d</span></div>}
        </div>
      </div>

      <div className="vehicle-spark">
        <div className="caps">SoC · last 40 readings</div>
        <Sparkline values={battWalk} color={battColor} height={36} />
      </div>

      <div className="vehicle-foot">
        <div className="caps">Integrations</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {car.integrations.map(it => <span key={it} className="cat-chip">{it}</span>)}
        </div>
        {car.notes && <div className="note" style={{ marginTop: 10 }}>{car.notes}</div>}
      </div>
    </div>
  );
}
