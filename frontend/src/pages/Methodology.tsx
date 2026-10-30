import {
  Braces,
  Database,
  Dna,
  FileCode2,
  FlaskConical,
  GitBranch,
  Layers,
  ScrollText,
  ShieldAlert,
  Terminal,
  Workflow,
} from "lucide-react";

import { useAnalysis } from "../lib/analysis-context";
import { formatMode } from "../lib/utils";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/States";

const pipeline = [
  {
    step: "1",
    title: "Load and validate family data",
    body: "Family members, variants, observed phenotype terms, and an inheritance mode are parsed. validate_family_data() checks ids, duplicates, genotype keys, and genotype normalisation.",
    module: "genetics_engine.validate_family_data",
    icon: Database,
  },
  {
    step: "2",
    title: "Score phenotype overlap",
    body: "match_phenotypes() intersects the observed terms with each candidate's phenotype_terms. The score is the exact-match fraction; it is not ontology-based semantic similarity.",
    module: "genetics_engine.match_phenotypes",
    icon: Layers,
  },
  {
    step: "3",
    title: "Check inheritance compatibility",
    body: "check_inheritance() applies simplified autosomal dominant, autosomal recessive, or X-linked rules to the supplied genotypes of affected and unaffected relatives.",
    module: "genetics_engine.check_inheritance",
    icon: GitBranch,
  },
  {
    step: "4",
    title: "Combine evidence into a score",
    body: "rank_variants() adds phenotype points (max 50), inheritance points (25 when compatible), supplied effect evidence (max 15), and supplied frequency evidence (max 10).",
    module: "genetics_engine.rank_variants",
    icon: FlaskConical,
  },
  {
    step: "5",
    title: "Rank, explain, and review pairs",
    body: "Candidates are sorted by score and annotated with reasons. find_compound_het_pairs() separately reports heterozygous pairs in the same gene without assuming phase.",
    module: "genetics_engine.find_compound_het_pairs",
    icon: Dna,
  },
];

const modules = [
  {
    file: "genetics_engine.py",
    role: "Core validation, inheritance heuristics, phenotype overlap, scoring, and compound-het search.",
    surface: "POST /api/analysis",
  },
  {
    file: "evaluation.py",
    role: "Ranking evaluation on labelled synthetic cases and the phenotype-only baseline.",
    surface: "GET /api/evaluation",
  },
  {
    file: "data_generator.py",
    role: "Generates the fictional three-generation family and four synthetic variants.",
    surface: "CLI: python data_generator.py",
  },
  {
    file: "api.py",
    role: "Thin FastAPI wrapper: request validation, engine calls, structured JSON, error handling, CORS.",
    surface: "HTTP API",
  },
  {
    file: "app.py",
    role: "Original Streamlit application, preserved and still runnable.",
    surface: "streamlit run app.py",
  },
  {
    file: "run_demo.py",
    role: "Original command-line demo, preserved and still runnable.",
    surface: "python run_demo.py",
  },
];

const limitations = [
  "Scores are engineered heuristics for relative prioritisation. They are not probabilities of disease, penetrance estimates, or ACMG/AMP classifications.",
  "Phenotype matching is exact string overlap. It ignores term hierarchy, synonyms, and semantic similarity, so unmatched terms may still be biologically related.",
  "Inheritance checks are deliberately simplified screens. They do not model penetrance, age of onset, mosaicism, de novo events, or phase.",
  "Compound heterozygous pairs are candidates only. Phase is reported solely when supplied; being in trans is never assumed.",
  "No external annotation, population-frequency, or clinical database is queried. Effect and frequency evidence must be supplied by the caller.",
  "Evaluation covers one seeded synthetic case. It cannot estimate accuracy or generalisation, and no clinical validation has been performed.",
  "The model does not diagnose disease, predict an individual's clinical risk, or guide medical decisions.",
];

