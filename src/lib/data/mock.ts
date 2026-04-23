// Demo inventory for the homelab-dashboard showcase.
// All values are synthetic. Replace with your own data if you fork this.
import type { HomelabData } from "./types";

export const MOCK_HOMELAB: HomelabData = {
  meta: {
    title: "homelab.example.com",
    tagline: "Running a data center from the laundry room",
    owner: "Admin",
    location: "Example Street 1",
    publicIp: "203.0.113.10",
    isp: "Example ISP · 1 Gbit/s fiber",
    uptimeSinceISO: "2025-08-24T00:00:00Z",
    generatedAt: "2026-04-18T16:20:00Z",
  },

  hero: {
    containers: 53,
    vms: 4,
    addons: 15,
    subdomains: 41,
    rawTB: 36,
    usableTB: 18,
    lifetimeKWh: 66088,
    evKWh: 20450,
    nutUptimeDays: 237,
    monthlyCost: 112.40,
    currency: "$",
  },

  hardware: [
    { id: "udm",    rack: "laundry-room", slot: 1, u: 1, name: "UDM-Pro",       role: "Router/firewall + Protect",                          cpu: "ARM64 4-core", ram: "3.9 GB", disk: "eMMC + 2.5\" HDD", temp: 67, power: 38,  status: "warn", uptimeDays: 28, note: "RAM tight" },
    { id: "sw16",   rack: "laundry-room", slot: 2, u: 1, name: "USW-16-PoE",    role: "UniFi switch · 10 GbE uplink",                       cpu: "—", ram: "—", disk: "—", temp: 42, power: 54,  status: "ok",   uptimeDays: 28 },
    { id: "ups-mon",rack: "laundry-room", slot: 3, u: 1, name: "ups-monitor",   role: "Raspberry Pi 4B · NUT server for UDM",               cpu: "BCM2711 4-core", ram: "4 GB", disk: "32 GB SD", temp: 48, power: 4, status: "ok", uptimeDays: 237, note: "King of uptime" },
    { id: "ups2",   rack: "laundry-room", slot: 4, u: 2, name: "UPS Laundry",   role: "APC Back-UPS · protects UDM only",                    cpu: "—", ram: "—", disk: "—", temp: 32, power: 97,  status: "ok",   uptimeDays: 412, note: "Load 13 %, battery 97 %" },
    { id: "pve",    rack: "garage",       slot: 1, u: 2, name: "PVE Server",    role: "Proxmox hypervisor",                                 cpu: "x86 14c/20t", ram: "62 GB DDR5", disk: "1 TB NVMe", temp: 45, power: 84, status: "ok", uptimeDays: 6, note: "Swap tight" },
    { id: "nas",    rack: "garage",       slot: 3, u: 2, name: "NAS Primary",   role: "NAS · 2×18 TB mirror + NVMe cache",                  cpu: "Ryzen 4-core", ram: "19 GB", disk: "2×18 TB + 400 GB cache", temp: 39, power: 62, status: "ok", uptimeDays: 4, note: "9.4 / 16 TB used" },
    { id: "apg",    rack: "garage",       slot: 5, u: 1, name: "AP Garage",     role: "UniFi AP · Wi-Fi 7 ceiling",                         cpu: "—", ram: "—", disk: "—", temp: 40, power: 9,   status: "ok",   uptimeDays: 28 },
    { id: "swlg",   rack: "garage",       slot: 6, u: 1, name: "USW-Lite-8-PoE", role: "UniFi switch · garage uplink",                       cpu: "—", ram: "—", disk: "—", temp: 41, power: 15,  status: "ok",   uptimeDays: 28 },
    { id: "ups1",   rack: "garage",       slot: 7, u: 2, name: "UPS Garage",    role: "APC Back-UPS · protects PVE + NAS",                  cpu: "—", ram: "—", disk: "—", temp: 34, power: 184, status: "ok",   uptimeDays: 412, note: "Load 29 %, battery 100 %" },
  ],

  vms: [
    { vmid: 100, name: "ha-vm",          kind: "VM",  status: "running", ram: "8 GB",  disk: "50 GB"  },
    { vmid: 101, name: "docker-lxc",     kind: "LXC", status: "running", ram: "20 GB", disk: "400 GB" },
    { vmid: 104, name: "pbs-vm",         kind: "VM",  status: "running", ram: "8 GB",  disk: "32 GB"  },
    { vmid: 110, name: "app-vm",         kind: "VM",  status: "running", ram: "16 GB", disk: "100 GB" },
    { vmid: 102, name: "ubuntu-server",  kind: "VM",  status: "stopped", ram: "8 GB",  disk: "100 GB" },
    { vmid: 111, name: "minecraft-vm",   kind: "VM",  status: "stopped", ram: "8 GB",  disk: "100 GB" },
    { vmid: 113, name: "kali-vm",        kind: "VM",  status: "stopped", ram: "8 GB",  disk: "30 GB"  },
  ],

  services: [
    // Media – *arr
    { name: "sonarr",       host: "docker-lxc", cat: "media-arr", port: 8989, ram: 165, status: "ok",   uptime: 99.98, url: "sonarr" },
    { name: "radarr",       host: "docker-lxc", cat: "media-arr", port: 7878, ram: 136, status: "ok",   uptime: 99.97, url: "radarr" },
    { name: "lidarr",       host: "docker-lxc", cat: "media-arr", port: 8686, ram: 202, status: "ok",   uptime: 99.92, url: "lidarr" },
    { name: "bazarr",       host: "docker-lxc", cat: "media-arr", port: 6767, ram: 124, status: "ok",   uptime: 99.91, url: "bazarr" },
    { name: "prowlarr",     host: "docker-lxc", cat: "media-arr", port: 9696, ram: 299, status: "ok",   uptime: 99.90, url: "prowlarr" },
    { name: "qbittorrent",  host: "docker-lxc", cat: "media-arr", port: 8080, ram: 468, status: "ok",   uptime: 99.84, url: "qbittorrent" },
    { name: "gluetun",      host: "docker-lxc", cat: "media-arr", port: 8080, ram: 103, status: "ok",   uptime: 99.98 },
    // Media servers
    { name: "plex",         host: "docker-lxc", cat: "media",     port: 32400, ram: 26,  status: "ok",  uptime: 99.92, url: "plex" },
    { name: "jellyfin",     host: "docker-lxc", cat: "media",     port: 8097,  ram: 547, status: "ok",  uptime: 99.88, url: "jellyfin" },
    { name: "jellyseerr",   host: "docker-lxc", cat: "media",     port: 5055,  ram: 168, status: "ok",  uptime: 99.95, url: "jellyseerr" },
    // Photo & AI
    { name: "immich",       host: "docker-lxc", cat: "photo-ai",  port: 2283,  ram: 303, status: "ok",  uptime: 99.94 },
    { name: "ollama",       host: "docker-lxc", cat: "photo-ai",  port: 11434, ram: 12,  status: "ok",  uptime: 99.90 },
    { name: "open-webui",   host: "docker-lxc", cat: "photo-ai",  port: 3888,  ram: 43,  status: "ok",  uptime: 99.92 },
    // Home / NVR
    { name: "frigate",      host: "docker-lxc", cat: "home",      port: 5000,  ram: 1660,status: "warn",uptime: 99.77, url: "frigate", note: "21.8 % CPU" },
    // Proxy & network
    { name: "traefik",      host: "docker-lxc", cat: "network",   port: 443,   ram: 104, status: "ok",  uptime: 99.99, url: "traefik" },
    { name: "adguard",      host: "docker-lxc", cat: "network",   port: 53,    ram: 120, status: "ok",  uptime: 99.99, url: "adguard" },
    { name: "cloudflared",  host: "docker-lxc", cat: "network",   port: 0,     ram: 24,  status: "ok",  uptime: 99.98 },
    // Monitoring
    { name: "portainer",    host: "docker-lxc", cat: "monitor",   port: 9443,  ram: 29,  status: "ok",  uptime: 99.99, url: "portainer" },
    { name: "uptime-kuma",  host: "docker-lxc", cat: "monitor",   port: 3696,  ram: 150, status: "ok",  uptime: 99.97, url: "uptime" },
    { name: "watchtower",   host: "docker-lxc", cat: "monitor",   port: 0,     ram: 11,  status: "ok",  uptime: 99.96 },
    // HA addons
    { name: "Home Assistant Core", host: "ha-vm", cat: "home", port: 8123, ram: 720, status: "ok", uptime: 99.95 },
    { name: "Zigbee2MQTT",         host: "ha-vm", cat: "home", port: 8080, ram: 106, status: "ok", uptime: 99.97 },
    { name: "Node-RED",            host: "ha-vm", cat: "home", port: 1880, ram: 282, status: "ok", uptime: 99.94 },
    { name: "Mosquitto broker",    host: "ha-vm", cat: "home", port: 1883, ram: 20,  status: "ok", uptime: 99.98 },
  ],

  subdomains: [
    "adguard","bazarr","docker","emby","frigate","homarr","huntarr",
    "jellyfin","jellyseerr","lidarr","navidrome","plex","portainer","prowlarr",
    "proxmox","proxmoxbackup","qbittorrent","radarr","readarr","sabnzbd","sonarr",
    "speedtest","traefik","uptime","app1","app2",
  ],

  ups: [
    { id: "ups-garage", name: "UPS Garage",  model: "APC Back-UPS", load: 29, battery: 100, volt: 226, status: "Online", protects: ["PVE Server","NAS Primary"] },
    { id: "ups-tvatt",  name: "UPS Laundry", model: "APC Back-UPS", load: 13, battery: 97,  volt: 232, status: "Online", protects: ["UDM"] },
  ],

  vlans: [
    { id: "native", subnet: "10.0.0.0/24",  name: "Infrastructure", note: "Router, switches, APs" },
    { id: 10,       subnet: "10.0.10.0/24", name: "Main Wi-Fi",     note: "Primary client Wi-Fi" },
    { id: 20,       subnet: "10.0.20.0/24", name: "Secured",        note: "Alarm, locks" },
    { id: 30,       subnet: "10.0.30.0/24", name: "IoT",            note: "Smart-home devices" },
    { id: 40,       subnet: "10.0.40.0/24", name: "Surveillance",   note: "Cameras" },
    { id: 50,       subnet: "10.0.50.0/24", name: "Servers",        note: "Server segment" },
    { id: 60,       subnet: "10.0.60.0/24", name: "Guest Wi-Fi",    note: "Guest" },
    { id: 70,       subnet: "10.0.70.0/24", name: "VPN",            note: "Remote-user VPN" },
  ],

  hassEntities: [
    // Temp — indoor
    { id: "sensor.thermometer_living_room_temperature", name: "Living room", unit: "°C", value: 23.6, kind: "temp-indoor" },
    { id: "sensor.thermometer_bedroom_temperature",     name: "Bedroom",     unit: "°C", value: 22.5, kind: "temp-indoor" },
    { id: "sensor.thermometer_kitchen_temperature",     name: "Kitchen",     unit: "°C", value: 22.3, kind: "temp-indoor" },
    { id: "sensor.thermometer_office_temperature",      name: "Office",      unit: "°C", value: 23.3, kind: "temp-indoor" },
    { id: "sensor.thermometer_freezer_temperature",     name: "Freezer",     unit: "°C", value: -13.9, kind: "temp-indoor" },
    // Temp — hardware
    { id: "sensor.thermometer_server_cabinet_temperature", name: "Server cabinet", unit: "°C", value: 28.9, kind: "temp-hw" },
    { id: "sensor.thermometer_garage_temperature",         name: "Garage",         unit: "°C", value: 17.4, kind: "temp-hw" },
    { id: "sensor.thermometer_laundry_temperature",        name: "Laundry room",   unit: "°C", value: 24.6, kind: "temp-hw" },
    { id: "sensor.thermometer_outdoor_temperature",        name: "Outdoor",        unit: "°C", value: 8.9,  kind: "temp-hw" },
    // Disk
    { id: "sensor.nas_drive_1_temperature",     name: "HDD #1",     unit: "°C", value: 30, kind: "disk", meta: "14 154 h" },
    { id: "sensor.nas_drive_2_temperature",     name: "HDD #2",     unit: "°C", value: 32, kind: "disk", meta: "mirror" },
    { id: "sensor.nas_m2_cache_temperature",    name: "M.2 cache",  unit: "°C", value: 29, kind: "disk", meta: "400 GB" },
    { id: "sensor.pve_nvme_temperature",        name: "PVE NVMe",   unit: "°C", value: 41, kind: "disk", meta: "3 % wear" },
    // Power
    { id: "sensor.power_meter_house_power",         name: "Whole house",   unit: "W",   value: 4361, kind: "power-main" },
    { id: "sensor.power_meter_house_average_power", name: "Average today", unit: "W",   value: 4526, kind: "power" },
    { id: "sensor.power_meter_house_max_power",     name: "Peak today",    unit: "W",   value: 4673, kind: "power" },
    { id: "sensor.outdoor_lights_front_power",      name: "Garage cluster",unit: "W",   value: 184,  kind: "power" },
    { id: "sensor.desktop_pc_power",                name: "Desktop PC",    unit: "W",   value: 178,  kind: "power" },
    { id: "sensor.house_monthly_cost",              name: "Monthly cost",  unit: "$",   value: 112.40, kind: "power" },
    { id: "sensor.ev_charger_total_energy_kwh",     name: "EV total",      unit: "kWh", value: 9942, kind: "power" },
    // Contacts
    { id: "binary_sensor.magnet_garage_door_contact", name: "Garage door", unit: "", value: "closed", kind: "door" },
    { id: "binary_sensor.magnet_storage_contact",     name: "Storage",     unit: "", value: "closed", kind: "door" },
  ],

  projects: [],

  backups: {
    chain: [
      { step: 1, name: "Production",      node: "Proxmox VMs + Docker LXC", role: "Live workload",          schedule: "—",       status: "ok"  },
      { step: 2, name: "PBS (local)",     node: "VM 104 · pbs-local",       role: "Daily snapshot",         schedule: "daily",   status: "ok", usedTB: 9.0, totalTB: 16, url: "proxmoxbackup" },
      { step: 3, name: "PBS (offsite)",   node: "NAS Offsite",              role: "Pull replication",       schedule: "daily",   status: "ok" },
      { step: 4, name: "NAS Hyper",       node: "NAS Primary -> Offsite",   role: "File-level backup",      schedule: "nightly", status: "ok" },
      { step: 5, name: "Cloud backup",    node: "HA addon",                 role: "Off-site config backup", schedule: "daily",   status: "ok" },
    ],
    retention: [
      { k: "Last",    v: 3  },
      { k: "Hourly",  v: 24 },
      { k: "Daily",   v: 7  },
      { k: "Weekly",  v: 4  },
      { k: "Monthly", v: 6  },
      { k: "Yearly",  v: 2  },
    ],
    extra: [
      { name: "project-x-backup",  where: "/opt/backups/project-x/",    freq: "6 h",   keep: 14, status: "ok" },
      { name: "bastion-backup.sh", where: "Cloud VM -> local",          freq: "daily", keep: 14, status: "ok" },
    ],
    healthSensor: { id: "binary_sensor.backups_stale", value: "off", ok: true },
  },

  tailscale: {
    tailnet: "example-user@",
    derp: { primary: "Helsinki", ms: 21.1, others: [ { name: "Amsterdam", ms: 26.5 }, { name: "Frankfurt", ms: 26.8 } ] },
    nodes: [
      { ip: "100.64.0.10", host: "pve-server",   os: "Linux",   role: "Primary hypervisor",   online: true,  exit: false },
      { ip: "100.64.0.11", host: "pbs-local",    os: "Linux",   role: "Local PBS VM (104)",   online: true,  exit: false },
      { ip: "100.64.0.12", host: "pbs-offsite",  os: "Linux",   role: "Offsite PBS",           online: true,  exit: false },
      { ip: "100.64.0.13", host: "nas-primary",  os: "Linux",   role: "Primary NAS",           online: true,  exit: true  },
      { ip: "100.64.0.14", host: "nas-offsite",  os: "Linux",   role: "Offsite NAS",           online: true,  exit: false },
      { ip: "100.64.0.15", host: "bastion",      os: "Linux",   role: "Cloud jump host",       online: true,  exit: true, pub: "203.0.113.20" },
      { ip: "100.64.0.16", host: "ha",           os: "Linux",   role: "HA OS",                  online: true,  exit: true  },
      { ip: "100.64.0.17", host: "ups-monitor",  os: "Linux",   role: "RPi 4B · NUT server",    online: true,  exit: true  },
      { ip: "100.64.0.18", host: "app-vm",       os: "Windows", role: "App VM",                 online: true,  exit: false },
      { ip: "100.64.0.19", host: "docker-lxc",   os: "Linux",   role: "Docker LXC 101",         online: true,  exit: false },
      { ip: "100.64.0.20", host: "tablet-1",     os: "iOS",     role: "User tablet",            online: true,  exit: false },
      { ip: "100.64.0.21", host: "phone-1",      os: "iOS",     role: "Admin phone",            online: false, exit: false, lastSeen: "15 d" },
      { ip: "100.64.0.22", host: "desktop-1",    os: "Windows", role: "Desktop",                online: false, exit: false, lastSeen: "3 d" },
      { ip: "100.64.0.23", host: "guest-node-1", os: "Windows", role: "Guest node",             online: false, exit: false, lastSeen: "3 d" },
    ],
  },

  bastion: {
    host: "bastion",
    pubIp: "203.0.113.20",
    tsIp: "100.64.0.15",
    os: "Ubuntu 24.04 LTS",
    provider: "Cloud Free Tier · ARM",
    uptime: "5 d 12 h",
    load: [1.00, 0.76, 0.71],
    purpose: [
      "External Uptime Kuma (independent observability)",
      "SSH jump host fallback if Tailscale drops",
      "Tailscale exit node",
    ],
    containers: [
      { name: "uptime-kuma", image: "louislam/uptime-kuma:1", status: "Up 5d healthy" },
    ],
    backup: ["bastion-backup.sh", "bastion-disk-guard.sh"],
  },

  adguard: {
    instances: [
      { id: "primary", name: "AdGuard (primary)", host: "docker-lxc", version: "v0.107.71", port: 3011, url: "adguard",        login: "admin", status: "ok" },
      { id: "backup",  name: "AdGuard (backup)",  host: "nas-primary", version: "v0.107.71", port: 3000, url: "adguard-backup", login: "admin", status: "ok" },
    ],
    blocklists: [
      { name: "AdGuard DNS filter",      active: true, lang: "global" },
      { name: "HaGeZi's Normal Blocklist", active: true, lang: "global" },
      { name: "Smart-TV (tracking)",     active: true, lang: "global" },
      { name: "AdAway Default Blocklist", active: false, lang: "global" },
    ],
    allowlists: [
      { name: "HaGeZi's Allowlist 1", active: true },
      { name: "HaGeZi's Allowlist 2", active: true },
    ],
    cache: true,
    rateLimit: { reqPerClient: 20, subnetGroup: "/24" },
    queryRetention: 90,
    statsRetention: 24,
  },

  cameras: [
    { id: "cam-driveway", name: "Driveway Cam", status: "recording", location: "Outdoor · driveway", type: "4K · object detect" },
    { id: "cam-a",        name: "Cam A",         status: "recording", location: "Indoor",             type: "Indoor · privacy-gated" },
    { id: "cam-b",        name: "Cam B",         status: "recording", location: "Indoor",             type: "Indoor · privacy-gated" },
  ],

  vehicles: [
    {
      id: "phev", title: "Hybrid Sedan (2023)", type: "PHEV", vin: null,
      batteryPct: 100, batteryKWh: 18.819,
      rangeKm: 62, odometer: null,
      locked: true, location: "home",
      charge: "Done · Connected",
      integrations: ["OEM app (native)", "Vehicle2Mqtt"],
      accent: "oklch(0.72 0.13 235)",
      notes: "56+ HA entities · 5 min update interval",
    },
    {
      id: "ev", title: "Compact EV", type: "BEV", vin: null,
      batteryPct: 53, batteryKWh: null,
      rangeKm: 193, odometer: 53633,
      locked: null, location: null,
      charge: "Not ready · unplugged",
      chargeTarget: 80, climatiseTargetC: 22.0, hvBattMinC: 10, hvBattMaxC: 11,
      serviceDaysLeft: 237,
      integrations: ["OEM EV app"],
      accent: "oklch(0.75 0.14 145)",
      notes: "75+ HA entities · daily driver",
    },
  ],

  wallbox: {
    totalKwh: 20450.4,
    stations: [
      { side: "Left",  kWh: 9941.9 },
      { side: "Right", kWh: 10508.5 },
    ],
  },

  zigbee: {
    coordinator: { model: "SLZB-06", link: "Ethernet", ip: "10.0.0.28", port: 6638, chipTempC: 84 },
    z2m: { version: "2.9.2-1", ramMB: 106, channel: "default", txPowerDbm: 20 },
    total: 68,
    categories: [
      { key: "lights",   name: "Lights",            count: 16 },
      { key: "curtains", name: "Curtains",          count: 8  },
      { key: "temps",    name: "Thermometers",      count: 12 },
      { key: "leaks",    name: "Water leak",        count: 4  },
      { key: "smoke",    name: "Smoke alarms",      count: 2  },
      { key: "motion",   name: "Motion / presence", count: 3  },
      { key: "buttons",  name: "Buttons / switches", count: 7  },
      { key: "contacts", name: "Magnet contacts",   count: 2  },
      { key: "plants",   name: "Plant sensors",     count: 2  },
      { key: "utility",  name: "Garage / utility",  count: 4  },
    ],
    rooms: [
      { name: "Outdoor",      count: 6 },
      { name: "Bedroom",      count: 8 },
      { name: "Kitchen",      count: 9 },
      { name: "Garage",       count: 7 },
      { name: "Family room",  count: 5 },
      { name: "Kids room",    count: 5 },
      { name: "Laundry",      count: 5 },
      { name: "Office",       count: 4 },
      { name: "Sewing nook",  count: 3 },
      { name: "Hall",         count: 4 },
      { name: "Living room",  count: 4 },
      { name: "Storage",      count: 1 },
      { name: "Server cab.",  count: 1 },
    ],
  },
};

const _typeCheck: HomelabData = MOCK_HOMELAB;
void _typeCheck;
