import type { FC } from "react";
import Meter from "components/Meter";
import { useStoragePoolResources } from "context/useStoragePoolResources";
import { humanFileSize } from "util/helpers";
import { percent } from "util/projectUsage";
import type { LxdStoragePool } from "types/storage";

interface CardProps {
  title: string;
  value: string;
  lines?: { label: string; value: string }[];
  percentage?: number;
  meterText?: string;
}

export const UsageCard: FC<CardProps> = ({
  title,
  value,
  lines = [],
  percentage,
  meterText,
}) => (
  <div className="project-usage__card">
    <p className="p-text--small u-text--muted u-no-margin--bottom">{title}</p>
    <p className="project-usage__value">{value}</p>
    {lines.map((line) => (
      <div key={line.label} className="project-usage__line">
        <span className="u-text--muted">{line.label}</span>
        <span>{line.value}</span>
      </div>
    ))}
    {percentage !== undefined && meterText !== undefined && (
      <Meter percentage={percentage} text={meterText} />
    )}
  </div>
);

export const PoolRow: FC<{ pool: LxdStoragePool }> = ({ pool }) => {
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
