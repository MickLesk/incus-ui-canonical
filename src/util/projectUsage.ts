import type { LxdInstance } from "types/instance";
import type { LxdResources } from "types/resources";
import type { LxdDevices, LxdDiskDevice } from "types/device";
import { humanFileSize } from "util/helpers";

export interface InstanceTotals {
  total: number;
  running: number;
  containers: number;
  virtualMachines: number;
  memoryUsed: number;
  diskUsed: number;
}

export interface HostCapacity {
  cpuCores: number;
  memoryTotal: number;
}

const isRootDisk = (device: LxdDevices[string]): boolean => {
  if (device.type !== "disk") {
    return false;
  }
  const disk = device as LxdDiskDevice;
  return disk.path === "/" && !disk.source;
};

const rootDiskUsage = (instance: LxdInstance): number => {
  const name = Object.entries(instance.expanded_devices ?? {}).find(
    ([, device]) => isRootDisk(device),
  )?.[0];
  const disk = name ? instance.state?.disk?.[name] : undefined;
  return disk?.usage ?? 0;
};

// Actual usage from the instance state that comes with the list.
export const sumInstances = (instances: LxdInstance[]): InstanceTotals => {
  const totals: InstanceTotals = {
    total: instances.length,
    running: 0,
    containers: 0,
    virtualMachines: 0,
    memoryUsed: 0,
    diskUsed: 0,
  };

  instances.forEach((instance) => {
    const isRunning = instance.status === "Running";
    totals.running += isRunning ? 1 : 0;
    totals.containers += instance.type === "container" ? 1 : 0;
    totals.virtualMachines += instance.type === "virtual-machine" ? 1 : 0;
    totals.memoryUsed += isRunning ? (instance.state?.memory?.usage ?? 0) : 0;
    totals.diskUsed += rootDiskUsage(instance);
  });

  return totals;
};

// One host or all cluster members.
export const sumHostCapacity = (
  resources?: LxdResources | LxdResources[],
): HostCapacity => {
  const list = resources ? [resources].flat() : [];
  return list.reduce(
    (sum, host) => ({
      cpuCores: sum.cpuCores + (host.cpu?.total ?? 0),
      memoryTotal: sum.memoryTotal + (host.memory?.total ?? 0),
    }),
    { cpuCores: 0, memoryTotal: 0 },
  );
};

export const percent = (used: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, (100 * used) / total);
};

export const formatLimit = (limit: number, isBytes: boolean): string => {
  if (limit < 0) {
    return "unlimited";
  }
  return isBytes ? humanFileSize(limit) : limit.toString();
};
