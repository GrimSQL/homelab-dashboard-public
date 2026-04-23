export type NavItem = { id: string; name: string; icon: string };
export type NavSection = { label: string; items: NavItem[]; adminOnly?: boolean };

export const NAV_SECTIONS: readonly NavSection[] = [
  { label: "Overview", items: [
    { id: "overview",  name: "Dashboard",       icon: "◇" },
    { id: "status",    name: "Status",          icon: "◎" },
  ]},
  { label: "Infrastructure", items: [
    { id: "rack",      name: "Rack",            icon: "▤" },
    { id: "services",  name: "Services",        icon: "◈" },
    { id: "network",   name: "Network",         icon: "⌇" },
    { id: "metrics",   name: "Metrics",         icon: "◊" },
  ]},
  { label: "Security & Backup", items: [
    { id: "backups",   name: "Backups",         icon: "⎘" },
    { id: "tailscale", name: "Tailscale",       icon: "⟐" },
    { id: "adguard",   name: "AdGuard DNS",     icon: "⊘" },
    { id: "bastion",   name: "Bastion",         icon: "☁" },
  ]},
  { label: "Home", items: [
    { id: "hass",      name: "Home Assistant",  icon: "⌂" },
    { id: "energy",    name: "Energy & UPS",    icon: "☀" },
    { id: "zigbee",    name: "Zigbee · 68",     icon: "⎔" },
  ]},
  { label: "Fleet", items: [
    { id: "cameras",   name: "Cameras",         icon: "◉" },
    { id: "vehicles",  name: "Vehicles",        icon: "⇆" },
  ]},
  { label: "Docs", items: [
    { id: "projects",  name: "Projects",        icon: "▦" },
  ]},
  { label: "System", items: [
    { id: "settings",  name: "Settings",        icon: "⚙" },
  ]},
  { label: "Admin", adminOnly: true, items: [
    { id: "admin-users",    name: "Users",    icon: "⎈" },
    { id: "admin-invites",  name: "Invites",  icon: "✉" },
    { id: "admin-projects", name: "Projects", icon: "▦" },
  ]},
];

export function navSectionsFor(role?: string): readonly NavSection[] {
  if (role === "admin") return NAV_SECTIONS;
  return NAV_SECTIONS.filter((s) => !s.adminOnly);
}

export const PAGE_LABELS: Record<string, string> = {
  overview: "Dashboard",
  status: "Status",
  rack: "Rack",
  services: "Services",
  network: "Network",
  metrics: "Metrics",
  backups: "Backups",
  tailscale: "Tailscale",
  adguard: "AdGuard DNS",
  bastion: "Bastion · Oracle Cloud",
  hass: "Home Assistant",
  energy: "Energy & UPS",
  zigbee: "Zigbee2MQTT",
  cameras: "Cameras · Frigate",
  vehicles: "Vehicles",
  projects: "Projects",
  settings: "Settings",
  "admin-users": "Admin · Users",
  "admin-invites": "Admin · Invites",
  "admin-projects": "Admin · Projects",
};

// Map nav item id → URL path. Overview is the root.
export function pathForNavId(id: string): string {
  if (id === "overview") return "/";
  if (id === "admin-users") return "/admin/users";
  if (id === "admin-invites") return "/admin/invites";
  if (id === "admin-projects") return "/admin/projects";
  return `/${id}`;
}

// Reverse: URL pathname → nav item id.
export function navIdFromPath(pathname: string): string {
  if (pathname === "/") return "overview";
  if (pathname.startsWith("/admin/users")) return "admin-users";
  if (pathname.startsWith("/admin/invites")) return "admin-invites";
  if (pathname.startsWith("/admin/projects")) return "admin-projects";
  return pathname.replace(/^\//, "").split("/")[0] || "overview";
}
