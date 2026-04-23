import "server-only";
import { env } from "@/lib/env";
import { makeClient } from "@/lib/http";
import type { HomelabData, Service, Status } from "@/lib/data/types";
import type { KyInstance } from "ky";

type DockerPort = {
  PrivatePort?: number;
  PublicPort?: number;
  Type?: string;
};

type DockerContainer = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports?: DockerPort[];
  Labels?: Record<string, string>;
};

type DockerStats = {
  cpu_stats?: {
    cpu_usage?: { total_usage?: number };
    system_cpu_usage?: number;
    online_cpus?: number;
  };
  precpu_stats?: {
    cpu_usage?: { total_usage?: number };
    system_cpu_usage?: number;
  };
  memory_stats?: {
    usage?: number;
  };
};

function mapState(state: string): Status {
  const s = state.toLowerCase();
  if (s === "running") return "ok";
  if (s === "exited" || s === "dead") return "err";
  if (s === "paused") return "warn";
  if (s === "restarting" || s === "created") return "warn";
  return "info";
}

function pickPort(ports: DockerPort[] | undefined): number {
  if (!ports || ports.length === 0) return 0;
  for (const p of ports) {
    if (typeof p.PublicPort === "number" && p.PublicPort > 0) return p.PublicPort;
  }
  for (const p of ports) {
    if (typeof p.PrivatePort === "number" && p.PrivatePort > 0) return p.PrivatePort;
  }
  return 0;
}

/**
 * Parse the Docker `Status` string ("Up 3 hours", "Up 5 days", etc.) into
 * a number of days. Returns 0 for non-running states.
 */
export function parseUptimeDays(status: string): number {
  if (!status.startsWith("Up ")) return 0;
  const m = status.match(/Up (\d+) (second|minute|hour|day|week|month)s?/);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2]!;
  const mult: Record<string, number> = {
    second: 1 / 86400,
    minute: 1 / 1440,
    hour: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
  };
  return n * (mult[unit] ?? 0);
}

/**
 * Compute CPU % and RAM MB from a Docker stats payload. Handles stopped /
 * missing payloads by returning zeros.
 */
export function computeStats(stats: DockerStats | null | undefined): { cpuPct: number; ramMB: number } {
  if (!stats) return { cpuPct: 0, ramMB: 0 };
  const cur = stats.cpu_stats?.cpu_usage?.total_usage ?? 0;
  const prev = stats.precpu_stats?.cpu_usage?.total_usage ?? 0;
  const sysCur = stats.cpu_stats?.system_cpu_usage ?? 0;
  const sysPrev = stats.precpu_stats?.system_cpu_usage ?? 0;
  const delta = cur - prev;
  const sysDelta = sysCur - sysPrev;
  const onlineCpus = stats.cpu_stats?.online_cpus ?? 1;
  const cpuPct = sysDelta > 0 && delta > 0 ? (delta / sysDelta) * onlineCpus * 100 : 0;
  const ramMB = Math.round((stats.memory_stats?.usage ?? 0) / (1024 * 1024));
  return { cpuPct, ramMB };
}

export function mapContainersToServices(containers: DockerContainer[]): Service[] {
  const services: Service[] = [];
  for (const c of containers) {
    const rawName = c.Names?.[0] ?? "";
    const name = rawName.replace(/^\//, "");
    if (!name) continue;

    const stack = c.Labels?.["com.docker.compose.project"];
    const service: Service = {
      name,
      host: "docker",
      cat: stack ? stack : "docker",
      port: pickPort(c.Ports),
      ram: 0,
      status: mapState(c.State),
      uptime: parseUptimeDays(c.Status),
    };
    services.push(service);
  }
  services.sort((a, b) => a.name.localeCompare(b.name));
  return services;
}

/**
 * Simple concurrency-limited promise pool. Runs `worker(item)` for each item
 * in `items`, with at most `limit` in flight at any time. Individual failures
 * are swallowed (worker receives error responsibility) — the caller passes a
 * worker that already handles its own errors.
 */
async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers: Promise<void>[] = [];
  const n = Math.max(1, Math.min(limit, items.length));
  for (let w = 0; w < n; w++) {
    workers.push((async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await worker(items[i]!);
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

async function fetchContainerStats(client: KyInstance, endpointId: number | string, id: string): Promise<DockerStats | null> {
  try {
    return await client
      .get(`api/endpoints/${endpointId}/docker/containers/${id}/stats?stream=false`, { timeout: 6000 })
      .json<DockerStats>();
  } catch {
    return null;
  }
}

export async function fetchPortainerSlice(): Promise<Partial<HomelabData>> {
  if (!env.portainer.apiKey) throw new Error("PORTAINER_API_KEY not configured");
  const client = makeClient({
    baseUrl: env.portainer.baseUrl,
    headers: { "X-API-Key": env.portainer.apiKey },
    insecureTls: env.portainer.insecureTls,
    timeoutMs: 8000,
  });

  const containers = await client
    .get(`api/endpoints/${env.portainer.endpointId}/docker/containers/json?all=true`)
    .json<DockerContainer[]>();

  // Per-container stats (RAM + CPU). Only call for running containers — stopped
  // ones return useless zeros and stall request budget. Concurrency capped at 8.
  const runningIds = containers.filter(c => c.State === "running").map(c => c.Id);
  const statsById = new Map<string, DockerStats | null>();
  await pool(runningIds, 8, async (id) => {
    const s = await fetchContainerStats(client, env.portainer.endpointId, id);
    statsById.set(id, s);
    return s;
  });

  const services = mapContainersToServices(containers);
  // Re-attach RAM from stats by matching container name → service name.
  const ramByName = new Map<string, number>();
  for (const c of containers) {
    const rawName = c.Names?.[0] ?? "";
    const name = rawName.replace(/^\//, "");
    if (!name) continue;
    const stats = statsById.get(c.Id) ?? null;
    const { ramMB } = computeStats(stats);
    ramByName.set(name, ramMB);
  }
  for (const svc of services) {
    const ram = ramByName.get(svc.name);
    if (typeof ram === "number") svc.ram = ram;
  }

  return { services };
}
