import type { ReactNode } from "react";
import { AlertTriangle, Info, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./Button";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-muted" role="status">
      <Loader2 size={15} className="animate-spin text-accent-cyan" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function LoadingPanel({ label = "Loading data from the GENOVA API…" }: { label?: string }) {
  return (
    <div className="panel flex min-h-[180px] flex-col items-center justify-center gap-4 p-8">
      <Loader2 size={22} className="animate-spin text-accent-cyan" aria-hidden />
      <p className="text-sm text-ink-muted" role="status">
        {label}
      </p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-midnight-700">
        <div className="skeleton h-full w-full" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-midnight-900/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-midnight-800 text-ink-muted">
          {icon}
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

interface ErrorPanelProps {
  title?: string;
  message: string;
  errors?: string[];
  onRetry?: () => void;
  className?: string;
}

export function ErrorPanel({
  title = "Request failed",
  message,
  errors = [],
  onRetry,
  className,
}: ErrorPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-rose-400/25 bg-rose-500/[0.06] p-5",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-rose-100">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-rose-200/80">{message}</p>
          {errors.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-rose-400/15 pt-3">
              {errors.map((error, index) => (
                <li key={`${error}-${index}`} className="text-[12.5px] leading-relaxed text-rose-200/75">
                  <span className="mr-2 text-rose-400/70">•</span>
                  {error}
                </li>
              ))}
            </ul>
          ) : null}
          {onRetry ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 border-rose-400/30 text-rose-100 hover:border-rose-400/60 hover:bg-rose-500/10"
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type AlertTone = "info" | "warning" | "danger" | "success";

const alertStyles: Record<AlertTone, { wrap: string; icon: ReactNode }> = {
  info: {
    wrap: "border-accent-blue/20 bg-accent-blue/[0.055] text-[#c8d9f5]",
    icon: <Info size={16} className="text-[#8fb6ff]" aria-hidden />,
  },
  warning: {
    wrap: "border-amber-400/20 bg-amber-400/[0.055] text-amber-100/90",
    icon: <AlertTriangle size={16} className="text-amber-300" aria-hidden />,
  },
  danger: {
    wrap: "border-rose-400/25 bg-rose-500/[0.06] text-rose-100/90",
    icon: <AlertTriangle size={16} className="text-rose-300" aria-hidden />,
  },
  success: {
    wrap: "border-accent-teal/25 bg-accent-teal/[0.055] text-teal-50/90",
    icon: <CheckCircle2 size={16} className="text-accent-teal" aria-hidden />,
  },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-[13px] leading-relaxed",
        alertStyles[tone].wrap,
        className,
      )}
      role={tone === "danger" || tone === "warning" ? "alert" : "note"}
    >
      <span className="mt-0.5 shrink-0">{alertStyles[tone].icon}</span>
      <div className="min-w-0">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        <div className={cn(title ? "mt-1" : "", "text-ink-secondary")}>{children}</div>
      </div>
    </div>
  );
}
