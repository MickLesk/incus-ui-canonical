import type { FC } from "react";
import { humanFileSize } from "util/helpers";
import {
  percent,
  type HostCapacity,
  type InstanceTotals,
  type LoadAverage,
} from "util/projectUsage";
import { UsageCard } from "pages/projects/ProjectUsageCards";
import type { LxdClusterMember } from "types/cluster";

interface Props {
  isClustered: boolean;
  members: LxdClusterMember[];
  totals: InstanceTotals;
  host: HostCapacity;
  load?: LoadAverage;
  cpuAllocated: number;
  memoryAllocated: number;
  diskAllocated: number;
}

const ProjectUsageOverview: FC<Props> = ({
  isClustered,
  members,
  totals,
  host,
  load,
  cpuAllocated,
  memoryAllocated,
  diskAllocated,
}) => {
  const online = members.filter((member) => member.status === "Online");
  const isOvercommitted = host.cpuCores > 0 && cpuAllocated > host.cpuCores;

  return (
    <div className="project-usage__cards">
      <UsageCard
        title="Health"
        value={isClustered ? `${online.length} online` : "Standalone server"}
        lines={
          isClustered
            ? [
                { label: "Online", value: `${online.length}` },
                {
                  label: "Offline",
                  value: `${members.length - online.length}`,
                },
              ]
            : [{ label: "Cluster", value: "none" }]
        }
        percentage={isClustered ? percent(online.length, members.length) : 100}
        meterText={
          isClustered
            ? `${online.length} of ${members.length} members online`
            : "online"
        }
      />
      <UsageCard
        title="Guests"
        value={`${totals.running} running`}
        lines={[
          {
            label: "Virtual machines",
            value: `${totals.virtualMachinesRunning} running, ${totals.virtualMachines - totals.virtualMachinesRunning} stopped`,
          },
          {
            label: "Containers",
            value: `${totals.containersRunning} running, ${totals.containers - totals.containersRunning} stopped`,
          },
        ]}
        percentage={percent(totals.running, totals.total)}
        meterText={`${totals.running} of ${totals.total} running`}
      />
      <UsageCard
        title="CPU"
        value={`${cpuAllocated} allocated`}
        lines={[
          { label: "Host cores", value: `${host.cpuCores}` },
          ...(isOvercommitted
            ? [{ label: "Overcommitted", value: "yes" }]
            : []),
        ]}
        percentage={percent(cpuAllocated, host.cpuCores)}
        meterText={`${cpuAllocated} of ${host.cpuCores} host cores`}
      />
      <UsageCard
        title="Memory"
        value={`${humanFileSize(host.memoryUsed)} used`}
        lines={[
          { label: "Host total", value: humanFileSize(host.memoryTotal) },
          { label: "By instances", value: humanFileSize(totals.memoryUsed) },
          { label: "Allocated", value: humanFileSize(memoryAllocated) },
        ]}
        percentage={percent(host.memoryUsed, host.memoryTotal)}
        meterText={`${humanFileSize(host.memoryUsed)} of ${humanFileSize(host.memoryTotal)} host memory`}
      />
      {load && (
        <UsageCard
          title="Load average"
          value={load.one.toFixed(2)}
          lines={[
            { label: "5 min", value: load.five.toFixed(2) },
            { label: "10 min", value: load.ten.toFixed(2) },
            { label: "Processes", value: `${load.processes}` },
          ]}
          percentage={percent(load.one, host.cpuCores)}
          meterText={`1 min load on ${host.cpuCores} cores`}
        />
      )}
      <UsageCard
        title="Root disks"
        value={`${humanFileSize(totals.diskUsed)} used`}
        lines={[{ label: "Allocated", value: humanFileSize(diskAllocated) }]}
        percentage={percent(totals.diskUsed, diskAllocated)}
        meterText={`${humanFileSize(totals.diskUsed)} of ${humanFileSize(diskAllocated)} allocated`}
      />
    </div>
  );
};

export default ProjectUsageOverview;
