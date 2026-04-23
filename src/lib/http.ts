import "server-only";
import ky, { type KyInstance } from "ky";
import { Agent } from "undici";

/**
 * Factory for building a ky instance configured for a particular upstream.
 *
 * TLS scoping:
 *   When `insecureTls: true`, a per-instance undici Agent with
 *   `rejectUnauthorized: false` is installed as the dispatcher for this ky
 *   client only. The global Node TLS verifier (which protects every other
 *   outbound fetch in the process) is not touched. This lets us talk to
 *   Proxmox and Portainer with their self-signed certs while still rejecting
 *   bad certs for anything else (e.g. external HTTPS calls).
 */
export type MakeClientOptions = {
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  insecureTls?: boolean;
};

// Lazily build a single insecure Agent per makeClient() call. An Agent holds
// a pool of sockets, so reusing it inside a ky instance across multiple
// requests is preferable to making a new one for each request.
function buildInsecureFetch(): typeof fetch {
  const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  // Undici's fetch is the global fetch in modern Node; RequestInit isn't
  // typed with `dispatcher` in lib.dom, so we extend via intersection.
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      // @ts-expect-error — undici extension, not in DOM RequestInit types
      dispatcher,
    });
  }) as typeof fetch;
}

export function makeClient(opts: MakeClientOptions): KyInstance {
  const baseUrl = opts.baseUrl.endsWith("/") ? opts.baseUrl : `${opts.baseUrl}/`;
  return ky.create({
    baseUrl,
    timeout: opts.timeoutMs ?? 8000,
    retry: { limit: 2, methods: ["get"] },
    headers: opts.headers,
    // Only override fetch when insecureTls is requested. Using a custom fetch
    // that injects an undici Agent is the canonical way to scope TLS relaxation
    // in ky v2 (which doesn't expose a TLS option directly).
    fetch: opts.insecureTls ? buildInsecureFetch() : undefined,
  });
}
