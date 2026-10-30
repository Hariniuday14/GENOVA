import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, FlaskConical, Menu, Microscope } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Sidebar } from "./Sidebar";
import { ApiStatus } from "../ApiStatus";
import { Badge } from "../ui/Badge";
import { LinkButton } from "../ui/Button";

const titles: Record<string, string> = {
  "/": "Overview",
  "/analysis": "Family analysis",
  "/results": "Analysis results",
  "/evaluation": "Evaluation",
  "/methodology": "Methodology",
};

function SubtitleMark() {
  return (
    <span className="hidden items-center gap-2 text-[11px] text-ink-faint xl:flex">
      <Microscope size={13} aria-hidden />
      Family-aware variant prioritisation
    </span>
  );
}

export function AppLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const title = titles[location.pathname] ?? "GENOVA";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-line bg-midnight-950/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-line p-2 text-ink-secondary hover:bg-midnight-800 hover:text-ink lg:hidden"
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <Menu size={18} />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
              <Link
                to="/"
                className="hidden text-[12px] font-medium tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-secondary sm:block"
              >
                GENOVA
              </Link>
              <ChevronRight size={13} className="hidden text-ink-faint sm:block" aria-hidden />
              <span className="truncate text-[13px] font-medium text-ink">{title}</span>
            </nav>

            <div className="ml-auto flex items-center gap-2.5">
              <SubtitleMark />
              <Badge tone="amber" className="hidden sm:inline-flex" dot>
                Synthetic
              </Badge>
              <ApiStatus />
              <LinkButton
                to="/analysis"
                size="sm"
                icon={<FlaskConical size={14} />}
                className="hidden sm:inline-flex"
              >
                New analysis
              </LinkButton>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 border-t border-line pt-5 text-[11.5px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <p>
              GENOVA · Generational Variant Analysis · Experimental research prototype
            </p>
            <p>Synthetic data only · Not validated for clinical diagnosis or treatment</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
