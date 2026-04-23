import { describe, it, expect } from "vitest";
import { mapStatesToHassEntities } from "./ha";

type HaState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
};

const s = (
  entity_id: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HaState => ({ entity_id, state, attributes });

describe("mapStatesToHassEntities", () => {
  it("classifies a living-room temperature as temp-indoor", () => {
    const out = mapStatesToHassEntities([
      s("sensor.thermometer_vardagsrum_temperature", "23.6", {
        friendly_name: "Living room",
        unit_of_measurement: "°C",
        device_class: "temperature",
      }),
    ]);
    expect(out).toEqual([
      {
        id: "sensor.thermometer_vardagsrum_temperature",
        name: "Living room",
        unit: "°C",
        value: 23.6,
        kind: "temp-indoor",
      },
    ]);
  });

  it("classifies server-cabinet / garage temps as temp-hw", () => {
    const out = mapStatesToHassEntities([
      s("sensor.thermometer_serverskap_temperature", "28.9", { unit_of_measurement: "°C", device_class: "temperature" }),
      s("sensor.thermometer_garage_temperature", "17.4", { unit_of_measurement: "°C", device_class: "temperature" }),
    ]);
    expect(out.map((e) => e.kind)).toEqual(["temp-hw", "temp-hw"]);
  });

  it("classifies disk drive temperatures as disk", () => {
    const out = mapStatesToHassEntities([
      s("sensor.synology_drive_1_temperature", "30", { unit_of_measurement: "°C", device_class: "temperature" }),
      s("sensor.disk_pve-server_wd_black_sn770_1tb_temperature", "41", {
        unit_of_measurement: "°C",
        device_class: "temperature",
      }),
    ]);
    expect(out).toHaveLength(2);
    expect(out.every((e) => e.kind === "disk")).toBe(true);
  });

  it("classifies tibber pulse raw power as power-main and averages as power", () => {
    const out = mapStatesToHassEntities([
      s("sensor.power_meter_house_power", "4361", { unit_of_measurement: "W", device_class: "power" }),
      s("sensor.power_meter_house_average_power", "4526", {
        unit_of_measurement: "W",
        device_class: "power",
      }),
      s("sensor.power_meter_house_max_power", "4673", {
        unit_of_measurement: "W",
        device_class: "power",
      }),
    ]);
    const main = out.find((e) => e.id.endsWith("_house_power"));
    const avg = out.find((e) => e.id.endsWith("average_power"));
    const max = out.find((e) => e.id.endsWith("max_power"));
    expect(main?.kind).toBe("power-main");
    expect(avg?.kind).toBe("power");
    expect(max?.kind).toBe("power");
  });

  it("classifies other *_power and *_current_consumption as power", () => {
    const out = mapStatesToHassEntities([
      s("sensor.outdoor_lights_front_power", "184", { unit_of_measurement: "W", device_class: "power" }),
      s("sensor.till_datorn_current_consumption", "178", { unit_of_measurement: "W", device_class: "power" }),
    ]);
    expect(out.map((e) => e.kind)).toEqual(["power", "power"]);
  });

  it("classifies binary_sensor contacts as door with open/closed values", () => {
    const out = mapStatesToHassEntities([
      s("binary_sensor.magnet_garage_door_contact", "off", { friendly_name: "Garage door" }),
      s("binary_sensor.magnet_storage_contact", "on", { friendly_name: "Storage" }),
    ]);
    expect(out).toEqual([
      { id: "binary_sensor.magnet_garage_door_contact", name: "Garage door", unit: "", value: "closed", kind: "door" },
      { id: "binary_sensor.magnet_storage_contact", name: "Storage", unit: "", value: "open", kind: "door" },
    ]);
  });

  it("drops sensors that report unavailable / non-numeric state", () => {
    const out = mapStatesToHassEntities([
      s("sensor.some_temp_temperature", "unavailable", { device_class: "temperature" }),
      s("sensor.other_power", "unknown", { device_class: "power" }),
    ]);
    expect(out).toEqual([]);
  });

  it("ignores entities that don't match any known kind", () => {
    const out = mapStatesToHassEntities([
      s("sun.sun", "below_horizon"),
      s("automation.morning_routine", "on"),
      s("sensor.random_metric", "42", { unit_of_measurement: "units" }),
    ]);
    expect(out).toEqual([]);
  });

  it("falls back to local entity id when friendly_name is missing", () => {
    const out = mapStatesToHassEntities([
      s("sensor.kitchen_temp_temperature", "21", { device_class: "temperature" }),
    ]);
    expect(out[0]?.name).toBe("kitchen temp temperature");
  });
});
