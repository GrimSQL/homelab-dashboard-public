import { describe, it, expect } from "vitest";
import { mapContainersToServices } from "./portainer";

type DockerPortLike = { PrivatePort?: number; PublicPort?: number; Type?: string };
type DockerContainerLike = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: DockerPortLike[];
  Labels: Record<string, string>;
};

const container = (overrides: Partial<DockerContainerLike>): DockerContainerLike => ({
  Id: "abc",
  Names: ["/demo"],
  Image: "lib/demo:latest",
  State: "running",
  Status: "Up 2 hours",
  Ports: [],
  Labels: {},
  ...overrides,
});

describe("mapContainersToServices", () => {
  it("strips leading slash from container names", () => {
    const [svc] = mapContainersToServices([
      container({ Names: ["/sonarr"] }),
    ]);
    expect(svc?.name).toBe("sonarr");
  });

  it("maps running/exited/paused states to ok/err/warn", () => {
    const svcs = mapContainersToServices([
      container({ Names: ["/a"], State: "running" }),
      container({ Names: ["/b"], State: "exited" }),
      container({ Names: ["/c"], State: "paused" }),
      container({ Names: ["/d"], State: "dead" }),
    ]);
    const byName = Object.fromEntries(svcs.map((s) => [s.name, s.status]));
    expect(byName.a).toBe("ok");
    expect(byName.b).toBe("err");
    expect(byName.c).toBe("warn");
    expect(byName.d).toBe("err");
  });

  it("uses com.docker.compose.project label as the category", () => {
    const [svc] = mapContainersToServices([
      container({ Names: ["/frigate"], Labels: { "com.docker.compose.project": "home-nvr" } }),
    ]);
    expect(svc?.cat).toBe("home-nvr");
  });

  it("falls back to 'docker' category when no compose label", () => {
    const [svc] = mapContainersToServices([
      container({ Names: ["/orphan"], Labels: {} }),
    ]);
    expect(svc?.cat).toBe("docker");
  });

  it("picks a public port when available, private otherwise, 0 for none", () => {
    const svcs = mapContainersToServices([
      container({ Names: ["/pub"], Ports: [{ PrivatePort: 80, PublicPort: 8080, Type: "tcp" }] }),
      container({ Names: ["/priv"], Ports: [{ PrivatePort: 5432, Type: "tcp" }] }),
      container({ Names: ["/none"], Ports: [] }),
    ]);
    const byName = Object.fromEntries(svcs.map((s) => [s.name, s.port]));
    expect(byName.pub).toBe(8080);
    expect(byName.priv).toBe(5432);
    expect(byName.none).toBe(0);
  });

  it("sorts results alphabetically", () => {
    const svcs = mapContainersToServices([
      container({ Names: ["/zulu"] }),
      container({ Names: ["/alpha"] }),
      container({ Names: ["/mike"] }),
    ]);
    expect(svcs.map((s) => s.name)).toEqual(["alpha", "mike", "zulu"]);
  });

  it("drops containers with no usable name", () => {
    const svcs = mapContainersToServices([
      container({ Names: [] }),
      container({ Names: ["/"] }),
    ]);
    expect(svcs).toEqual([]);
  });

  it("produces Service objects shaped for HomelabData", () => {
    const [svc] = mapContainersToServices([container({})]);
    expect(svc).toMatchObject({
      name: expect.any(String),
      host: expect.any(String),
      cat: expect.any(String),
      port: expect.any(Number),
      ram: expect.any(Number),
      status: expect.stringMatching(/^(ok|warn|err|deg|info)$/),
      uptime: expect.any(Number),
    });
  });
});
