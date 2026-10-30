import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  FlaskConical,
  Info,
  RefreshCw,
  Scale,
  ShieldCheck,
  Target,
} from "lucide-react";

import { api, ApiError } from "../lib/api";
import { useAnalysis } from "../lib/analysis-context";
import type { EvaluationResponse, InheritanceMode } from "../lib/types";
import { INHERITANCE_MODES } from "../lib/types";
import { cn, formatMode, formatPercent, formatScore } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Alert, ErrorPanel, LoadingPanel } from "../components/ui/States";
import { StatCard } from "../components/ui/StatCard";
import { HitRateChart } from "../components/charts/HitRateChart";

const metricDefinitions = [
  {
    label: "Top-1 hit rate",
    definition:
      "Fraction of labelled cases where the seeded target variant is ranked first.",
  },
  {
    label: "Top-k hit rate",
    definition:
      "Fraction of labelled cases where the target appears anywhere in the first k ranks.",
  },
  {
    label: "Mean reciprocal rank",
    definition:
      "Mean of 1 / rank of the target. A single case ranked first gives 1.0.",
  },
];

export function Evaluation() {
  const { current, demo } = useAnalysis();

  const initialMode =
    (current?.inheritance_mode as InheritanceMode | undefined) ??
    ((demo?.inheritance_mode as InheritanceMode | undefined) ?? "autosomal_recessive");

  const [mode, setMode] = useState<InheritanceMode>(initialMode);
  const [data, setData] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const load = useCallback(async (targetMode: InheritanceMode) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.evaluation(targetMode);
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Evaluation failed."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(mode);
  }, [mode, load]);

  const hitRates = data?.metrics.top_k_hit_rates ?? {};
  const target = data?.labelled_target_variant_id ?? "SYN-V001";

  return (
    <>
      <PageHeader
        eyebrow="Validation"
        title="Evaluation"
        description={
          <>
            Genuine output of the Python evaluation module, computed by re-running the ranking
            engine against the single labelled synthetic case bundled with the demo dataset.
            Nothing on this page is illustrative or simulated.
          </>
        }
        meta={
          <>
            <Badge tone="amber" dot>
              Synthetic benchmark
            </Badge>
            {data ? <Badge tone="cyan">{formatMode(data.inheritance_mode)}</Badge> : null}
            {data ? <Badge tone="neutral">n = {data.number_of_cases} labelled case</Badge> : null}
          </>
        }
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={15} />}
            loading={loading}
            onClick={() => void load(mode)}
          >
            Recompute
          </Button>
        }
      />

      <Alert tone="info" title="Scope of this evaluation" className="mb-6">
        {data?.case_note ??
          "The evaluation uses one explicitly labelled synthetic case. Metrics demonstrate the evaluation pipeline; they do not establish generalisable or clinical performance."}
      </Alert>

      <Card className="mb-5">
        <CardHeader
          icon={<Scale size={16} />}
          title="Evaluation configuration"
          description="The inheritance model changes the engine's compatibility component, so metrics are recomputed per mode. The labelled target variant is fixed by the dataset."
          action={
            data ? (
              <Badge tone="neutral">
                target · <span className="mono ml-1">{target}</span>
              </Badge>
            ) : null
          }
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Evaluation inheritance mode">
          {INHERITANCE_MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-[12.5px] transition-colors",
                mode === item.value
                  ? "border-accent-cyan/45 bg-accent-cyan/[0.08] text-ink"
                  : "border-line bg-midnight-900/50 text-ink-muted hover:border-line-strong hover:text-ink-secondary",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
          GET <span className="mono">/api/evaluation?inheritance_mode={mode}</span> · calls{" "}
          <span className="mono">evaluation.evaluate_cases()</span> and{" "}
          <span className="mono">phenotype_only_ranking()</span>
        </p>
      </Card>

      {loading ? (
        <LoadingPanel label="Running the evaluation against the labelled synthetic case…" />
      ) : error ? (
        <ErrorPanel
          title="Evaluation unavailable"
          message={error.message}
          errors={"errors" in error ? (error.errors as string[]) : []}
          onRetry={() => void load(mode)}
        />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Top-1 hit rate"
              value={formatPercent(hitRates.top_1)}
              hint={`Target ranked first in ${Math.round((hitRates.top_1 ?? 0) * data.number_of_cases)} of ${data.number_of_cases} case(s)`}
              icon={<Target size={16} />}
              accent="teal"
            />
            <StatCard
              label="Top-3 hit rate"
              value={formatPercent(hitRates.top_3)}
              hint="Target within the first three ranks"
              icon={<BarChart3 size={16} />}
              accent="cyan"
            />
            <StatCard
              label="Top-5 hit rate"
              value={formatPercent(hitRates.top_5)}
              hint="Target within the first five ranks"
              icon={<CheckCircle2 size={16} />}
              accent="blue"
            />
            <StatCard
              label="Mean reciprocal rank"
              value={formatScore(data.metrics.mean_reciprocal_rank, 2)}
              unit="/ 1.00"
              hint="Higher is better; 1.00 means rank 1"
              icon={<ShieldCheck size={16} />}
              accent="neutral"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                icon={<BarChart3 size={16} />}
                title="Top-k hit rates"
                description="Measured on the labelled synthetic demonstration case. With a single case each rate can only be 0% or 100%."
                action={<Badge tone="amber">n = {data.number_of_cases}</Badge>}
              />
              <HitRateChart hitRates={hitRates} />
              <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-faint">
                {data.metrics.metric_note} A perfect score here reflects one seeded case, not
                model validity.
              </p>
            </Card>

            <Card>
              <CardHeader
                icon={<Info size={16} />}
                title="Metric definitions"
                description="Applied exactly as implemented in evaluation.py."
              />
              <dl className="space-y-4">
                {metricDefinitions.map((item) => (
                  <div key={item.label} className="border-b border-line/60 pb-3 last:border-0 last:pb-0">
                    <dt className="text-[12.5px] font-medium text-ink">{item.label}</dt>
                    <dd className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                      {item.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <Card className="mt-5">
            <CardHeader
              icon={<FlaskConical size={16} />}
              title="Engine ranking vs phenotype-only baseline"
              description="The full engine score (0–100) and the baseline's exact term-overlap fraction (0–1) use different scales and are shown side by side, not as a like-for-like accuracy comparison."
              action={<Badge tone="violet">Baseline: term overlap only</Badge>}
            />
            <div className="table-shell">
              <table className="data-table min-w-[820px]">
                <caption className="sr-only">
                  Engine ranking compared with phenotype-only baseline ranking
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Engine rank</th>
                    <th scope="col">Candidate</th>
                    <th scope="col">Gene</th>
                    <th scope="col">Engine score</th>
                    <th scope="col">Inheritance</th>
                    <th scope="col">Baseline rank</th>
                    <th scope="col">Baseline overlap</th>
                    <th scope="col">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankings.map((ranking) => {
                    const baseline = data.baseline_rankings.find(
                      (item) => item.variant_id === ranking.variant_id,
                    );
                    return (
                      <tr key={ranking.variant_id}>
                        <td className="mono text-ink">{String(ranking.rank).padStart(2, "0")}</td>
                        <td className="mono text-ink-secondary">{ranking.variant_id}</td>
                        <td className="text-ink">{ranking.gene}</td>
                        <td className="mono text-ink">{formatScore(ranking.score)}</td>
                        <td>
                          {ranking.inheritance_compatible === true ? (
                            <Badge tone="teal">Compatible</Badge>
                          ) : ranking.inheritance_compatible === false ? (
                            <Badge tone="rose">Incompatible</Badge>
                          ) : (
                            <Badge tone="amber">Undetermined</Badge>
                          )}
                        </td>
                        <td className="mono">{baseline ? String(baseline.rank).padStart(2, "0") : "—"}</td>
                        <td className="mono">
                          {baseline ? baseline.score.toFixed(3) : "—"}
                        </td>
                        <td>
                          {ranking.variant_id === target ? (
                            <Badge tone="amber" dot>
                              Seeded target
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-ink-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
              {data.metrics.phenotype_only_baseline.note} Baseline ties follow input order, so a
              baseline rank is not a probability.
            </p>
          </Card>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                icon={<Info size={16} />}
                title="What this establishes"
                description="Honest scope of the evidence shown above."
              />
              <ul className="space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
                <li className="flex gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-accent-teal" aria-hidden />
                  The ranking, scoring, and evaluation code paths execute end to end on a labelled
                  synthetic case.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-accent-teal" aria-hidden />
                  The seeded target is recovered under the evaluated configuration, showing the
                  pipeline is wired correctly.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-accent-teal" aria-hidden />
                  The phenotype-only baseline is computed independently with the same inputs.
                </li>
              </ul>
            </Card>

            <Card>
              <CardHeader
                icon={<ShieldCheck size={16} />}
                title="What this does not establish"
                description="Limits that follow directly from a single seeded case."
              />
              <ul className="space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
                <li>• Any estimate of accuracy, precision, recall, or generalisation.</li>
                <li>• Clinical validity, utility, or safety of the prototype.</li>
                <li>• Superiority over the phenotype-only baseline or other methods.</li>
                <li>• Performance on real families, other ancestries, or other phenotypes.</li>
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
                {data.metrics.interpretation}
              </p>
            </Card>
          </div>

          <Card className="mt-5">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-ink-secondary [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-accent-cyan" aria-hidden />
                  Raw evaluation payload
                </span>
                <span className="text-[11px] text-ink-faint group-open:hidden">Show JSON</span>
                <span className="hidden text-[11px] text-ink-faint group-open:inline">Hide</span>
              </summary>
              <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-line bg-midnight-950/80 p-4 font-mono text-[11px] leading-relaxed text-ink-secondary">
                {JSON.stringify(data.metrics, null, 2)}
              </pre>
            </details>
          </Card>
        </>
      ) : null}
    </>
  );
}
