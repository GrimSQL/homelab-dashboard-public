import { describe, it, expect } from "vitest";
import { mapResourcesToVms, mergePveNode } from "./pve";
import { MOCK_HOMELAB } from "@/lib/data/mock";

describe("mergePveNode", () => {
  it("overwrites only the pve entry and preserves other rack rows", () => {
    const out = mergePveNode(MOCK_HOMELAB.hardware, {
      node: "pve-server",
      uptime: 604800, // exactly 7 days
      cpu: 0.08,
      mem: 21_474_836_480, // 20 GB
      maxmem: 68_719_476_736, // 64 GB
      status: "online",
    });

    const pve = out.find((h) => h.id === "pve")!;
    expect(pve.uptimeDays).toBe(7);
    expect(pve.status).toBe("ok");
    expect(pve.ram).toMatch(/64 GB/);

    // Other hardware rows untouched
    const nas = out.find((h) => h.id === "nas")!;
    expect(nas).toEqual(MOCK_HOMELAB.hardware.find((h) => h.id === "nas"));
  });

  it("marks pve as err when node status is offline", () => {
    const out = mergePveNode(MOCK_HOMELAB.hardware, {
      node: "pve-server",
      status: "offline",
    });
    const pve = out.find((h) => h.id === "pve")!;
    expect(pve.status).toBe("err");
  });

  it("leaves uptime alone when the node payload omits it", () => {
    const original = MOCK_HOMELAB.hardware.find((h) => h.id === "pve")!;
    const out = mergePveNode(MOCK_HOMELAB.hardware, {
      node: "pve-server",
      status: "online",
    });
    const pve = out.find((h) => h.id === "pve")!;
    expect(pve.uptimeDays).toBe(original.uptimeDays);
  });
});

describe("mapResourcesToVms", () => {
  it("maps qemu to VM and lxc to LXC, drops other types", () => {
    const vms = mapResourcesToVms([
      { vmid: 100, name: "ha", status: "running", type: "qemu", maxmem: 8 * 1024 ** 3, maxdisk: 50 * 1024 ** 3 },
      { vmid: 101, name: "docker", status: "running", type: "lxc", maxmem: 20 * 1024 ** 3, maxdisk: 400 * 1024 ** 3 },
      { vmid: 0, name: "pool", status: "running", type: "storage" },
      { vmid: 102, name: "ubuntu", status: "stopped", type: "qemu", maxmem: 8 * 1024 ** 3, maxdisk: 100 * 1024 ** 3 },
    ]);
    expect(vms).toHaveLength(3);
    const kinds = vms.map((v) => ({ vmid: v.vmid, kind: v.kind, status: v.status }));
    expect(kinds).toEqual([
      { vmid: 100, kind: "VM", status: "running" },
      { vmid: 101, kind: "LXC", status: "running" },
      { vmid: 102, kind: "VM", status: "stopped" },
    ]);
  });

  it("sorts running VMs before stopped ones", () => {
    const vms = mapResourcesToVms([
      { vmid: 200, name: "a", status: "stopped", type: "qemu", maxmem: 1 * 1024 ** 3, maxdisk: 1 * 1024 ** 3 },
      { vmid: 100, name: "b", status: "running", type: "qemu", maxmem: 1 * 1024 ** 3, maxdisk: 1 * 1024 ** 3 },
    ]);
    expect(vms[0]?.vmid).toBe(100);
    expect(vms[1]?.vmid).toBe(200);
  });

  it("formats ram and disk sizes in GB/TB", () => {
    const [vm] = mapResourcesToVms([
      { vmid: 1, name: "x", status: "running", type: "qemu", maxmem: 8 * 1024 ** 3, maxdisk: 2 * 1024 ** 4 },
    ]);
    expect(vm?.ram).toBe("8 GB");
    expect(vm?.disk).toMatch(/TB/);
  });

  it("returns a non-empty slice shape compatible with HomelabData vms", () => {
    const vms = mapResourcesToVms([
      { vmid: 1, name: "a", status: "running", type: "qemu", maxmem: 1 * 1024 ** 3, maxdisk: 1 * 1024 ** 3 },
    ]);
    expect(vms[0]).toMatchObject({
      vmid: expect.any(Number),
      name: expect.any(String),
      kind: expect.stringMatching(/^(VM|LXC)$/),
      status: expect.stringMatching(/^(running|stopped)$/),
      ram: expect.any(String),
      disk: expect.any(String),
    });
  });
});
