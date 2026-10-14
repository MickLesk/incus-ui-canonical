import type { FC } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Col,
  CustomLayout,
  MainTable,
  Row,
  Spinner,
} from "@canonical/react-components";
import { fetchProjectState } from "api/projects";
import PageHeader from "components/PageHeader";
import Meter from "components/Meter";
import { useInstances } from "context/useInstances";
import { useResources } from "context/useResources";
import { useStoragePools } from "context/useStoragePools";
import { useStoragePoolResources } from "context/useStoragePoolResources";
import { humanFileSize } from "util/helpers";
import { queryKeys } from "util/queryKeys";
import { ROOT_PATH } from "util/rootPath";
import {
  formatLimit,
  percent,
  sumHostCapacity,
  sumInstances,
} from "util/projectUsage";
import type { LxdStoragePool } from "types/storage";

interface CardProps {
  title: string;
  value: string;
  detail: string;
  percentage: number;
  meterText: string;
}

const UsageCard: FC<CardProps> = ({
  title,
  value,
  detail,
  percentage,
  meterText,
}) => (
  <div className="project-usage__card">
    <p className="p-text--small u-text--muted u-no-margin--bottom">{title}</p>
    <p className="project-usage__value">{value}</p>
    <p className="p-text--small u-text--muted">{detail}</p>
    <Meter percentage={percentage} text={meterText} />
  </div>
);

const PoolRow: FC<{ pool: LxdStoragePool }> = ({ pool }) => {
  const { data } = useStoragePoolResources(pool);
  const resources = [data ?? []].flat()[0];
  const used = resources?.space.used ?? 0;
  const total = resources?.space.total ?? 0;

  return (
    <tr>
      <td>{pool.name}</td>
      <td>{pool.driver}</td>
      <td>
        {total > 0 ? (
          <Meter
            percentage={percent(used, total)}
            text={`${humanFileSize(used)} of ${humanFileSize(total)}`}
          />
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
};

const ProjectUsage: FC = () => {
  const { project: projectName } = useParams<{ project: string }>();

  if (!projectName) {
    return <>Missing project</>;
  }

  const { data: usage, isLoading } = useQuery({
    queryKey: [queryKeys.projects, projectName, queryKeys.projectUsage],
    queryFn: async () => fetchProjectState(projectName),
  });
  const { data: instances = [] } = useInstances(projectName);
  const { data: resources } = useResources();
  const { data: pools = [] } = useStoragePools(true, projectName);

  if (isLoading) {
    return <Spinner className="u-loader" text="Loading..." isMainComponent />;
  }

  const allocated = usage?.resources ?? {};
  const totals = sumInstances(instances);
  const host = sumHostCapacity(resources);
  const cpuAllocated = allocated.cpu?.Usage ?? 0;
  const memoryAllocated = allocated.memory?.Usage ?? 0;
  const diskAllocated = allocated.disk?.Usage ?? 0;
  const isOvercommitted = host.cpuCores > 0 && cpuAllocated > host.cpuCores;

  const limitRows = Object.entries(allocated).map(([name, item]) => {
    const isBytes = ["disk", "memory"].includes(name);
    return {
      key: name,
      columns: [
        { content: name, role: "rowheader", "aria-label": "Resource" },
        {
          content: formatLimit(item.Limit, isBytes),
          role: "cell",
          "aria-label": "Limit",
        },
        {
          content: formatLimit(item.Usage, isBytes),
          role: "cell",
          "aria-label": "Allocated",
        },
      ],
    };
  });

  return (
    <CustomLayout
      header={
        <PageHeader>
          <PageHeader.Left>
            <PageHeader.Title>Project usage</PageHeader.Title>
          </PageHeader.Left>
        </PageHeader>
      }
    >
      <Row className="no-grid-gap">
        <Col size={12}>
          <div className="project-usage__cards">
            <UsageCard
              title="Instances"
              value={`${totals.running} running`}
              detail={`${totals.containers} containers, ${totals.virtualMachines} virtual machines`}
              percentage={percent(totals.running, totals.total)}
              meterText={`${totals.running} of ${totals.total} running`}
            />
            <UsageCard
              title="CPU"
              value={`${cpuAllocated} allocated`}
              detail={
                isOvercommitted
                  ? "more allocated than the host has"
                  : `${host.cpuCores} host cores`
              }
              percentage={percent(cpuAllocated, host.cpuCores)}
              meterText={`${cpuAllocated} of ${host.cpuCores} host cores`}
            />
            <UsageCard
              title="Memory"
              value={`${humanFileSize(totals.memoryUsed)} used`}
              detail={`${humanFileSize(memoryAllocated)} allocated`}
              percentage={percent(totals.memoryUsed, host.memoryTotal)}
              meterText={`${humanFileSize(totals.memoryUsed)} of ${humanFileSize(host.memoryTotal)} host memory`}
            />
            <UsageCard
              title="Root disks"
              value={`${humanFileSize(totals.diskUsed)} used`}
              detail={`${humanFileSize(diskAllocated)} allocated`}
              percentage={percent(totals.diskUsed, diskAllocated)}
              meterText={`${humanFileSize(totals.diskUsed)} of ${humanFileSize(diskAllocated)} allocated`}
            />
          </div>

          <h2 className="p-heading--5">Storage pools</h2>
          <table>
            <thead>
              <tr>
                <th>Pool</th>
                <th>Driver</th>
                <th>Used</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <PoolRow key={pool.name} pool={pool} />
              ))}
            </tbody>
          </table>

          <h2 className="p-heading--5">Limits</h2>
          <p className="u-text--muted">
            Allocated is the sum of the instance limits. Set project limits in
            the{" "}
            <Link
              to={`${ROOT_PATH}/ui/project/${encodeURIComponent(projectName)}/configuration`}
            >
              project configuration
            </Link>
            .
          </p>
          <MainTable
            id="project-usage-table"
            headers={[
              { content: "Resource" },
              { content: "Limit" },
              { content: "Allocated" },
            ]}
            rows={limitRows}
          />
        </Col>
      </Row>
    </CustomLayout>
  );
};

export default ProjectUsage;
