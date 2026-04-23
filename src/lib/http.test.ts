import { describe, it, expect, afterEach, vi } from "vitest";
import { makeClient } from "./http";

describe("makeClient", () => {
  const originalTlsEnv = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

  afterEach(() => {
    if (originalTlsEnv === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsEnv;
    }
    vi.restoreAllMocks();
  });

  it("returns a ky-like instance with get/post methods", () => {
    const client = makeClient({ baseUrl: "https://example.test" });
    expect(typeof client.get).toBe("function");
    expect(typeof client.post).toBe("function");
    expect(typeof client.extend).toBe("function");
  });

  it("does NOT mutate NODE_TLS_REJECT_UNAUTHORIZED even when insecureTls is true", () => {
    // M3: TLS relaxation is scoped via per-instance undici dispatcher, not
    // via the process-wide env var. The global verifier must be untouched.
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    makeClient({ baseUrl: "https://example.test", insecureTls: true });
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
  });

  it("does not mutate NODE_TLS_REJECT_UNAUTHORIZED when insecureTls is false", () => {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    makeClient({ baseUrl: "https://example.test", insecureTls: false });
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
  });

  it("hits the configured baseUrl and forwards headers", async () => {
    const captured: { url?: string; headers?: Headers } = {};
    const fetchMock = vi.fn(async (input: Request | string | URL) => {
      const req = input as Request;
      captured.url = req.url ?? String(input);
      captured.headers = new Headers(req.headers);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = makeClient({
      baseUrl: "https://example.test",
      headers: { Authorization: "Bearer abc" },
      timeoutMs: 2000,
    });
    const body = await client.get("api/thing").json<{ ok: boolean }>();

    expect(body.ok).toBe(true);
    expect(captured.url).toContain("example.test/api/thing");
    expect(captured.headers?.get("authorization")).toBe("Bearer abc");
  });

  it("appends trailing slash to baseUrl if missing", async () => {
    const fetchMock = vi.fn(async (_input: Request | string | URL) => {
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = makeClient({ baseUrl: "https://example.test" });
    await client.get("api/thing").json();
    const req = fetchMock.mock.calls[0]![0] as Request;
    expect(req.url).toBe("https://example.test/api/thing");
  });
});
