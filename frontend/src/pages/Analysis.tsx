import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Braces,
  Check,
  Dna,
  FlaskConical,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { useAnalysis } from "../lib/analysis-context";
import type {
  FamilyMember,
  InheritanceMode,
  Variant,
} from "../lib/types";
import { INHERITANCE_MODES } from "../lib/types";
import { cn, formatMode } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { Alert, ErrorPanel, LoadingPanel } from "../components/ui/States";
import { Field, Range } from "../components/ui/Field";

interface Dataset {
  label: string;
  description: string;
  family: FamilyMember[];
  variants: Variant[];
  observed_phenotypes: string[];
  inheritance_mode: InheritanceMode;
  source: "synthetic_demo" | "custom";
}

const MODE_VALUES = INHERITANCE_MODES.map((mode) => mode.value);

function isMode(value: unknown): value is InheritanceMode {
  return typeof value === "string" && MODE_VALUES.includes(value as InheritanceMode);
}

function genotypeTone(genotype: string | null | undefined): string {
  const value = String(genotype ?? "").toUpperCase();
  if (["ALT", "ALT/ALT", "1/1", "1|1"].includes(value)) return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (["HET", "0/1", "1/0", "0|1", "1|0"].includes(value)) return "border-accent-cyan/25 bg-accent-cyan/[0.08] text-accent-cyan";
  if (["REF", "0/0", "0|0"].includes(value)) return "border-line bg-midnight-800 text-ink-muted";
  return "border-line bg-midnight-800 text-ink-faint";
}

