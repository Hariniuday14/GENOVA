import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "cyan" | "teal" | "blue" | "neutral";
  className?: string;
}

const accents = {
  cyan: "text-accent-cyan border-accent-cyan/20 bg-accent-cyan/[0.07]",
  teal: "text-accent-teal border-accent-teal/20 bg-accent-teal/[0.07]",
  blue: "text-[#8fb6ff] border-accent-blue/20 bg-accent-blue/[0.07]",
  neutral: "text-ink-secondary border-line bg-midnight-800/60",
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  accent = "neutral",
  className,
}: StatCardProps) {
  return (
    <div className={cn("panel panel-hover flex flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border",
              accents[accent],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="mono text-[28px] font-semibold leading-none tracking-tight text-ink">
            {value}
          </span>
          {unit ? <span className="text-xs text-ink-muted">{unit}</span> : null}
        </div>
        {hint ? <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
