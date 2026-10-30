import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, ApiError } from "./api";
import type {
  AnalysisPayload,
  AnalysisResult,
  DemoDataset,
  Health,
  RunRecord,
} from "./types";

const HISTORY_KEY = "genova.runs.v1";
const HISTORY_LIMIT = 8;

function readHistory(): RunRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RunRecord[]).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export type LoadState = "idle" | "loading" | "ready" | "error";

interface AnalysisContextValue {
  health: Health | null;
  healthState: LoadState;
  healthError: string | null;
  refreshHealth: () => Promise<void>;

  demo: DemoDataset | null;
  demoState: LoadState;
  demoError: string | null;
  reloadDemo: () => Promise<void>;

  current: AnalysisResult | null;
  running: boolean;
  analysisError: ApiError | Error | null;
  runAnalysis: (payload: AnalysisPayload) => Promise<AnalysisResult | null>;
  clearAnalysisError: () => void;

  history: RunRecord[];
  clearHistory: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthState, setHealthState] = useState<LoadState>("loading");
  const [healthError, setHealthError] = useState<string | null>(null);

  const [demo, setDemo] = useState<DemoDataset | null>(null);
  const [demoState, setDemoState] = useState<LoadState>("loading");
  const [demoError, setDemoError] = useState<string | null>(null);

  const [current, setCurrent] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<ApiError | Error | null>(null);

  const [history, setHistory] = useState<RunRecord[]>(() => readHistory());

  const autoRunStarted = useRef(false);

  const refreshHealth = useCallback(async () => {
    try {
      const result = await api.health();
      setHealth(result);
      setHealthState("ready");
      setHealthError(null);
    } catch (error) {
      setHealthState("error");
      setHealthError(
        error instanceof Error ? error.message : "Health check failed.",
      );
    }
  }, []);

  const reloadDemo = useCallback(async () => {
    setDemoState("loading");
    setDemoError(null);
    try {
      const result = await api.demo();
      setDemo(result);
      setDemoState("ready");
    } catch (error) {
      setDemoState("error");
      setDemoError(error instanceof Error ? error.message : "Could not load demo data.");
    }
  }, []);

  const runAnalysis = useCallback(async (payload: AnalysisPayload) => {
    setRunning(true);
    setAnalysisError(null);

    try {
      const result = await api.analyse(payload);
      setCurrent(result);

      const top = result.results[0] ?? null;
      const record: RunRecord = {
        id: result.analysis_id,
        label: result.label ?? "Untitled run",
        mode: result.inheritance_mode,
        createdAt: result.generated_at,
        topGene: top?.gene ?? null,
        topScore: top?.score ?? null,
        source: result.dataset_kind,
        candidateCount: result.results.length,
      };

      setHistory((previous) => {
        const next = [record, ...previous.filter((item) => item.id !== record.id)].slice(
          0,
          HISTORY_LIMIT,
        );
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* storage can be unavailable; history is a convenience only */
        }
        return next;
      });

      setRunning(false);
      return result;
    } catch (error) {
      setRunning(false);
      setAnalysisError(error instanceof Error ? error : new Error("Analysis failed."));
      return null;
    }
  }, []);

  const clearAnalysisError = useCallback(() => setAnalysisError(null), []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void reloadDemo();
  }, [refreshHealth, reloadDemo]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshHealth();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refreshHealth]);

  // Establish a real baseline run from the bundled synthetic dataset so the
  // dashboard shows genuine engine output rather than placeholder numbers.
  useEffect(() => {
    if (!demo || autoRunStarted.current) return;
    autoRunStarted.current = true;

    void runAnalysis({
      family: demo.family,
      variants: demo.variants,
      observed_phenotypes: demo.observed_phenotypes,
      inheritance_mode: demo.inheritance_mode as AnalysisPayload["inheritance_mode"],
      label: "Synthetic demo family",
      source: "synthetic_demo",
    });
  }, [demo, runAnalysis]);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      health,
      healthState,
      healthError,
      refreshHealth,
      demo,
      demoState,
      demoError,
      reloadDemo,
      current,
      running,
      analysisError,
      runAnalysis,
      clearAnalysisError,
      history,
      clearHistory,
    }),
    [
      health,
      healthState,
      healthError,
      refreshHealth,
      demo,
      demoState,
      demoError,
      reloadDemo,
      current,
      running,
      analysisError,
      runAnalysis,
      clearAnalysisError,
      history,
      clearHistory,
    ],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used inside AnalysisProvider");
  }
  return context;
}
