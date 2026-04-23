import { sparkPath } from "@/lib/spark";

export type SparklineProps = {
  values: number[];
  color?: string;
  height?: number;
  fill?: boolean;
};

export function Sparkline({ values, color = "var(--accent)", height = 28, fill = true }: SparklineProps) {
  const w = 200;
  const h = height;
  const d = sparkPath(values, w, h);
  const area = d + ` L ${w - 2} ${h - 2} L 2 ${h - 2} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={height}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
