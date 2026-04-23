import "server-only";
import { env } from "@/lib/env";
import { makeClient } from "@/lib/http";
import type { HassEntity, HomelabData } from "@/lib/data/types";

type HaAttributes = {
  friendly_name?: string;
  unit_of_measurement?: string;
  device_class?: string;
};

type HaState = {
  entity_id: string;
  state: string;
  attributes: HaAttributes;
};

function parseNumeric(state: string): number | null {
  if (state === "unavailable" || state === "unknown" || state === "") return null;
  const n = Number(state);
  return Number.isFinite(n) ? n : null;
}

function classifyTemperature(entity_id: string): "temp-indoor" | "temp-hw" {
  const id = entity_id.toLowerCase();
  if (
    id.includes("cpu") ||
    id.includes("soc") ||
    id.includes("disk") ||
    id.includes("drive") ||
    id.includes("serverskap") ||
    id.includes("garage") ||
    id.includes("tvattstuga") ||
    id.includes("utomhus") ||
    id.includes("nvme") ||
    id.includes("ssd") ||
    id.includes("hdd")
  ) {
    return "temp-hw";
  }
  return "temp-indoor";
}

function humanName(entity_id: string, attrs: HaAttributes): string {
  if (attrs.friendly_name && attrs.friendly_name.trim().length > 0) {
    return attrs.friendly_name;
  }
  // Fallback to the local part of the entity_id with underscores removed.
  const local = entity_id.split(".")[1] ?? entity_id;
  return local.replace(/_/g, " ");
}

/**
 * Map Home Assistant /api/states output to our HassEntity slice.
 *
 * Heuristics (conservative — unmapped entities are dropped):
 *   - sensor.*_temperature OR device_class=temperature → temp-indoor/temp-hw
 *   - sensor.*_disk_use* or *_use_percent (disk) → disk
 *   - power_meter *_power → power-main
 *   - other sensor.*_power / *_consumption → power
 *   - binary_sensor.*_door / *_window / magnet_contact → door
 */
export function mapStatesToHassEntities(states: HaState[]): HassEntity[] {
  const out: HassEntity[] = [];

  for (const s of states) {
    const id = s.entity_id;
    const attrs = s.attributes ?? {};
    const unit = attrs.unit_of_measurement ?? "";
    const deviceClass = (attrs.device_class ?? "").toLowerCase();
    const lower = id.toLowerCase();

    // Door / window contacts
    if (
      lower.startsWith("binary_sensor.") &&
      (lower.includes("door") ||
        lower.includes("window") ||
        lower.includes("dorr") ||
        lower.includes("magnet_"))
    ) {
      const value = s.state === "on" ? "open" : s.state === "off" ? "closed" : s.state;
      out.push({
        id,
        name: humanName(id, attrs),
        unit: "",
        value,
        kind: "door",
      });
      continue;
    }

    if (!lower.startsWith("sensor.")) continue;

    const numeric = parseNumeric(s.state);
    if (numeric === null) continue;

    // Temperature (indoor vs hardware)
    if (deviceClass === "temperature" || lower.endsWith("_temperature")) {
      // Disk temperature = disk kind
      if (
        lower.includes("drive") ||
        lower.includes("disk_") ||
        lower.includes("nvme") ||
        lower.includes("_m_2_") ||
        lower.includes("_ssd_") ||
        lower.includes("_hdd_")
      ) {
        out.push({
          id,
          name: humanName(id, attrs),
          unit: unit || "°C",
          value: numeric,
          kind: "disk",
        });
        continue;
      }
      const kind = classifyTemperature(id);
      out.push({
        id,
        name: humanName(id, attrs),
        unit: unit || "°C",
        value: numeric,
        kind,
      });
      continue;
    }

    // Disk use percentage
    if (lower.includes("disk_use") || lower.includes("use_percent")) {
      out.push({
        id,
        name: humanName(id, attrs),
        unit: unit || "%",
        value: numeric,
        kind: "disk",
      });
      continue;
    }

    // Power
    if (
      deviceClass === "power" ||
      lower.endsWith("_power") ||
      lower.endsWith("_current_consumption") ||
      lower.endsWith("_energy_kwh") ||
      lower.endsWith("_monthly_cost")
    ) {
      const isMain =
        lower.includes("power_meter") && lower.endsWith("_power") && !lower.includes("average") && !lower.includes("max");
      out.push({
        id,
        name: humanName(id, attrs),
        unit: unit || "W",
        value: numeric,
        kind: isMain ? "power-main" : "power",
      });
      continue;
    }
  }

  return out;
}

export async function fetchHassSlice(): Promise<Partial<HomelabData>> {
  if (!env.ha.token) throw new Error("HA_TOKEN not configured");
  const client = makeClient({
    baseUrl: env.ha.baseUrl,
    headers: { Authorization: `Bearer ${env.ha.token}` },
    timeoutMs: 5000,
  });
  const states = await client.get("api/states").json<HaState[]>();
  const hassEntities = mapStatesToHassEntities(states);
  return { hassEntities };
}
