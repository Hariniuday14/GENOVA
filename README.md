# GENOVA

**Generational Variant Analysis for Predicting Inherited Disease Susceptibility**

A research-prototype platform that combines family structure, phenotype-term overlap,
simplified inheritance compatibility, and caller-supplied evidence into a transparent
candidate-variant ranking. It now ships as a premium React application backed by the
existing Python analysis engine through a FastAPI service.

> **Research prototype — synthetic data only.** GENOVA is not a medical device and has
> not been clinically validated. Prioritisation scores are engineered heuristics (0–100),
> not disease probabilities or pathogenicity classifications. Do not use the output for
> diagnosis, risk prediction, or treatment decisions. No real patient data is included
> or required.

---

## What is in this repository

| Area | Technology | Purpose |
| --- | --- | --- |
| Analysis engine | Python (`genetics_engine.py`, `evaluation.py`) | Validation, phenotype matching, inheritance heuristics, scoring, compound-het search, evaluation |
| HTTP API | FastAPI (`api.py`) | Validated JSON interface over the engine, CORS, health check, structured errors |
| Web application | React 18 + Vite + TypeScript + Tailwind + Recharts | Overview, family analysis, results, evaluation, methodology |
| Preserved workflows | Streamlit (`app.py`), CLI (`run_demo.py`) | Original interfaces, still runnable |
| Synthetic data | `data_generator.py` → `data/synthetic/demo_family.json` | Fictional three-generation family with four variants |

The analysis logic was not rewritten. `api.py` validates requests and calls the original
functions: `validate_family_data`, `rank_variants`, `check_inheritance`,
`find_compound_het_pairs`, `evaluate_cases`, and `phenotype_only_ranking`.

```
Browser (React / Vite)
   │  /api/*  (dev proxy, or VITE_API_BASE_URL)
   ▼
FastAPI  api.py
   │  direct Python calls, no re-implementation
   ├── genetics_engine.py   validation · scoring · inheritance · compound het
   ├── evaluation.py        top-k hit rates · MRR · phenotype-only baseline
   └── data/synthetic/demo_family.json
```

The response shape is defined by Pydantic models in `api.py` and mirrored in
`frontend/src/lib/types.ts`, so the frontend and backend agree on every field.

---

## Quick start

**Prerequisites:** Python 3.10+, Node.js 18+ (Node 22 tested).

### 1. Install backend dependencies

```bash
python -m pip install -r requirements.txt
```

### 2. Start the API

```bash
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

- API: <http://127.0.0.1:8000>
- Interactive docs: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/api/health>

Alternative launcher with the same defaults: `python api.py`.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **<http://127.0.0.1:5173>**. The Vite dev server proxies `/api` to
`http://127.0.0.1:8000`, so no frontend environment variables are needed for local work.

### Production build

```bash
cd frontend
npm run build     # type-check + production bundle in frontend/dist
npm run preview   # serves the build at http://127.0.0.1:4173
```

`vite preview` does not proxy `/api`. For a built bundle, point it at the API origin at
build time:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run build
```

and add that origin to `GENOVA_ALLOWED_ORIGINS` for the API.

---

## Application pages

- **Overview** — live API status, synthetic dataset summary, latest engine run, score
  chart, top candidate breakdown, pedigree, workflow, and local run history.
- **Family analysis** — inheritance model selection, observed phenotype terms, candidate
  inclusion, supplied effect/frequency evidence, dataset JSON import, client and server
  validation, loading and error states.
- **Results** — ranked table, score-composition chart, per-candidate reasoning, inheritance
  compatibility, compound-het pairs, observed terms, limitations, JSON/CSV export.
- **Evaluation** — genuine `evaluation.py` output (top-k hit rates, MRR, phenotype-only
  baseline) for the single labelled synthetic case, with explicit scope warnings.
- **Methodology** — pipeline, module map, backend-defined scoring scale, input contract,
  data-integrity notes, limitations, and reproduction commands.

A run starts automatically on first load using the bundled synthetic dataset; every value
in the interface comes from the API response. Nothing is hardcoded in analysis components.

---

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Status, versions, supported inheritance modes, demo availability, score scale |
| `GET` | `/api/demo` | Bundled synthetic dataset plus derived summary |
| `POST` | `/api/analysis` | Validate and run the engine on a supplied dataset |
| `POST` | `/api/analysis/demo` | Convenience run on the bundled dataset (`?inheritance_mode=…`) |
| `GET` | `/api/evaluation` | Evaluation metrics for the labelled synthetic case (`?inheritance_mode=…`) |
| `POST` | `/api/validate` | Engine validation only, no ranking |

### Request body for `POST /api/analysis`

```json
{
  "family": [
    {
      "id": "I-1",
      "generation": 1,
      "sex": "female",
      "affected": false,
      "mother_id": null,
      "father_id": null
    }
  ],
  "variants": [
    {
      "id": "SYN-V001",
      "gene": "GENE_ALPHA",
      "genotypes": { "I-1": "HET" },
      "phenotype_terms": ["HP:0001250"],
      "effect_evidence": 12.0,
      "frequency_evidence": 8.0
    }
  ],
  "observed_phenotypes": ["HP:0001250"],
  "inheritance_mode": "autosomal_recessive",
  "label": "Optional run label",
  "source": "synthetic_demo"
}
```

`inheritance_mode` is one of `autosomal_recessive`, `autosomal_dominant`, `x_linked`.
Invalid datasets return HTTP `422` with the engine's specific validation errors; the UI
surfaces them rather than showing partial or invented results. Missing genotypes for
affected relatives produce `compatible: null` ("undetermined"), never a false positive.

### Scoring (fixed 100-point scale)

| Component | Max | Source |
| --- | --- | --- |
| Phenotype overlap | 50 | Exact term-overlap fraction × 50 |
| Inheritance compatibility | 25 | 25 points when the simplified check returns compatible |
| Effect evidence | 15 | Caller-supplied `effect_evidence`, clamped 0–15 |
| Frequency evidence | 10 | Caller-supplied `frequency_evidence`, clamped 0–10 |

The scale is returned by the API (`score_scale`) and rendered directly by the UI.

---

## Testing

```bash
# Engine + API integration tests (18 tests)
python -m pytest -q

