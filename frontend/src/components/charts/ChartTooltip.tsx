import type { TooltipProps } from "recharts";

export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-line-strong bg-midnight-850/95 px-3 py-2.5 shadow-lift backdrop-blur">
      {label !== undefined && label !== "" ? (
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, index) => (
          <li key={`${entry.name}-${index}`} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: entry.color ?? "#2dd4e6" }}
              aria-hidden
            />
            <span className="text-ink-muted">{entry.name}</span>
            <span className="mono ml-auto pl-3 text-ink">
              {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
