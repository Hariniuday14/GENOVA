import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className, as: Tag = "section" }: CardProps) {
  return <Tag className={cn("panel p-5 sm:p-6", className)}>{children}</Tag>;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, icon, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-midnight-800/80 text-accent-cyan">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
