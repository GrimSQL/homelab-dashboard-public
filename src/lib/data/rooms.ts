export type RoomSection = "entry" | "right" | "left" | "outdoor";

export type Room = {
  id: string;
  name: string;
  icon: string;
  section: RoomSection;
  lightEntityId: string;
  tempEntityId?: string;
};

export const ROOMS: readonly Room[] = [
  { id: "hall",       name: "Hall",        icon: "⌂", section: "entry",   lightEntityId: "light.lights_hall" },
  { id: "corridor",   name: "Corridor",    icon: "⇆", section: "right",   lightEntityId: "light.lights_corridor",    tempEntityId: "sensor.thermometer_corridor_temperature" },
  { id: "bedroom",    name: "Bedroom",     icon: "◐", section: "right",   lightEntityId: "light.lights_bedroom",     tempEntityId: "sensor.thermometer_bedroom_temperature" },
  { id: "craft",      name: "Craft room",  icon: "◈", section: "right",   lightEntityId: "light.lights_craft",       tempEntityId: "sensor.thermometer_craft_temperature" },
  { id: "family",     name: "Family room", icon: "▦", section: "right",   lightEntityId: "light.lights_family",      tempEntityId: "sensor.thermometer_family_temperature" },
  { id: "kids",       name: "Kids room",   icon: "✿", section: "right",   lightEntityId: "light.lights_kids",        tempEntityId: "sensor.thermometer_kids_temperature" },
  { id: "office",     name: "Office",      icon: "▣", section: "right",   lightEntityId: "light.lights_office",      tempEntityId: "sensor.thermometer_office_temperature" },
  { id: "living",     name: "Living room", icon: "▤", section: "left",    lightEntityId: "light.lights_living",      tempEntityId: "sensor.thermometer_living_temperature" },
  { id: "laundry",    name: "Laundry",     icon: "⌘", section: "left",    lightEntityId: "light.lights_laundry",     tempEntityId: "sensor.thermometer_laundry_temperature" },
  { id: "kitchen",    name: "Kitchen",     icon: "⚒", section: "left",    lightEntityId: "light.lights_kitchen",     tempEntityId: "sensor.thermometer_kitchen_temperature" },
  { id: "garage",     name: "Garage",      icon: "◉", section: "outdoor", lightEntityId: "light.lights_garage",      tempEntityId: "sensor.thermometer_garage_temperature" },
  { id: "outdoor",    name: "Outdoor",     icon: "☀", section: "outdoor", lightEntityId: "light.lights_outdoor",     tempEntityId: "sensor.thermometer_outdoor_temperature" },
];

export const SECTION_LABELS: Record<RoomSection, string> = {
  entry:   "Entry",
  right:   "Right",
  left:    "Left",
  outdoor: "Outdoor",
};

export function roomsBySection(): Record<RoomSection, Room[]> {
  const out = { entry: [], right: [], left: [], outdoor: [] } as Record<RoomSection, Room[]>;
  for (const r of ROOMS) out[r.section].push(r);
  return out;
}
