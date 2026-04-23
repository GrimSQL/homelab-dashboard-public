import "server-only";

function opt(name: string, def = ""): string {
  return process.env[name] ?? def;
}

function optBool(name: string, def = false): boolean {
  const v = process.env[name];
  if (v === undefined) return def;
  return v === "true" || v === "1";
}

export const env = {
  ha: {
    baseUrl: opt("HA_BASE_URL", "http://10.0.0.12:8123"),
    token: opt("HA_TOKEN"),
  },
  pve: {
    baseUrl: opt("PVE_BASE_URL", "https://10.0.0.10:8006"),
    tokenId: opt("PVE_TOKEN_ID"),
    tokenSecret: opt("PVE_TOKEN_SECRET"),
    insecureTls: optBool("PVE_INSECURE_TLS", true),
  },
  portainer: {
    baseUrl: opt("PORTAINER_BASE_URL", "https://10.0.0.13:9443"),
    apiKey: opt("PORTAINER_API_KEY"),
    endpointId: Number(opt("PORTAINER_ENDPOINT_ID", "2")),
    insecureTls: optBool("PORTAINER_INSECURE_TLS", true),
  },
  cacheTtlSeconds: Number(opt("CACHE_TTL_SECONDS", "15")),
  auth: {
    secret: opt("AUTH_SECRET"),
    adminEmail: opt("ADMIN_EMAIL"),
    adminPassword: opt("ADMIN_PASSWORD"),
  },
  github: {
    token: opt("GITHUB_TOKEN"),
    owner: opt("GITHUB_SYNC_OWNER", "example-user"),
    syncIntervalMs: Number(opt("GITHUB_SYNC_INTERVAL_MS", String(60 * 60 * 1000))),
  },
};

export function isHaConfigured(): boolean {
  return env.ha.token.length > 0;
}

export function isGithubConfigured(): boolean {
  return env.github.token.length > 0;
}