export function Methodology() {
  const { health, current } = useAnalysis();

  const scale = health?.score_scale ?? current?.score_scale;
  const components =
    scale?.components ?? [
      { key: "phenotype_points", label: "Phenotype overlap", max: 50, source: "match fraction × 50" },
      {
        key: "inheritance_points",
        label: "Inheritance compatibility",
        max: 25,
        source: "25 points when compatible",
      },
      { key: "effect_points", label: "Supplied effect evidence", max: 15, source: "clamped 0–15" },
      {
        key: "frequency_points",
        label: "Supplied frequency evidence",
        max: 10,
        source: "clamped 0–10",
      },
    ];

  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Methodology & limitations"
        description="How GENOVA turns supplied family records into a ranked candidate list, which modules perform each step, and what the prototype cannot support."
        meta={
          <>
            <Badge tone="amber" dot>
              Experimental prototype
            </Badge>
            <Badge tone="cyan">Synthetic data only</Badge>
            {health ? <Badge tone="neutral">API v{health.api_version}</Badge> : null}
          </>
        }
      />

      <Alert tone="warning" title="Intended use" className="mb-6">
        GENOVA is an educational research prototype for software demonstration. It must not be
        used for diagnosis, risk prediction, or clinical decision-making, and it has not been
        validated on real patient data.
      </Alert>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={<Workflow size={16} />}
            title="Analysis pipeline"
            description="Each request executes these steps in the Python process; the browser only renders the returned JSON."
          />
          <ol className="space-y-5">
            {pipeline.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.step} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-cyan/25 bg-accent-cyan/[0.07] text-accent-cyan">
                      <Icon size={16} aria-hidden />
                    </span>
                    {index < pipeline.length - 1 ? (
                      <span className="mt-2 h-full w-px bg-line" aria-hidden />
                    ) : null}
                  </div>
                  <div className="pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[10.5px] text-ink-faint">{item.step}</span>
                      <h3 className="text-[13.5px] font-medium text-ink">{item.title}</h3>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{item.body}</p>
                    <p className="mono mt-2 text-[10.5px] text-accent-cyan/80">{item.module}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<ScrollText size={16} />}
              title="Scoring model"
              description="Fixed 100-point scale, returned by the API so the UI and the engine cannot drift."
            />
            <div className="space-y-3">
              {components.map((component) => (
                <div key={component.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-ink-secondary">{component.label}</span>
                    <span className="mono text-[12.5px] text-ink">{component.max}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                    {component.source}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[12.5px] font-medium text-ink">Total</span>
              <span className="mono text-[13px] text-accent-teal">{scale?.total_max ?? 100}</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              {scale?.note ??
                "Engineered prioritisation score out of 100. Not a probability, not a pathogenicity classification."}
            </p>
          </Card>

          <Card>
            <CardHeader
              icon={<Braces size={16} />}
              title="Input contract"
              description="POST /api/analysis"
            />
            <pre className="overflow-x-auto rounded-lg border border-line bg-midnight-950/80 p-3.5 font-mono text-[10.5px] leading-relaxed text-ink-secondary">
{`{
  "family": [
    { "id": "I-1", "generation": 1,
      "sex": "female", "affected": false,
      "mother_id": null, "father_id": null }
  ],
  "variants": [
    { "id": "SYN-V001", "gene": "GENE_ALPHA",
      "genotypes": { "I-1": "HET" },
      "phenotype_terms": ["HP:0001250"],
      "effect_evidence": 12.0,
      "frequency_evidence": 8.0 }
  ],
  "observed_phenotypes": ["HP:0001250"],
  "inheritance_mode": "${current ? formatMode(current.inheritance_mode) : "autosomal_recessive"}"
}`}
            </pre>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Validation happens twice: lightweight client checks in the form and the engine's own
              validation server-side. Invalid data yields HTTP 422 with explicit errors.
            </p>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader
          icon={<FileCode2 size={16} />}
          title="Modules and preserved workflows"
          description="The original analysis engine, Streamlit app, and CLI demo were not rewritten; the API calls into them."
          action={<Badge tone="neutral">{modules.length} modules</Badge>}
        />
        <div className="table-shell">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Responsibility</th>
                <th scope="col">Surface</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.file}>
                  <td className="mono whitespace-nowrap text-ink">{module.file}</td>
                  <td className="whitespace-normal leading-relaxed">{module.role}</td>
                  <td className="mono whitespace-nowrap text-[11.5px] text-ink-muted">
                    {module.surface}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<ShieldAlert size={16} />}
            title="Limitations"
            description="Each limitation follows from the implementation, not from missing polish."
          />
          <ul className="space-y-3">
            {limitations.map((item) => (
              <li key={item} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-300/80" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<Database size={16} />}
              title="Data integrity"
              description="Demonstration data is fictional by construction."
            />
            <ul className="space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
              <li>• The only bundled dataset is data/synthetic/demo_family.json, generated by data_generator.py.</li>
              <li>• No real patient, clinical, or identifiable data is included or required.</li>
              <li>• Custom datasets stay in the request; the API does not persist uploaded data.</li>
              <li>• Every result payload carries the research-use disclaimer and its data provenance.</li>
              <li>• External annotation services are not contacted.</li>
            </ul>
          </Card>

          <Card>
            <CardHeader
              icon={<Terminal size={16} />}
              title="Reproduce locally"
              description="Run each preserved surface independently."
            />
            <pre className="overflow-x-auto rounded-lg border border-line bg-midnight-950/80 p-3.5 font-mono text-[11px] leading-relaxed text-ink-secondary">
{`# API
python -m uvicorn api:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm run dev

# Preserved workflows
streamlit run app.py
python run_demo.py
python -m pytest`}
            </pre>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Interactive API documentation is available at /docs while the service is running.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
