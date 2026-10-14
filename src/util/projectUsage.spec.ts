import type { LxdInstance } from "types/instance";
import type { LxdResources } from "types/resources";
import { humanFileSize } from "util/helpers";
import {
  formatLimit,
  percent,
  sumHostCapacity,
  sumInstances,
} from "./projectUsage";

const inst = (over: Record<string, unknown>): LxdInstance =>
  ({
    status: "Running",
    type: "container",
    expanded_devices: { root: { type: "disk", path: "/", pool: "default" } },
    state: {
      memory: { usage: 1e9 },
      disk: { root: { usage: 2e9, total: 10e9 } },
    },
    ...over,
  }) as unknown as LxdInstance;

describe("sumInstances", () => {
  it("counts instances by state and type", () => {
    const result = sumInstances([
      inst({}),
      inst({ status: "Stopped", type: "virtual-machine" }),
    ]);
    expect(result).toMatchObject({
      total: 2,
      running: 1,
      containers: 1,
      virtualMachines: 1,
    });
  });

  it("sums memory of running instances and root disk usage of all", () => {
    const stopped = inst({
      status: "Stopped",
      state: {
        memory: { usage: 5e9 },
        disk: { root: { usage: 3e9, total: 10e9 } },
      },
    });
    expect(sumInstances([inst({}), stopped])).toMatchObject({
      memoryUsed: 1e9,
      diskUsed: 5e9,
    });
  });

  it("ignores instances without state", () => {
    expect(sumInstances([inst({ state: undefined })])).toMatchObject({
      total: 1,
      memoryUsed: 0,
      diskUsed: 0,
    });
  });
});

describe("sumHostCapacity", () => {
  it("sums cores and memory across cluster members", () => {
    const members = [
      { cpu: { total: 12 }, memory: { total: 64e9 } },
      { cpu: { total: 4 }, memory: { total: 16e9 } },
    ] as unknown as LxdResources[];
    expect(sumHostCapacity(members)).toEqual({
      cpuCores: 16,
      memoryTotal: 80e9,
    });
  });

  it("accepts a single host", () => {
    const host = {
      cpu: { total: 12 },
      memory: { total: 64e9 },
    } as unknown as LxdResources;
    expect(sumHostCapacity(host)).toEqual({ cpuCores: 12, memoryTotal: 64e9 });
  });

  it("is zero without data", () => {
    expect(sumHostCapacity(undefined)).toEqual({ cpuCores: 0, memoryTotal: 0 });
  });
});

describe("percent", () => {
  it("clamps to 100 and guards against zero", () => {
    expect(percent(5, 10)).toBe(50);
    expect(percent(5, 0)).toBe(0);
    expect(percent(20, 10)).toBe(100);
  });
});

describe("formatLimit", () => {
  it("shows unlimited for negative limits", () => {
    expect(formatLimit(-1, false)).toBe("unlimited");
    expect(formatLimit(3, false)).toBe("3");
    expect(formatLimit(1024, true)).toBe(humanFileSize(1024));
  });
});
