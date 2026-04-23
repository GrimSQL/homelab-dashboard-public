import "server-only";
import { env } from "@/lib/env";
import { makeClient } from "@/lib/http";
import { MOCK_HOMELAB } from "@/lib/data/mock";
import type { HardwareUnit, HomelabData, Status, VM } from "@/lib/data/types";

type PveNode = {
  node: string;
  uptime?: number;
  cpu?: number;
  mem?: number;
  maxmem?: number;
  maxcpu?: number;
  status?: string;
};

type PveNodesResp = { data: PveNode[] };

type PveResource = {
  id?: string;
  vmid?: number;
  name?: string;
  status?: string;
  type?: string;
  node?: string;
  maxmem?: number;
  maxdisk?: number;
};

type PveResourcesResp = { data: PveResource[] };

function formatGB(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const gb = bytes / (1024 ** 3);
  if (gb >= 1000) return `${(gb / 1024).toFixed(1)} TB`;
  return `${Math.round(gb)} GB`;
}

function pveStatus(status: string | undefined): Status {
  if (status === "online" || status === "running") return "ok";
  if (status === "offline" || status === "stopped") return "err";
  return "warn";
}

/**
 * Merge the live Proxmox node snapshot into the static rack-layout entry.
 * Only the `pve` hardware row is updated — other rack rows stay as mock.
 */
export function mergePveNode(base: HardwareUnit[], node: PveNode): HardwareUnit[] {
  const ramTotalGb = node.maxmem ? Math.round(node.maxmem / 1024 ** 3) : undefined;
  const uptimeDays = node.uptime ? Math.floor(node.uptime / 86400) : undefined;

  return base.map((unit) => {
    if (unit.id !== "pve") return unit;
    return {
      ...unit,
      ram: ramTotalGb ? `${ramTotalGb} GB DDR5` : unit.ram,
      uptimeDays: uptimeDays ?? unit.uptimeDays,
      status: pveStatus(node.status),
    };
  });
}

export function mapResourcesToVms(resources: PveResource[]): VM[] {
  const vms: VM[] = [];
  for (const r of resources) {
    if (r.type !== "qemu" && r.type !== "lxc") continue;
    if (typeof r.vmid !== "number") continue;
    const kind: VM["kind"] = r.type === "qemu" ? "VM" : "LXC";
    const status: VM["status"] = r.status === "running" ? "running" : "stopped";
    vms.push({
      vmid: r.vmid,
      name: r.name ?? `vmid-${r.vmid}`,
      kind,
      status,
      ram: formatGB(r.maxmem),
      disk: formatGB(r.maxdisk),
    });
  }
  // Stable ordering: running first, then by vmid
  vms.sort((a, b) => {
    if (a.status !== b.status) return a.status === "running" ? -1 : 1;
    return a.vmid - b.vmid;
  });
  return vms;
}

export async function fetchPveSlice(): Promise<Partial<HomelabData>> {
  if (!env.pve.tokenSecret) throw new Error("PVE_TOKEN_SECRET not configured");
  const client = makeClient({
    baseUrl: env.pve.baseUrl,
    headers: {
      Authorization: `PVEAPIToken=${env.pve.tokenId}=${env.pve.tokenSecret}`,
    },
    insecureTls: env.pve.insecureTls,
    timeoutMs: 5000,
  });

  const [nodesResp, resourcesResp] = await Promise.all([
    client.get("api2/json/nodes").json<PveNodesResp>(),
    client.get("api2/json/cluster/resources?type=vm").json<PveResourcesResp>(),
  ]);

  const nodes = nodesResp.data ?? [];
  const primary = nodes[0];
  const hardware = primary
    ? mergePveNode(MOCK_HOMELAB.hardware, primary)
    : MOCK_HOMELAB.hardware;

  const vms = mapResourcesToVms(resourcesResp.data ?? []);

  return { hardware, vms };
}
