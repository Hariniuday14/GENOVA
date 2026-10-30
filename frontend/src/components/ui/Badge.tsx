import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export type BadgeTone = "neutral" | "cyan" | "teal" | "blue" | "amber" | "rose" | "violet";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-midnight-800/70 text-ink-secondary",
  cyan: "border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan",
  teal: "border-accent-teal/25 bg-accent-teal/10 text-accent-teal",
  blue: "border-accent-blue/25 bg-accent-blue/10 text-[#8fb6ff]",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, tone = "neutral", className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