# Frontend type-check and production build
cd frontend
npm run build
```

The API tests cover health, demo provenance, real engine scores, mode-dependent scoring,
invalid datasets (422, not fabricated success), evaluation output, and CORS preflight.

### Browser end-to-end check (optional)

The repository includes a dependency-free Chrome DevTools Protocol script that draws the
real form, clicks **Run analysis**, verifies navigation to a populated results page, then
confirms the "no candidates selected" validation message.

```bash
# terminal 1: API
python -m uvicorn api:app --port 8000

# terminal 2: frontend
cd frontend && npm run dev

# terminal 3: headless Chrome with remote debugging
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new \
  --remote-debugging-port=9222 --user-data-dir=/tmp/genova-cdp about:blank

# terminal 4
cd frontend && node scripts/e2e-check.mjs
```

---

## Preserved workflows

```bash
python run_demo.py          # command-line ranking demo
streamlit run app.py        # original Streamlit dashboard
python data_generator.py    # regenerate the synthetic dataset
```

These remain functional and use the same engine and dataset as the web application.

---

## Configuration

Backend (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `GENOVA_ALLOWED_ORIGINS` | local origins on ports 5173/4173 | CORS allow-list |
| `GENOVA_API_HOST` | `127.0.0.1` | Bind address for `python api.py` |
| `GENOVA_API_PORT` | `8000` | Port for `python api.py` |
| `GENOVA_API_RELOAD` | `0` | Enable auto-reload |

Frontend (see `frontend/.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty (same origin / proxy) | API origin for built bundles |
| `GENOVA_API_TARGET` | `http://127.0.0.1:8000` | Dev proxy target |

No secrets are used or exposed; all analysis runs locally.

---

## Project structure

```
.
├── api.py                      FastAPI service (request/response models, routes)
├── genetics_engine.py          Core engine — unchanged
├── evaluation.py               Evaluation module — unchanged
├── data_generator.py           Synthetic dataset generator — unchanged
├── app.py                      Streamlit app — unchanged
├── run_demo.py                 CLI demo — unchanged
├── data/synthetic/
│   └── demo_family.json        Fictional three-generation family
├── tests/
│   ├── test_genetics_engine.py Engine tests
│   └── test_api.py             API integration tests
└── frontend/
    ├── src/
    │   ├── components/         Layout, UI primitives, charts, pedigree
    │   ├── lib/                API client, types, analysis context, utilities
    │   └── pages/              Overview, Analysis, Results, Evaluation, Methodology
    ├── scripts/e2e-check.mjs   CDP browser smoke test
    └── vite.config.ts          Dev proxy + build chunking
```

---

## Scientific integrity and limitations

- All bundled family and variant records are fictional and clearly labelled synthetic.
  Custom imported datasets are the caller's responsibility.
- Scores are relative prioritisation heuristics, **not** probabilities of disease or
  pathogenicity.
- Phenotype matching is exact string overlap, not HPO ontology similarity.
- Inheritance checks are simplified compatibility screens; they do not model penetrance,
  age of onset, mosaicism, de novo events, or phase.
- Compound-het pairs are candidates for review; being in trans is never assumed.
- No external annotation, population, or clinical databases are queried.
- Evaluation covers a single seeded synthetic case. It demonstrates the pipeline and
  cannot estimate accuracy, generalisation, or clinical performance.

## Evaluation and Data Delivery (Member 3)

### Synthetic benchmark

Run the labelled synthetic benchmark:

```powershell
python synthetic_benchmark.py
```

The benchmark writes its report to
`synthetic_benchmark_results.json`. It compares the genetics engine with a
phenotype-only baseline using Top-K hit rates and mean reciprocal rank.

These results are based on constructed synthetic scenarios. They are software
evaluation metrics, not clinical accuracy or evidence of diagnostic performance.

### Variant CSV and schema

- `create_csv_schema.py` generates the variant CSV and JSON schema from the
  bundled synthetic family dataset.
- `data/synthetic/demo_variants.csv` contains the exported synthetic variant data.
- `data/synthetic/variant_schema.json` documents the CSV fields and data types.

To regenerate the CSV and schema, run:

```powershell
python create_csv_schema.py
```

### Evaluation tests

Run the full Python test suite:

```powershell
python -m pytest -v
```

The tests cover the genetics engine, CSV/schema consistency, and ranking
reproducibility. Benchmark scenarios are synthetic and do not establish
clinical validity.
