import { NavLink } from "react-router-dom";
import {
  Activity,
  BookOpen,
  Dna,
  FlaskConical,
  LayoutDashboard,
  ShieldCheck,
  X,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { useAnalysis } from "../../lib/analysis-context";
import { ApiStatus } from "../ApiStatus";

const navigation = [
  {
    section: "Workspace",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/analysis", label: "Family analysis", icon: FlaskConical },
      { to: "/results", label: "Results", icon: Activity },
    ],
  },
  {
    section: "Validation",
    items: [{ to: "/evaluation", label: "Evaluation", icon: ShieldCheck }],
  },
  {
    section: "Research",
    items: [{ to: "/methodology", label: "Methodology", icon: BookOpen }],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { current } = useAnalysis();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-midnight-950/70 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-line bg-midnight-900/95 backdrop-blur-xl transition-transform duration-300 lg:z-30 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary"
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <NavLink to="/" className="group flex items-center gap-3" onClick={onClose}>
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-accent-cyan/25 bg-gradient-to-br from-accent-cyan/20 via-accent-blue/10 to-transparent text-accent-cyan shadow-[0_0_30px_-12px_rgba(45,212,230,0.6)]">
              <Dna size={21} strokeWidth={1.8} aria-hidden />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-[0.16em] text-white">
                GENOVA
              </span>
              <span className="mt-0.5 block text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                Variant intelligence
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-midnight-800 hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-5 mb-6 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-300">
            Research prototype
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            Synthetic data only · Not for clinical use
          </p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {navigation.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                {group.section}
              </p>
              <ul className="space-y-1">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-150",
                          isActive
                            ? "bg-accent-cyan/[0.08] font-medium text-ink"
                            : "text-ink-muted hover:bg-midnight-800/60 hover:text-ink-secondary",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent-cyan transition-opacity",
                              isActive ? "opacity-100" : "opacity-0",
                            )}
                            aria-hidden
                          />
                          <Icon
                            size={17}
                            strokeWidth={1.8}
                            className={cn(
                              "shrink-0 transition-colors",
                              isActive ? "text-accent-cyan" : "text-ink-faint group-hover:text-ink-secondary",
                            )}
                            aria-hidden
                          />
                          <span className="flex-1">{label}</span>
                          {to === "/results" && current ? (
                            <span className="mono rounded-full bg-midnight-700/70 px-1.5 py-0.5 text-[10px] text-ink-muted">
                              {current.results.length}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-4">
          <ApiStatus compact />
          <p className="mt-4 text-[10.5px] leading-relaxed text-ink-faint">
            GENOVA v1.0 · Prioritisation scores are heuristics, not probabilities.
          </p>
        </div>
      </aside>
    </>
  );
}