export function Analysis() {
  const navigate = useNavigate();
  const {
    demo,
    demoState,
    demoError,
    reloadDemo,
    runAnalysis,
    running,
    analysisError,
    clearAnalysisError,
    healthState,
  } = useAnalysis();

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [mode, setMode] = useState<InheritanceMode>("autosomal_recessive");
  const [terms, setTerms] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [evidence, setEvidence] = useState<Record<string, { effect: number; frequency: number }>>({});
  const [label, setLabel] = useState("Synthetic demo family");
  const [termDraft, setTermDraft] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const applyDataset = (next: Dataset) => {
    setDataset(next);
    setMode(next.inheritance_mode);
    setTerms(next.observed_phenotypes);
    setSelected(Object.fromEntries(next.variants.map((variant) => [variant.id, true])));
    setEvidence(
      Object.fromEntries(
        next.variants.map((variant) => [
          variant.id,
          {
            effect: Math.min(15, Math.max(0, Number(variant.effect_evidence ?? 0))),
            frequency: Math.min(10, Math.max(0, Number(variant.frequency_evidence ?? 0))),
          },
        ]),
      ),
    );
    setLabel(next.source === "synthetic_demo" ? "Synthetic demo family" : next.label);
    setLocalError(null);
  };

  useEffect(() => {
    if (!demo || dataset) return;
    applyDataset({
      label: "Synthetic demo family",
      description: demo.description,
      family: demo.family,
      variants: demo.variants,
      observed_phenotypes: demo.observed_phenotypes,
      inheritance_mode: isMode(demo.inheritance_mode) ? demo.inheritance_mode : "autosomal_recessive",
      source: "synthetic_demo",
    });
    // dataset is intentionally excluded: it is only used as an "already loaded" guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, dataset]);

  const termOptions = useMemo(() => {
    const values = new Set<string>(terms);
    dataset?.variants.forEach((variant) =>
      (variant.phenotype_terms ?? []).forEach((term) => values.add(term)),
    );
    return [...values].sort();
  }, [dataset, terms]);

  const selectedVariants = useMemo(
    () => (dataset ? dataset.variants.filter((variant) => selected[variant.id]) : []),
    [dataset, selected],
  );

  const affectedIds = useMemo(
    () =>
      (dataset?.family ?? [])
        .filter((member) => member.affected === true)
        .map((member) => member.id),
    [dataset],
  );

  const activeMode = INHERITANCE_MODES.find((item) => item.value === mode)!;

  const toggleVariant = (id: string) => {
    setSelected((previous) => ({ ...previous, [id]: !previous[id] }));
    setLocalError(null);
  };

  const toggleTerm = (term: string) => {
    setTerms((previous) =>
      previous.includes(term) ? previous.filter((value) => value !== term) : [...previous, term],
    );
  };

  const addTerm = () => {
    const value = termDraft.trim();
    if (!value) return;
    setTerms((previous) => (previous.includes(value) ? previous : [...previous, value]));
    setTermDraft("");
  };

  const updateEvidence = (id: string, key: "effect" | "frequency", value: number) => {
    setEvidence((previous) => ({
      ...previous,
      [id]: { ...(previous[id] ?? { effect: 0, frequency: 0 }), [key]: value },
    }));
  };

  const loadImport = () => {
    setImportError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch (error) {
      setImportError(`JSON parse error: ${(error as Error).message}`);
      return;
    }

    const record = parsed as Record<string, unknown>;

    if (!Array.isArray(record.family) || record.family.length === 0) {
      setImportError("Expected a non-empty `family` array.");
      return;
    }
    if (!Array.isArray(record.variants) || record.variants.length === 0) {
      setImportError("Expected a non-empty `variants` array.");
      return;
    }
    if (!isMode(record.inheritance_mode)) {
      setImportError("`inheritance_mode` must be autosomal_recessive, autosomal_dominant, or x_linked.");
      return;
    }
    if (
      record.observed_phenotypes !== undefined &&
      !Array.isArray(record.observed_phenotypes)
    ) {
      setImportError("`observed_phenotypes` must be an array of strings.");
      return;
    }

    const variants = (record.variants as Variant[]).map((variant) => ({
      ...variant,
      genotypes: variant.genotypes ?? {},
      phenotype_terms: variant.phenotype_terms ?? [],
    }));

    applyDataset({
      label: "Custom dataset",
      description: "Custom dataset supplied as JSON. Server-side validation still applies.",
      family: record.family as FamilyMember[],
      variants,
      observed_phenotypes: (record.observed_phenotypes as string[]) ?? [],
      inheritance_mode: record.inheritance_mode,
      source: "custom",
    });
    setImportOpen(false);
    setImportText("");
  };

  const resetToDemo = () => {
    if (!demo) return;
    applyDataset({
      label: "Synthetic demo family",
      description: demo.description,
      family: demo.family,
      variants: demo.variants,
      observed_phenotypes: demo.observed_phenotypes,
      inheritance_mode: isMode(demo.inheritance_mode) ? demo.inheritance_mode : "autosomal_recessive",
      source: "synthetic_demo",
    });
    setImportError(null);
    setImportText("");
    clearAnalysisError();
  };

  const submit = async () => {
    if (!dataset) return;

    if (selectedVariants.length === 0) {
      setLocalError("Select at least one candidate variant to analyse.");
      return;
    }

    const payload = {
      family: dataset.family,
      variants: selectedVariants.map((variant) => ({
        ...variant,
        effect_evidence: evidence[variant.id]?.effect ?? 0,
        frequency_evidence: evidence[variant.id]?.frequency ?? 0,
      })),
      observed_phenotypes: terms,
      inheritance_mode: mode,
      label: label.trim() || (dataset.source === "synthetic_demo" ? "Synthetic demo family" : "Custom dataset"),
      source: dataset.source,
    };

    const result = await runAnalysis(payload);
    if (result) navigate("/results");
  };

  if (demoState === "loading" && !dataset) {
    return (
      <>
        <PageHeader
          eyebrow="Workspace"
          title="Configure a family analysis"
          description="Loading the synthetic demonstration dataset from the Python API…"
        />
        <LoadingPanel label="Loading the synthetic family dataset…" />
      </>
    );
  }

  if (!dataset) {
    return (
      <>
        <PageHeader
          eyebrow="Workspace"
          title="Configure a family analysis"
          description="The analysis form needs a family dataset from the engine."
        />
        <ErrorPanel
          title="Demo dataset unavailable"
          message={demoError ?? "The GENOVA API did not return a dataset."}
          onRetry={() => void reloadDemo()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Configure a family analysis"
        description="Every control maps to an input accepted by the existing Python engine. Adjust the inheritance model, phenotype terms, and supplied evidence values, then run the real analysis."
        meta={
          <>
            <Badge tone={dataset.source === "synthetic_demo" ? "amber" : "violet"} dot>
              {dataset.source === "synthetic_demo" ? "Synthetic demo dataset" : "Custom dataset"}
            </Badge>
            <Badge tone="neutral">{dataset.family.length} family members</Badge>
            <Badge tone="neutral">{dataset.variants.length} candidate variants</Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              icon={<Braces size={15} />}
              onClick={() => setImportOpen((value) => !value)}
              aria-expanded={importOpen}
            >
              Import dataset
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon={<RotateCcw size={15} />}
              onClick={resetToDemo}
              disabled={!demo}
            >
              Reset
            </Button>
          </>
        }
      />

      {importOpen ? (
        <Card className="mb-5">
          <CardHeader
            icon={<Braces size={16} />}
            title="Import a dataset"
            description="Paste JSON with family, variants, observed_phenotypes, and inheritance_mode. The API re-validates every record with the engine's own rules."
            action={
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
                Close
              </Button>
            }
          />
          <label htmlFor="dataset-json" className="label">
            Dataset JSON
          </label>
          <textarea
            id="dataset-json"
            rows={9}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder='{ "family": [...], "variants": [...], "observed_phenotypes": [...], "inheritance_mode": "autosomal_recessive" }'
            className="input mono text-[12px] leading-relaxed"
            spellCheck={false}
          />
          {importError ? (
            <p className="mt-2 text-[12px] text-rose-300" role="alert">
              {importError}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={loadImport} icon={<Check size={14} />}>
              Validate &amp; load
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setImportText(
                  JSON.stringify(
                    {
                      family: dataset.family,
                      variants: dataset.variants,
                      observed_phenotypes: dataset.observed_phenotypes,
                      inheritance_mode: dataset.inheritance_mode,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Insert current dataset
            </Button>
          </div>
        </Card>
      ) : null}

      {localError ? (
        <Alert tone="danger" className="mb-5" title="Cannot start analysis">
          {localError}
        </Alert>
      ) : null}

      {healthState === "error" ? (
        <Alert tone="danger" className="mb-5" title="Backend not reachable">
          The GENOVA API is offline. Start it with{" "}
          <code className="mono text-[12px] text-ink">python -m uvicorn api:app --port 8000</code>{" "}
          and reload this page.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<SlidersHorizontal size={16} />}
              title="Inheritance model"
              description="Applied by check_inheritance() to every candidate. These are simplified compatibility heuristics, not proof of inheritance."
            />
            <div role="radiogroup" aria-label="Inheritance model" className="grid gap-3 sm:grid-cols-3">
              {INHERITANCE_MODES.map((item) => {
                const active = mode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(item.value)}
                    className={cn(
                      "rounded-lg border p-3.5 text-left transition-all duration-150",
                      active
                        ? "border-accent-cyan/50 bg-accent-cyan/[0.07] shadow-[0_0_0_1px_rgba(45,212,230,0.15)]"
                        : "border-line bg-midnight-900/50 hover:border-line-strong hover:bg-midnight-800/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[13px] font-medium", active ? "text-ink" : "text-ink-secondary")}>
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border",
                          active ? "border-accent-cyan bg-accent-cyan/20" : "border-line-strong",
                        )}
                        aria-hidden
                      >
                        {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" /> : null}
                      </span>
                    </div>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<Sparkles size={16} />}
              title="Observed phenotype terms"
              description="Compared to each candidate's supplied terms using exact term overlap (not ontology-based semantic similarity)."
              action={<Badge tone="cyan">{terms.length} selected</Badge>}
            />

            <div className="flex flex-wrap gap-2" role="group" aria-label="Observed phenotype terms">
              {termOptions.map((term) => {
                const active = terms.includes(term);
                return (
                  <button
                    key={term}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTerm(term)}
                    className={cn(
                      "mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                      active
                        ? "border-accent-teal/40 bg-accent-teal/10 text-accent-teal"
                        : "border-line bg-midnight-900/60 text-ink-muted hover:border-line-strong hover:text-ink-secondary",
                    )}
                  >
                    {active ? <Check size={11} aria-hidden /> : null}
                    {term}
                  </button>
                );
              })}
              {terms
                .filter((term) => !termOptions.includes(term))
                .map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => toggleTerm(term)}
                    className="mono inline-flex items-center gap-1.5 rounded-full border border-accent-teal/40 bg-accent-teal/10 px-2.5 py-1 text-[11.5px] text-accent-teal"
                  >
                    {term}
                    <X size={11} aria-hidden />
                  </button>
                ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="new-term" className="sr-only">
                  Add a phenotype term
                </label>
                <input
                  id="new-term"
                  value={termDraft}
                  onChange={(event) => setTermDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTerm();
                    }
                  }}
                  placeholder="Add a term, e.g. HP:0001250"
                  className="input mono"
                />
              </div>
              <Button variant="secondary" onClick={addTerm} disabled={!termDraft.trim()}>
                Add term
              </Button>
            </div>
            {terms.length === 0 ? (
              <p className="mt-3 text-[11.5px] text-amber-300/90">
                No observed terms selected — the phenotype component will contribute 0 points
                for every candidate.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              icon={<Dna size={16} />}
              title="Candidate variants"
              description="Include or exclude candidates and adjust the two caller-supplied evidence fields. Genotypes come from the dataset and are shown as provided."
              action={<Badge tone="neutral">{selectedVariants.length} included</Badge>}
            />

            <div className="space-y-3">
              {dataset.variants.map((variant) => {
                const isSelected = Boolean(selected[variant.id]);
                const values = evidence[variant.id] ?? {
                  effect: Number(variant.effect_evidence ?? 0),
                  frequency: Number(variant.frequency_evidence ?? 0),
                };

                return (
                  <div
                    key={variant.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      isSelected
                        ? "border-line-strong bg-midnight-900/60"
                        : "border-line bg-midnight-900/25 opacity-70",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVariant(variant.id)}
                          className="mt-0.5 h-4 w-4 rounded border-line-strong bg-midnight-800 accent-accent-cyan"
                          aria-label={`Include ${variant.id} (${variant.gene})`}
                        />
                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[13.5px] font-medium text-ink">{variant.gene}</span>
                            <span className="mono text-[11px] text-ink-faint">{variant.id}</span>
                          </span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {(variant.phenotype_terms ?? []).length > 0 ? (
                              (variant.phenotype_terms ?? []).map((term) => {
                                const matched = terms.includes(term);
                                return (
                                  <span
                                    key={term}
                                    className={cn(
                                      "mono rounded border px-1.5 py-0.5 text-[10.5px]",
                                      matched
                                        ? "border-accent-teal/30 bg-accent-teal/[0.08] text-accent-teal"
                                        : "border-line bg-midnight-800/80 text-ink-faint",
                                    )}
                                  >
                                    {term}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[11.5px] text-ink-faint">No phenotype terms supplied</span>
                            )}
                          </span>
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-1.5">
                        {affectedIds.map((memberId) => (
                          <span
                            key={memberId}
                            className={cn(
                              "mono rounded border px-1.5 py-0.5 text-[10.5px]",
                              genotypeTone(variant.genotypes?.[memberId]),
                            )}
                            title={`${memberId} (affected): ${variant.genotypes?.[memberId] ?? "missing"}`}
                          >
                            {memberId} · {variant.genotypes?.[memberId] ?? "—"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 border-t border-line/70 pt-3.5 sm:grid-cols-2">
                      <Range
                        id={`effect-${variant.id}`}
                        label="Effect evidence"
                        value={values.effect}
                        min={0}
                        max={15}
                        step={0.5}
                        onChange={(value) => updateEvidence(variant.id, "effect", value)}
                        display={`${values.effect.toFixed(1)} / 15`}
                      />
                      <Range
                        id={`frequency-${variant.id}`}
                        label="Frequency evidence"
                        value={values.frequency}
                        min={0}
                        max={10}
                        step={0.5}
                        onChange={(value) => updateEvidence(variant.id, "frequency", value)}
                        display={`${values.frequency.toFixed(1)} / 10`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-[88px] lg:self-start">
          <Card>
            <CardHeader
              icon={<FlaskConical size={16} />}
              title="Run analysis"
              description="Calls POST /api/analysis, which executes rank_variants(), check_inheritance(), and find_compound_het_pairs()."
            />

            <Field label="Run label" htmlFor="run-label" hint="Recorded with the run summary.">
              <input
                id="run-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={120}
                className="input"
                placeholder="Synthetic demo family"
              />
            </Field>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Inheritance model</dt>
                <dd className="text-right text-ink">{activeMode.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Candidates</dt>
                <dd className="mono text-ink">{selectedVariants.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Family members</dt>
                <dd className="mono text-ink">{dataset.family.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Observed terms</dt>
                <dd className="mono text-ink">{terms.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Data provenance</dt>
                <dd className="text-right">
                  <Badge tone={dataset.source === "synthetic_demo" ? "amber" : "violet"}>
                    {dataset.source === "synthetic_demo" ? "synthetic" : "custom"}
                  </Badge>
                </dd>
              </div>
            </dl>

            {analysisError ? (
              <ErrorPanel
                className="mt-4"
                title="Analysis failed"
                message={analysisError.message}
                errors={"errors" in analysisError ? (analysisError.errors as string[]) : []}
                onRetry={() => void submit()}
              />
            ) : null}

            <Button
              className="mt-5 w-full"
              size="md"
              loading={running}
              onClick={() => void submit()}
              icon={<FlaskConical size={15} />}
              disabled={running || !dataset}
            >
              {running ? "Running engine…" : "Run analysis"}
            </Button>
            <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-faint">
              Results are generated by the local Python engine. Nothing is pre-computed in the
              browser.
            </p>

            {running ? (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-midnight-700">
                <div className="skeleton h-full w-full" />
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              icon={<AlertCircle size={16} />}
              title="How the score is built"
              description="A fixed, transparent 100-point scale."
            />
            <ul className="space-y-3">
              {[
                { label: "Phenotype overlap", max: "50", detail: "match fraction × 50" },
                { label: "Inheritance compatible", max: "25", detail: "binary heuristic" },
                { label: "Effect evidence", max: "15", detail: "supplied value, clamped" },
                { label: "Frequency evidence", max: "10", detail: "supplied value, clamped" },
              ].map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-3 border-b border-line/70 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-[12.5px] text-ink-secondary">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">{item.detail}</p>
                  </div>
                  <span className="mono text-[12.5px] text-ink">{item.max}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              Scores express relative prioritisation under these heuristics. They are not
              probabilities and do not establish pathogenicity.
            </p>
          </Card>

          <Card>
            <CardHeader
              icon={<Users size={16} />}
              title="Inputs the engine requires"
              description="Validation is enforced again server-side; malformed datasets are rejected with an explanation."
            />
            <ul className="space-y-2 text-[12px] leading-relaxed text-ink-muted">
              <li>• Unique family member ids and variant ids</li>
              <li>• Genotypes normalised to REF / HET / ALT</li>
              <li>• Genotype keys that reference known members</li>
              <li>• A supported inheritance mode</li>
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <LinkButton to="/methodology" variant="ghost" size="sm" className="-ml-2">
                View full methodology
              </LinkButton>
            </div>
          </Card>

          {dataset.source === "custom" ? (
            <Card className="border-violet-400/20 bg-violet-500/[0.03]">
              <p className="text-[12px] font-medium text-violet-200">Custom dataset active</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                This run is not the bundled synthetic demo. Ensure no real patient data is used.
                Current candidate count: {selectedVariants.length}.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={resetToDemo}>
                Restore demo dataset
              </Button>
            </Card>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-line bg-midnight-900/40 px-3.5 py-3">
              <Check size={14} className="mt-0.5 shrink-0 text-accent-teal" aria-hidden />
              <p className="text-[11.5px] leading-relaxed text-ink-muted">
                The bundled dataset is fictional and safe to explore. Every value shown after a
                run — including the top candidate under {formatMode(mode)} — is computed by the
                Python engine at request time.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
