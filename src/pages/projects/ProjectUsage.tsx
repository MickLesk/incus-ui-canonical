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
import { useClusterMembers } from "context/useClusterMembers";
import { useInstances } from "context/useInstances";
import { useIsClustered } from "context/useIsClustered";
import { useResources } from "context/useResources";
import { useStoragePools } from "context/useStoragePools";
import { queryKeys } from "util/queryKeys";
import { ROOT_PATH } from "util/rootPath";
import {
  formatLimit,
  getLoad,
  sumHostCapacity,
  sumInstances,
} from "util/projectUsage";
import { PoolRow } from "pages/projects/ProjectUsageCards";
import ProjectUsageOverview from "pages/projects/ProjectUsageOverview";

const ProjectUsage: FC = () => {
  const { project: projectName } = useParams<{ project: string }>();

  if (!projectName) {
    return <>Missing project</>;
  }

  const isClustered = useIsClustered();
  const { data: usage, isLoading } = useQuery({
    queryKey: [queryKeys.projects, projectName, queryKeys.projectUsage],
    queryFn: async () => fetchProjectState(projectName),
  });
  const { data: instances = [] } = useInstances(projectName);
  const { data: resources } = useResources();
  const { data: pools = [] } = useStoragePools(true, projectName);
  const { data: members = [] } = useClusterMembers();

  if (isLoading) {
    return <Spinner className="u-loader" text="Loading..." isMainComponent />;
  }

  const allocated = usage?.resources ?? {};
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
          <ProjectUsageOverview
            isClustered={isClustered}
            members={members}
            totals={sumInstances(instances)}
            host={sumHostCapacity(resources)}
            load={getLoad(resources)}
            cpuAllocated={allocated.cpu?.Usage ?? 0}
            memoryAllocated={allocated.memory?.Usage ?? 0}
            diskAllocated={allocated.disk?.Usage ?? 0}
          />

          {isClustered && (
            <>
              <h2 className="p-heading--5">Cluster members</h2>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.server_name}>
                      <td>{member.server_name}</td>
                      <td>{member.status}</td>
                      <td>{member.roles.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

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
