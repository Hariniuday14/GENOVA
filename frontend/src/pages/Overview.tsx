import {
  Activity,
  ArrowRight,
  BookOpen,
  Database,
  Dna,
  FlaskConical,
  GitBranch,
  History,
  Layers,
  RefreshCw,
  ServerCog,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAnalysis } from "../lib/analysis-context";
import { formatDateTime, formatMode, formatScore } from "../lib/utils";
import { ApiStatus } from "../components/ApiStatus";
import { Card, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { Alert, EmptyState, ErrorPanel, LoadingPanel } from "../components/ui/States";
import { LinkButton, Button } from "../components/ui/Button";
import { ScoreChart } from "../components/charts/ScoreChart";
import { Pedigree } from "../components/Pedigree";

const workflow = [
  {
    step: "01",
    title: "Family structure",
    body: "Three generations of synthetic relatives, affected status, and parent links.",
  },
  {
    step: "02",
    title: "Phenotype matching",
    body: "Exact overlap between observed terms and each candidate's supplied terms.",
  },
  {
    step: "03",
    title: "Inheritance review",
    body: "Simplified compatibility checks against the selected inheritance model.",
  },
  {
    step: "04",
    title: "Evidence scoring",
    body: "Supplied effect and frequency evidence values, clamped by the engine.",
  },
  {
    step: "05",
    title: "Candidate ranking",
    body: "Transparent 0–100 prioritisation score with per-candidate reasoning.",
  },
];

function TopCandidate() {
  const { current } = useAnalysis();
  const top = current?.results[0];

  if (!top) return null;

  const components = [
    { label: "Phenotype", value: top.phenotype_score, max: 50, color: "#2dd4bf" },
    {
      label: "Inheritance",
      value: top.inheritance.compatible === true ? 25 : 0,
      max: 25,
      color: "#2dd4e6",
    },
    { label: "Effect", value: top.effect_points, max: 15, color: "#4f8dfd" },
    { label: "Frequency", value: top.frequency_points, max: 10, color: "#8b7cf6" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Top-ranked candidate</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{top.gene}</p>
          <p className="mono mt-1 text-[11.5px] text-ink-faint">{top.variant_id}</p>
        </div>
        <Badge tone="teal" dot>
          Rank 1
        </Badge>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className="mono text-[42px] font-semibold leading-none tracking-tight text-white">
          {formatScore(top.score)}
        </span>
        <span className="mb-1 text-xs text-ink-muted">/ 100</span>
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-faint">
        Engineered prioritisation score — not a probability of disease.
      </p>

      <div className="mt-6 space-y-3">
        {components.map((component) => (
          <div key={component.label}>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
              <span className="text-ink-muted">{component.label}</span>
              <span className="mono text-ink-secondary">
                {component.value.toFixed(1)} / {component.max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-midnight-700">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (component.value / component.max) * 100)}%`,
                  backgroundColor: component.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <Link
          to="/results"
          className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-cyan"
        >
          Inspect full result
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export function Overview() {
  const {
    demo,
    demoState,
    demoError,
    reloadDemo,
    current,
    running,
    analysisError,
    runAnalysis,
    history,
    clearHistory,
    health,
  } = useAnalysis();

  const summary = current?.summary;
  const isSynthetic = (current?.dataset_kind ?? "synthetic_demo") === "synthetic_demo";

  const rerunDemo = () => {
    if (!demo) return;
    void runAnalysis({
      family: demo.family,
      variants: demo.variants,
      observed_phenotypes: demo.observed_phenotypes,
      inheritance_mode: demo.inheritance_mode as never,
      label: "Synthetic demo family",
      source: "synthetic_demo",
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Research workspace"
        title="Family-aware variant prioritisation"
        description={
          <>
            GENOVA combines family genotypes, phenotype-term overlap, simplified inheritance
            compatibility, and supplied evidence values into a transparent candidate ranking.
            Every number below is produced by the local Python engine.
          </>
        }
        meta={
          <>
            <Badge tone="amber" dot>
              Synthetic demonstration data
            </Badge>
            <Badge tone="cyan">Research prototype</Badge>
            {current ? (
              <Badge tone="neutral">
                Latest run · {formatDateTime(current.generated_at)}
              </Badge>
            ) : null}
          </>
        }
        actions={
          <>
            <LinkButton to="/analysis" icon={<FlaskConical size={15} />}>
              Run an analysis
            </LinkButton>
            <LinkButton
              to="/evaluation"
              variant="secondary"
              icon={<Target size={15} />}
            >
              Evaluation
            </LinkButton>
          </>
        }
      />

      <Alert tone="warning" title="Not a clinical tool" className="mb-6">
        GENOVA is an experimental research prototype. Scores are heuristic prioritisation values,
        not diagnostic probabilities, and must not guide medical decisions. All family and variant
        records are fictional.
      </Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Family members"
          value={summary?.family_members ?? demo?.summary.family_members ?? "—"}
          hint={`${summary?.affected_members ?? demo?.summary.affected_members ?? 0} marked affected in the synthetic family`}
          icon={<Users size={16} />}
          accent="cyan"
        />
        <StatCard
          label="Candidates analysed"
          value={summary?.variants_analysed ?? demo?.summary.variants ?? "—"}
          hint={
            summary
              ? `${summary.inheritance_compatible} passed the simplified inheritance check`
              : "Loaded from the synthetic demo dataset"
          }
          icon={<Dna size={16} />}
          accent="teal"
        />
        <StatCard
          label="Generations"
          value={demo?.summary.generations.length ?? "—"}
          hint="Parent links drive the pedigree and inheritance checks"
          icon={<GitBranch size={16} />}
          accent="blue"
        />
        <StatCard
          label="Observed phenotypes"
          value={summary?.observed_phenotypes ?? demo?.summary.phenotype_terms ?? "—"}
          hint={
            summary?.top_candidate_gene
              ? `Top candidate · ${summary.top_candidate_gene} at ${formatScore(summary.top_score)}/100`
              : "Terms matched by exact overlap"
          }
          icon={<Layers size={16} />}
          accent="neutral"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={<Activity size={16} />}
            title="Candidate prioritisation"
            description="Prioritisation score out of 100 for each analysed candidate, ordered by rank. Colour indicates the score band."
            action={
              <div className="flex items-center gap-2">
                {current ? (
                  <Badge tone={isSynthetic ? "amber" : "violet"}>
                    {isSynthetic ? "Synthetic demo" : "Custom dataset"}
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rerunDemo}
                  loading={running}
                  icon={<RefreshCw size={13} />}
                  disabled={!demo}
                  aria-label="Re-run the synthetic demo analysis"
                >
                  Re-run
                </Button>
              </div>
            }
          />

          {running && !current ? (
            <div className="skeleton h-[220px] rounded-lg" />
          ) : analysisError && !current ? (
            <ErrorPanel
              title="Analysis engine unavailable"
              message={analysisError.message}
              errors={"errors" in analysisError ? (analysisError.errors as string[]) : []}
              onRetry={rerunDemo}
            />
          ) : current ? (
            <>
              <ScoreChart results={current.results} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[12px] text-ink-muted">
                <span>
                  Mode · <span className="text-ink-secondary">{formatMode(current.inheritance_mode)}</span>
                </span>
                <span>
                  Mean score ·{" "}
                  <span className="mono text-ink-secondary">{formatScore(current.summary.mean_score)}</span>
                </span>
                <span>
                  Phenotype matches ·{" "}
                  <span className="mono text-ink-secondary">
                    {current.summary.candidates_with_phenotype_match}/{current.results.length}
                  </span>
                </span>
              </div>
            </>
          ) : demoState === "error" ? (
            <StateError
              message={demoError ?? "The demo dataset could not be loaded."}
              onRetry={() => void reloadDemo()}
            />
          ) : (
            <div className="skeleton h-[220px] rounded-lg" />
          )}
        </Card>

        <Card>
          {current ? (
            <TopCandidate />
          ) : (
            <>
              <CardHeader
                icon={<Sparkles size={16} />}
                title="Top-ranked candidate"
                description="Populated by the first successful engine run."
              />
              <div className="skeleton h-[260px] rounded-lg" />
            </>
          )}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={<GitBranch size={16} />}
            title="Synthetic pedigree"
            description="Three-generation fictional family. Shapes encode sex; colour encodes affected status. Lines show supplied parent–child relationships."
            action={<Badge tone="amber">Fictional</Badge>}
          />
          {demo ? (
            <Pedigree family={demo.family} />
          ) : demoState === "loading" ? (
            <div className="skeleton h-[240px] rounded-lg" />
          ) : (
            <StateError
              message={demoError ?? "Family data unavailable."}
              onRetry={() => void reloadDemo()}
            />
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<BookOpen size={16} />}
            title="Analysis workflow"
            description="From supplied family records to a ranked, explained candidate list."
          />
          <ol className="space-y-4">
            {workflow.map((item, index) => (
              <li key={item.step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-midnight-800 text-[10px] text-accent-cyan">
                    {item.step}
                  </span>
                  {index < workflow.length - 1 ? (
                    <span className="mt-1 h-full w-px bg-line" aria-hidden />
                  ) : null}
                </div>
                <div className="pb-1">
                  <p className="text-[12.5px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            to="/methodology"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-cyan"
          >
            Read the methodology
            <ArrowRight size={13} />
          </Link>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={<History size={16} />}
            title="Recent analysis runs"
            description="Runs executed in this browser against the local API. Stored locally; results are not persisted."
            action={
              history.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={13} />}
                  onClick={clearHistory}
                >
                  Clear
                </Button>
              ) : null
            }
          />
          {history.length === 0 ? (
            <EmptyState
              icon={<FlaskConical size={18} />}
              title="No runs recorded yet"
              description="A demo run is started automatically when the API is reachable. You can also configure and run your own analysis."
              action={
                <LinkButton to="/analysis" size="sm" variant="secondary">
                  Configure analysis
                </LinkButton>
              }
            />
          ) : (
            <div className="table-shell">
              <table className="data-table min-w-[560px]">
                <thead>
                  <tr>
                    <th scope="col">Run</th>
                    <th scope="col">Mode</th>
                    <th scope="col">Candidates</th>
                    <th scope="col">Top score</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <span className="block text-[12.5px] text-ink">
                          {run.topGene ?? "No candidate"}
                        </span>
                        <span className="mono mt-0.5 block text-[10.5px] text-ink-faint">
                          {run.label} · {run.source === "synthetic_demo" ? "synthetic" : "custom"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">{formatMode(run.mode)}</td>
                      <td className="mono">{run.candidateCount}</td>
                      <td className="mono text-ink">{formatScore(run.topScore)}</td>
                      <td className="whitespace-nowrap text-[12px]">{formatDateTime(run.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<ServerCog size={16} />}
            title="System status"
            description="Live readiness of the local FastAPI service."
          />
          <div className="space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink-muted">Backend</span>
              <ApiStatus />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink-muted">API version</span>
              <span className="mono text-ink-secondary">
                {health ? `v${health.api_version}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink-muted">Inheritance models</span>
              <span className="text-ink-secondary">
                {health ? health.supported_inheritance_modes.length : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink-muted">Demo dataset</span>
              <Badge tone={health?.demo_available ? "teal" : "rose"}>
                {health?.demo_available ? "available" : "unavailable"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-muted">Data source</span>
              <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                <Database size={13} aria-hidden />
                local synthetic JSON
              </span>
            </div>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
            Health is re-checked every 30 seconds. Analysis is computed by the Python engine —
            nothing is simulated in the browser.
          </p>
        </Card>
      </div>
    </>
  );
}

function StateError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <ErrorPanel
      title="Dataset unavailable"
      message={message}
      onRetry={onRetry}
    />
  );
}

export function OverviewLoading() {
  return <LoadingPanel />;
}
