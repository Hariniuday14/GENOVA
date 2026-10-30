import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RankedVariant } from "../../lib/types";
import { scoreTone } from "../../lib/utils";
import { ChartTooltip } from "./ChartTooltip";

interface ScoreChartProps {
  results: RankedVariant[];
  height?: number;
}

export function ScoreChart({ results, height }: ScoreChartProps) {
  const data = [...results]
    .sort((a, b) => a.rank - b.rank)
    .reverse()
    .map((item) => ({
      name: item.gene,
      id: item.variant_id,
      score: item.score,
    }));

  return (
    <div
      className="w-full"
      style={{ height: height ?? Math.max(200, data.length * 44 + 30) }}
      role="img"
      aria-label="Horizontal bar chart of candidate prioritisation scores out of one hundred"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 6" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value: number) => String(value)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a2b5c9", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,178,210,0.05)" }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="score" name="Prioritisation score" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry) => (
              <Cell key={entry.id} fill={scoreTone(entry.score).bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
