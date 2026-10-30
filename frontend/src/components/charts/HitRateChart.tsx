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

import { ChartTooltip } from "./ChartTooltip";

interface HitRateChartProps {
  hitRates: Record<string, number>;
}

export function HitRateChart({ hitRates }: HitRateChartProps) {
  const data = Object.entries(hitRates).map(([key, value]) => ({
    name: key.replace("top_", "Top-"),
    value: Number((value * 100).toFixed(1)),
  }));

  const colors = ["#2dd4bf", "#2dd4e6", "#4f8dfd", "#8b7cf6"];

  return (
    <div
      className="w-full"
      style={{ height: 230 }}
      role="img"
      aria-label="Bar chart of top-k hit rates on the single labelled synthetic case"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            width={38}
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,178,210,0.05)" }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="value" name="Hit rate (%)" radius={[4, 4, 0, 0]} barSize={48}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
