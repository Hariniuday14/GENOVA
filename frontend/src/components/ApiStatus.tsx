import { cn } from "../lib/utils";
import { useAnalysis } from "../lib/analysis-context";

interface ApiStatusProps {
  compact?: boolean;
  showVersion?: boolean;
}

export function ApiStatus({ compact = false, showVersion = false }: ApiStatusProps) {
  const { health, healthState, healthError, refreshHealth } = useAnalysis();

  const online = healthState === "ready" && health?.status === "ok";
  const connecting = healthState === "loading";

  const dotClass = online
    ? "bg-accent-teal shadow-[0_0_10px_rgba(45,212,191,0.8)]"
    : connecting
      ? "bg-amber-300"
      : "bg-rose-400";

  const label = online ? "API connected" : connecting ? "Connecting" : "API offline";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void refreshHealth()}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-midnight-800/60"
        title={
          online
            ? `FastAPI ${health?.api_version} · demo data ${health?.demo_available ? "available" : "missing"}`
            : healthError ?? "Checking the GENOVA API"
        }
      >
        <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} aria-hidden />
          {label}
        </span>
        {showVersion && health ? (
          <span className="mono text-[10.5px] text-ink-faint">v{health.api_version}</span>
        ) : (
          <span className="text-[10.5px] text-ink-faint">:8000</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void refreshHealth()}
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[12px] transition-colors",
        online
          ? "border-accent-teal/20 bg-accent-teal/[0.06] text-teal-100/90 hover:border-accent-teal/40"
          : connecting
            ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-100/90"
            : "border-rose-400/25 bg-rose-500/[0.07] text-rose-100/90 hover:border-rose-400/50",
      )}
      title={
        online
          ? `FastAPI ${health?.api_version} responding · ${health?.supported_inheritance_modes.length} inheritance models`
          : healthError ?? "Checking the GENOVA API"
      }
      aria-label={`${label}. Click to re-check.`}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", dotClass, connecting && "animate-pulse")}
        aria-hidden
      />
      <span className="font-medium">{label}</span>
      {online ? <span className="mono hidden text-[10.5px] opacity-60 sm:inline">v{health?.api_version}</span> : null}
    </button>
  );
}
