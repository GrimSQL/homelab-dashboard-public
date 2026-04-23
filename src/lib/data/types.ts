// Types for the full HOMELAB data shape.
// Source of truth: design_handoff/data/homelab.js (the literal
// `window.HOMELAB = { ... }` object). Every field there must be represented
// here — Task 5.2 compile-checks MOCK_HOMELAB against HomelabData.

export type Status = "ok" | "warn" | "err" | "deg" | "info";

export type HomelabMeta = {
  title: string;
  tagline: string;
  owner: string;
  location: string;
  publicIp: string;
  isp: string;
  uptimeSinceISO: string;
  generatedAt?: string;
};

export type Hero = {
  containers: number;
  vms: number;
  addons: number;
  subdomains: number;
  rawTB: number;
  usableTB: number;
  lifetimeKWh: number;
  evKWh: number;
  nutUptimeDays: number;
  monthlyCost: number;
  currency: string;
};

export type HardwareUnit = {
  id: string;
  rack: string;
  slot: number;
  u: number;
  name: string;
  role: string;
  cpu: string;
  ram: string;
  disk: string;
  temp: number;
  power: number;
  status: Status;
  uptimeDays: number;
  note?: string;
};

export type VM = {
  vmid: number;
  name: string;
  kind: "VM" | "LXC";
  status: "running" | "stopped";
  ram: string;
  disk: string;
};

export type Service = {
  name: string;
  host: string;
  cat: string;
  port: number;
  ram: number;
  status: Status;
  uptime: number;
  url?: string;
  note?: string;
};

export type Ups = {
  id: string;
  name: string;
  model: string;
  load: number;
  battery: number;
  volt: number;
  status: string;
  protects: string[];
};

export type Vlan = {
  id: number | string;
  subnet: string;
  name: string;
  note: string;
};

export type HassEntity = {
  id: string;
  name: string;
  unit: string;
  value: number | string;
  kind:
    | "temp-indoor"
    | "temp-hw"
    | "disk"
    | "power-main"
    | "power"
    | "door"
    | string;
  meta?: string;
};

export type Project = {
  slug: string;
  title: string;
  group: string;
  date?: string;
  url?: string | null;
  repoUrl?: string;
  file?: string;
  [key: string]: unknown;
};

export type BackupChainStep = {
  step: number;
  name: string;
  node: string;
  role: string;
  schedule: string;
  status: Status;
  usedTB?: number;
  totalTB?: number;
  url?: string;
};

export type BackupRetention = {
  k: string;
  v: number;
};

export type BackupExtra = {
  name: string;
  where: string;
  freq: string;
  keep: number | string;
  status: Status;
};

export type BackupHealthSensor = {
  id: string;
  value: string;
  ok: boolean;
};

export type Backups = {
  chain: BackupChainStep[];
  retention: BackupRetention[];
  extra: BackupExtra[];
  healthSensor: BackupHealthSensor;
};

export type TailscaleDerpOther = {
  name: string;
  ms: number;
};

export type TailscaleDerp = {
  primary: string;
  ms: number;
  others: TailscaleDerpOther[];
};

export type TailscaleNode = {
  ip: string;
  host: string;
  os: string;
  role: string;
  online: boolean;
  exit: boolean;
  pub?: string;
  lastSeen?: string;
};

export type Tailscale = {
  tailnet: string;
  derp: TailscaleDerp;
  nodes: TailscaleNode[];
};

export type BastionContainer = {
  name: string;
  image: string;
  status: string;
};

export type Bastion = {
  host: string;
  pubIp: string;
  tsIp: string;
  os: string;
  provider: string;
  uptime: string;
  load: [number, number, number];
  purpose: string[];
  containers: BastionContainer[];
  backup: string[];
};

export type AdGuardInstance = {
  id: string;
  name: string;
  host: string;
  version: string;
  port: number;
  url: string;
  login: string;
  status: Status;
};

export type AdGuardList = {
  name: string;
  active: boolean;
  lang?: string;
};

export type AdGuardRateLimit = {
  reqPerClient: number;
  subnetGroup: string;
};

export type AdGuard = {
  instances: AdGuardInstance[];
  blocklists: AdGuardList[];
  allowlists: AdGuardList[];
  cache: boolean;
  rateLimit: AdGuardRateLimit;
  queryRetention: number;
  statsRetention: number;
};

export type Camera = {
  id: string;
  name: string;
  status: "recording" | "idle" | string;
  location: string;
  type: string;
};

export type Vehicle = {
  id: string;
  title: string;
  type: string;
  vin: string | null;
  batteryPct: number;
  batteryKWh: number | null;
  rangeKm: number;
  odometer: number | null;
  locked: boolean | null;
  location: string | null;
  charge: string;
  integrations: string[];
  accent: string;
  notes: string;
  chargeTarget?: number;
  climatiseTargetC?: number;
  hvBattMinC?: number;
  hvBattMaxC?: number;
  serviceDaysLeft?: number;
};

export type EvStation = {
  side: string;
  kWh: number;
};

export type EvWallbox = {
  totalKwh: number;
  stations: EvStation[];
};

export type ZigbeeCoordinator = {
  model: string;
  link: string;
  ip: string;
  port: number;
  chipTempC: number;
};

export type ZigbeeZ2M = {
  version: string;
  ramMB: number;
  channel: string;
  txPowerDbm: number;
};

export type ZigbeeCategory = {
  key: string;
  name: string;
  count: number;
};

export type ZigbeeRoom = {
  name: string;
  count: number;
};

export type Zigbee = {
  coordinator: ZigbeeCoordinator;
  z2m: ZigbeeZ2M;
  total: number;
  categories: ZigbeeCategory[];
  rooms: ZigbeeRoom[];
};

export type HomelabData = {
  meta: HomelabMeta;
  hero: Hero;
  hardware: HardwareUnit[];
  vms: VM[];
  services: Service[];
  subdomains: string[];
  ups: Ups[];
  vlans: Vlan[];
  hassEntities: HassEntity[];
  projects: Project[];
  backups: Backups;
  tailscale: Tailscale;
  bastion: Bastion;
  adguard: AdGuard;
  cameras: Camera[];
  vehicles: Vehicle[];
  wallbox: EvWallbox;
  zigbee: Zigbee;
};
