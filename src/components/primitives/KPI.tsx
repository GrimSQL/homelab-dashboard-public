import { Sparkline } from "./Sparkline";

export type KPIProps = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: React.ReactNode;
  spark?: number[];
  color?: string;
};

export function KPI({ label, value, unit, trend, spark, color }: KPIProps) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="val">
        <span>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="trend">{trend}</div>
      {spark && (
        <div className="spark">
          <Sparkline values={spark} color={color ?? "var(--accent)"} height={28} />
        </div>
      )}
    </div>
  );
}
