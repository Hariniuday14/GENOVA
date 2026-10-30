import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FlaskConical,
  GitMerge,
  HelpCircle,
  Layers,
  ListOrdered,
  Target,
  XCircle,
} from "lucide-react";

import { useAnalysis } from "../lib/analysis-context";
import type { AnalysisResult, InheritanceCheck } from "../lib/types";
import { formatDateTime, formatMode, formatScore } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { Alert, EmptyState, ErrorPanel, LoadingPanel } from "../components/ui/States";
import { StatCard } from "../components/ui/StatCard";
import { ScoreBreakdown } from "../components/charts/ScoreBreakdown";

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function buildExportPayload(result: AnalysisResult) {
  return {
    project: "GENOVA",
    data_type:
      result.dataset_kind === "synthetic_demo" ? "synthetic_demo" : "custom_dataset",
    analysis_id: result.analysis_id,
    generated_at: result.generated_at,
    inheritance_mode: result.inheritance_mode,
    observed_phenotypes: result.observed_phenotypes,
    ranked_variants: result.results,
    inheritance_checks: result.inheritance_checks,
    compound_het_pairs: result.compound_het_pairs,
    score_scale: result.score_scale,
    summary: result.summary,
    disclaimer: result.disclaimer,
  };
}

function toCsv(result: AnalysisResult): string {
  const headers = [
    "rank",
    "variant_id",
    "gene",
    "score",
    "phenotype_points",
    "inheritance_compatible",
    "inheritance_reason",
    "effect_points",
    "frequency_points",
    "matched_phenotype_terms",
  ];

  const rows = result.results.map((item) =>
    [
      item.rank,
      item.variant_id,
      item.gene,
      item.score,
      item.phenotype_score,
      item.inheritance.compatible === null ? "undetermined" : item.inheritance.compatible,
      item.inheritance.reason,
      item.effect_points,
      item.frequency_points,
      item.phenotype.matched_terms.join("; "),
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\r\n");
}

function inheritanceBadge(check: Pick<InheritanceCheck, "compatible">) {
  if (check.compatible === true) {
    return (
      <Badge tone="teal" dot>
        Compatible
      </Badge>
    );
  }
  if (check.compatible === false) {
    return (
      <Badge tone="rose" dot>
        Incompatible
      </Badge>
    );
  }
  return (
    <Badge tone="amber" dot>
      Undetermined
    </Badge>
  );
}

function toneForProvenance(kind: AnalysisResult["dataset_kind"]): BadgeTone {
  return kind === "synthetic_demo" ? "amber" : "violet";
}

export function Results() {
  const { current, running, analysisError, runAnalysis, demo } = useAnalysis();

  if (running && !current) {
    return (
      <>
        <PageHeader
          eyebrow="Workspace"
          title="Analysis results"
          description="The engine is processing the dataset…"
        />
        <LoadingPanel label="Running the GENOVA variant engine…" />
      </>
    );
  }

  if (!current) {
    return (
      <>
        <PageHeader
          eyebrow="Workspace"
          title="Analysis results"
          description="A completed engine run is required before results can be displayed."
        />
        {analysisError ? (
          <ErrorPanel
            title="No results available"
            message={analysisError.message}
            errors={"errors" in analysisError ? (analysisError.errors as string[]) : []}
            onRetry={() =>
              demo &&
              void runAnalysis({
                family: demo.family,
                variants: demo.variants,
                observed_phenotypes: demo.observed_phenotypes,
                inheritance_mode: demo.inheritance_mode as never,
                label: "Synthetic demo family",
                source: "synthetic_demo",
              })
            }
          />
        ) : (
          <EmptyState
            icon={<FlaskConical size={20} />}
            title="No analysis has been run yet"
            description="Configure the inheritance model, phenotype terms, and candidate evidence, then run the engine."
            action={
              <LinkButton to="/analysis" icon={<FlaskConical size={15} />}>
                Configure analysis
              </LinkButton>
            }
          />
        )}
      </>
    );
  }

  const top = current.results[0];
  const matchedPhenotypes = top?.phenotype.matched_terms ?? [];
  const isSynthetic = current.dataset_kind === "synthetic_demo";

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Analysis results"
        description={
          <>
            Output of <code className="mono text-[12.5px] text-ink-secondary">rank_variants()</code>{" "}
            for the {isSynthetic ? "synthetic demonstration family" : "supplied dataset"} under a{" "}
            {formatMode(current.inheritance_mode).toLowerCase()} model. Scores are computed
            heuristics, not disease probabilities.
          </>
        }
        meta={
          <>
            <Badge tone={toneForProvenance(current.dataset_kind)} dot>
              {isSynthetic ? "Synthetic demo data" : "Custom dataset"}
            </Badge>
            <Badge tone="cyan">{formatMode(current.inheritance_mode)}</Badge>
            <Badge tone="neutral">Run {current.analysis_id}</Badge>
            <Badge tone="neutral">{formatDateTime(current.generated_at)}</Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              icon={<Download size={15} />}
              onClick={() =>
                downloadBlob(
                  JSON.stringify(buildExportPayload(current), null, 2),
                  `genova_${current.analysis_id}.json`,
                  "application/json",
                )
              }
            >
              Export JSON
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<ListOrdered size={15} />}
              onClick={() =>
                downloadBlob(
                  toCsv(current),
                  `genova_${current.analysis_id}.csv`,
                  "text/csv;charset=utf-8",
                )
              }
            >
              Export CSV
            </Button>
            <LinkButton to="/analysis" icon={<FlaskConical size={15} />}>
              New analysis
            </LinkButton>
          </>
        }
      />

      <Alert tone="warning" title="Interpretation limits" className="mb-6">
        {current.disclaimer} Phenotype matching is exact term overlap and inheritance checks are
        simplified heuristics; neither establishes causality, pathogenicity, or clinical risk.
      </Alert>

      {current.validation_errors.length > 0 ? (
        <Alert tone="warning" title="Engine warnings" className="mb-6">
          <ul className="space-y-1">
            {current.validation_errors.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Candidates ranked"
          value={current.summary.variants_analysed}
          hint={`${current.summary.family_members} family members · ${current.summary.affected_members} affected`}
          icon={<Layers size={16} />}
          accent="cyan"
        />
        <StatCard
          label="Top score"
          value={formatScore(current.summary.top_score)}
          unit="/ 100"
          hint={current.summary.top_candidate_gene ?? "No candidate"}
          icon={<Target size={16} />}
          accent="teal"
        />
        <StatCard
          label="Mean score"
          value={formatScore(current.summary.mean_score)}
          unit="/ 100"
          hint="Across all ranked candidates in this run"
          icon={<Activity size={16} />}
          accent="blue"
        />
        <StatCard
          label="Phenotype matches"
          value={`${current.summary.candidates_with_phenotype_match}/${current.results.length}`}
          hint={`${current.summary.inheritance_compatible} compatible with ${formatMode(current.inheritance_mode)}`}
          icon={<CheckCircle2 size={16} />}
          accent="neutral"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={<Activity size={16} />}
            title="Score composition"
            description="Each candidate's total decomposes into phenotype overlap, inheritance compatibility, and the two supplied evidence fields. Scale: 0–100."
            action={<Badge tone="neutral">Computed</Badge>}
          />
          <ScoreBreakdown results={current.results} scale={current.score_scale} height={310} />
        </Card>

        <Card>
          <CardHeader
            icon={<Target size={16} />}
            title="Top candidate"
            description="Rank 1 under the current configuration."
            action={<Badge tone="teal">Rank 1</Badge>}
          />
          {top ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-ink">{top.gene}</p>
                  <p className="mono mt-1 text-[11.5px] text-ink-faint">{top.variant_id}</p>
                </div>
                <div className="text-right">
                  <p className="mono text-[30px] font-semibold leading-none text-white">
                    {formatScore(top.score)}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">out of 100</p>
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <p className="eyebrow mb-2">Matched phenotype terms</p>
                {matchedPhenotypes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matchedPhenotypes.map((term) => (
                      <span
                        key={term}
                        className="mono rounded border border-accent-teal/30 bg-accent-teal/[0.08] px-1.5 py-0.5 text-[10.5px] text-accent-teal"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-ink-muted">No exact term overlap.</p>
                )}
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <p className="eyebrow mb-2">Engine reasoning</p>
                <ul className="space-y-2">
                  {top.reasons.slice(0, 2).map((reason) => (
                    <li key={reason} className="flex gap-2 text-[12px] leading-relaxed text-ink-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-cyan" aria-hidden />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-midnight-900/50 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-ink-faint">{top.interpretation}</p>
              </div>
            </div>
          ) : (
            <EmptyState title="No candidates" description="The engine returned no ranked variants." />
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          icon={<ListOrdered size={16} />}
          title="Ranked candidates"
          description="Ranking order produced by the engine. Expand a row for the complete reasoning and component values."
          action={<Badge tone="neutral">{current.results.length} rows</Badge>}
        />
        <div className="table-shell">
          <table className="data-table min-w-[860px]">
            <caption className="sr-only">
              Ranked candidate variants with computed prioritisation scores
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Candidate</th>
                <th scope="col">Score / 100</th>
                <th scope="col">Phenotype</th>
                <th scope="col">Inheritance</th>
                <th scope="col">Effect</th>
                <th scope="col">Frequency</th>
                <th scope="col">Matched terms</th>
              </tr>
            </thead>
            <tbody>
              {current.results.map((item) => (
                <tr key={item.variant_id}>
                  <td className="mono text-ink">{String(item.rank).padStart(2, "0")}</td>
                  <td>
                    <span className="block text-[12.5px] font-medium text-ink">{item.gene}</span>
                    <span className="mono mt-0.5 block text-[10.5px] text-ink-faint">
                      {item.variant_id}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="mono w-9 text-ink">{formatScore(item.score)}</span>
                      <span className="h-1 w-16 overflow-hidden rounded-full bg-midnight-700">
                        <span
                          className="block h-full rounded-full bg-accent-cyan"
                          style={{ width: `${Math.min(100, item.score)}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="mono">{formatScore(item.phenotype_score)} / 50</td>
                  <td>{inheritanceBadge(item.inheritance)}</td>
                  <td className="mono">{formatScore(item.effect_points)} / 15</td>
                  <td className="mono">{formatScore(item.frequency_points)} / 10</td>
                  <td>
                    {item.phenotype.matched_terms.length > 0 ? (
                      <span className="mono text-[11px] text-accent-teal">
                        {item.phenotype.matched_terms.join(", ")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">none</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2">
          {current.results.map((item) => (
            <details
              key={item.variant_id}
              className="group rounded-lg border border-line bg-midnight-900/40 open:border-line-strong open:bg-midnight-900/70"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12.5px] text-ink-secondary [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="mono text-ink-faint">{String(item.rank).padStart(2, "0")}</span>
                  <span className="truncate">
                    <span className="text-ink">{item.gene}</span>{" "}
                    <span className="mono text-[11px] text-ink-faint">{item.variant_id}</span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="mono text-ink">{formatScore(item.score)}</span>
                  <ChevronDown
                    size={15}
                    className="text-ink-faint transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </span>
              </summary>
              <div className="grid gap-5 border-t border-line px-4 py-4 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-2">Engine reasons</p>
                  <ul className="space-y-2">
                    {item.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2 text-[12px] leading-relaxed text-ink-muted">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-cyan" aria-hidden />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow mb-2">Inheritance check</p>
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    {item.inheritance.reason}
                  </p>
                  <p className="eyebrow mb-2 mt-4">Phenotype matching</p>
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    Method: <span className="mono">{item.phenotype.method}</span> · overlap score{" "}
                    <span className="mono">{item.phenotype.score.toFixed(3)}</span>
                  </p>
                  {item.phenotype.unmatched_observed_terms.length > 0 ? (
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                      Unmatched observed terms:{" "}
                      <span className="mono">
                        {item.phenotype.unmatched_observed_terms.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </details>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={<GitMerge size={16} />}
            title="Inheritance compatibility"
            description={`Simplified ${formatMode(current.inheritance_mode).toLowerCase()} check per candidate. "Undetermined" means the available genotypes cannot establish compatibility.`}
            action={<Badge tone="cyan">{formatMode(current.inheritance_mode)}</Badge>}
          />
          <div className="table-shell">
            <table className="data-table min-w-[620px]">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Gene</th>
                  <th scope="col">Result</th>
                  <th scope="col">Reason</th>
                </tr>
              </thead>
              <tbody>
                {current.inheritance_checks.map((check) => (
                  <tr key={check.variant_id}>
                    <td className="mono text-ink-secondary">{check.variant_id}</td>
                    <td className="text-ink">{check.gene}</td>
                    <td>{inheritanceBadge(check)}</td>
                    <td className="max-w-[360px] whitespace-normal leading-relaxed">
                      {check.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<Layers size={16} />}
              title="Observed phenotype terms"
              description="Terms compared against every candidate."
            />
            {current.observed_phenotypes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {current.observed_phenotypes.map((term) => (
                  <span
                    key={term}
                    className="mono rounded border border-line bg-midnight-800/80 px-2 py-1 text-[11px] text-ink-secondary"
                  >
                    {term}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-ink-muted">No terms selected for this run.</p>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={<HelpCircle size={16} />}
              title="Reading the output"
              description="Observations, computed values, and interpretations are distinct."
            />
            <dl className="space-y-3 text-[11.5px] leading-relaxed">
              <div>
                <dt className="font-medium text-ink-secondary">Observation</dt>
                <dd className="text-ink-faint">
                  Input genotypes, affected status, and supplied annotations.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Computed score</dt>
                <dd className="text-ink-faint">
                  Deterministic arithmetic from the 100-point heuristic scale.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Interpretation</dt>
                <dd className="text-ink-faint">
                  Engine text describing heuristic outcomes — never a diagnosis.
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader
          icon={<GitMerge size={16} />}
          title="Compound heterozygous candidate pairs"
          description="Pairs of heterozygous variants in the same gene, in an affected individual. Phase is reported only when supplied; trans configuration is never assumed."
          action={<Badge tone="neutral">{current.compound_het_pairs.length} pair(s)</Badge>}
        />
        {current.compound_het_pairs.length > 0 ? (
          <div className="table-shell">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th scope="col">Gene</th>
                  <th scope="col">Individual</th>
                  <th scope="col">Variant 1</th>
                  <th scope="col">Variant 2</th>
                  <th scope="col">Phase</th>
                  <th scope="col">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {current.compound_het_pairs.map((pair, index) => (
                  <tr key={`${pair.gene}-${pair.individual}-${index}`}>
                    <td className="text-ink">{pair.gene}</td>
                    <td className="mono">{pair.individual}</td>
                    <td className="mono text-ink-secondary">{pair.variant_1}</td>
                    <td className="mono text-ink-secondary">{pair.variant_2}</td>
                    <td>
                      <Badge tone={pair.phase_status === "reported_in_trans" ? "teal" : "amber"}>
                        {pair.phase_status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="max-w-[320px] whitespace-normal leading-relaxed">
                      {pair.interpretation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center">
            <GitMerge size={18} className="mx-auto mb-2 text-ink-faint" aria-hidden />
            <p className="text-[13px] text-ink-secondary">
              No candidate pairs were returned for this dataset and configuration.
            </p>
            <p className="mx-auto mt-1 max-w-lg text-[11.5px] leading-relaxed text-ink-faint">
              The engine requires two heterozygous variants in the same gene within an affected
              individual. Absence of a pair is not evidence against compound heterozygosity.
            </p>
          </div>
        )}
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<AlertTriangle size={16} />}
            title="Limitations"
            description="Read before sharing or interpreting this output."
          />
          <ul className="space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
            <li className="flex gap-2">
              <XCircle size={13} className="mt-0.5 shrink-0 text-rose-300" aria-hidden />
              Scores are engineered heuristics, not probabilities of disease or pathogenicity.
            </li>
            <li className="flex gap-2">
              <XCircle size={13} className="mt-0.5 shrink-0 text-rose-300" aria-hidden />
              Phenotype matching is exact string overlap; it is not HPO ontology similarity.
            </li>
            <li className="flex gap-2">
              <XCircle size={13} className="mt-0.5 shrink-0 text-rose-300" aria-hidden />
              Inheritance checks are simplified and cannot prove a mode of inheritance.
            </li>
            <li className="flex gap-2">
              <XCircle size={13} className="mt-0.5 shrink-0 text-rose-300" aria-hidden />
              No external annotation, population, or clinical database is queried.
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader
            icon={<Download size={16} />}
            title="Export this run"
            description="Downloads are generated from the current response, including provenance and the disclaimer."
          />
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              icon={<Download size={15} />}
              onClick={() =>
                downloadBlob(
                  JSON.stringify(buildExportPayload(current), null, 2),
                  `genova_${current.analysis_id}.json`,
                  "application/json",
                )
              }
            >
              JSON report
            </Button>
            <Button
              variant="secondary"
              icon={<ListOrdered size={15} />}
              onClick={() =>
                downloadBlob(
                  toCsv(current),
                  `genova_${current.analysis_id}.csv`,
                  "text/csv;charset=utf-8",
                )
              }
            >
              CSV table
            </Button>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
            {isSynthetic
              ? "This run used the bundled fictional demonstration dataset."
              : "This run used a custom dataset supplied in the browser. Confirm it contains no real patient data before sharing."}
          </p>
        </Card>
      </div>
    </>
  );
}
