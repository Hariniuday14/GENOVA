import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RankedVariant, ScoreScale } from "../../lib/types";
import { ChartTooltip } from "./ChartTooltip";

const COLORS = {
  phenotype: "#2dd4bf",
  inheritance: "#2dd4e6",
  effect: "#4f8dfd",
  frequency: "#8b7cf6",
};

interface ScoreBreakdownProps {
  results: RankedVariant[];
  scale: ScoreScale;
  height?: number;
}

export function ScoreBreakdown({ results, scale, height = 300 }: ScoreBreakdownProps) {
  const inheritanceMax =
    scale.components.find((component) => component.key === "inheritance_points")?.max ?? 25;

  const data = [...results]
    .sort((a, b) => a.rank - b.rank)
    .map((item) => ({
      name: item.gene,
      id: item.variant_id,
      Phenotype: item.phenotype_score,
      Inheritance: item.inheritance.compatible === true ? inheritanceMax : 0,
      "Effect evidence": item.effect_points,
      "Frequency evidence": item.frequency_points,
    }));

  return (
    <div
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Stacked bar chart of prioritisation score components per candidate"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 26, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={48}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            width={34}
            tick={{ fontSize: 11 }}
          />
          <Tooltip cursor={{ fill: "rgba(148,178,210,0.05)" }} content={<ChartTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            height={30}
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, color: "#a2b5c9" }}
          />
          <Bar dataKey="Phenotype" stackId="a" fill={COLORS.phenotype} />
          <Bar dataKey="Inheritance" stackId="a" fill={COLORS.inheritance} />
          <Bar dataKey="Effect evidence" stackId="a" fill={COLORS.effect} />
          <Bar dataKey="Frequency evidence" stackId="a" fill={COLORS.frequency} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
