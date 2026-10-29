"""
GENOVA HTTP API
===============

A thin FastAPI layer over the existing GENOVA analysis modules
(``genetics_engine`` and ``evaluation``).

The API does not reimplement or modify any analysis logic: it validates
incoming JSON, calls the existing functions, and returns their output
structured for the frontend. The command line demo (``run_demo.py``) and the
Streamlit application (``app.py``) keep working exactly as before.

Research prototype only. Synthetic demonstration data. Not for clinical use.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from evaluation import evaluate_cases, phenotype_only_ranking
from genetics_engine import (
    SUPPORTED_MODES,
    check_inheritance,
    find_compound_het_pairs,
    rank_variants,
    validate_family_data,
)

BASE_DIR = Path(__file__).resolve().parent
DEMO_PATH = BASE_DIR / "data" / "synthetic" / "demo_family.json"

API_VERSION = "1.0.0"
DISCLAIMER = (
    "GENOVA is an experimental research prototype using synthetic demonstration "
    "data. Prioritisation scores are engineered heuristics (0-100), not disease "
    "probabilities, and must not be used for diagnosis or treatment decisions."
)

InheritanceMode = Literal["autosomal_recessive", "autosomal_dominant", "x_linked"]


# =========================================================
# REQUEST / RESPONSE MODELS
# =========================================================


class FamilyMember(BaseModel):
    """One individual in the supplied family. Mirrors the engine's input shape."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1, max_length=64)
    generation: Optional[int] = None
    sex: Optional[str] = None
    affected: Optional[bool] = None
    mother_id: Optional[str] = None
    father_id: Optional[str] = None
    parents: Optional[List[Any]] = None


class Variant(BaseModel):
    """A candidate variant supplied by the caller. Fields mirror the engine."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1, max_length=128)
    gene: str = Field(min_length=1, max_length=128)
    genotypes: Dict[str, Optional[str]] = Field(default_factory=dict)
    phenotype_terms: List[str] = Field(default_factory=list)
    effect_evidence: float = Field(default=0.0, ge=0.0)
    frequency_evidence: float = Field(default=0.0, ge=0.0)
    inheritance_mode: Optional[str] = None
    phase: Optional[Dict[str, Any]] = None


class AnalysisRequest(BaseModel):
    """Payload accepted by POST /api/analysis."""

    family: List[FamilyMember] = Field(min_length=1)
    variants: List[Variant] = Field(min_length=1)
    observed_phenotypes: List[str] = Field(default_factory=list)
    inheritance_mode: InheritanceMode = "autosomal_recessive"
    label: Optional[str] = Field(default=None, max_length=120)
    source: Optional[str] = Field(default=None, max_length=60)


class DemoResponse(BaseModel):
    """Synthetic demonstration dataset plus a few derived facts."""

    description: str
    family: List[Dict[str, Any]]
    variants: List[Dict[str, Any]]
    observed_phenotypes: List[str]
    inheritance_mode: str
    summary: Dict[str, Any]
    is_synthetic: bool = True
    disclaimer: str


class AnalysisSummary(BaseModel):
    family_members: int
    affected_members: int
    variants_analysed: int
    observed_phenotypes: int
    top_candidate_id: Optional[str] = None
    top_candidate_gene: Optional[str] = None
    top_score: Optional[float] = None
    mean_score: Optional[float] = None
    inheritance_compatible: int
    candidates_with_phenotype_match: int


class AnalysisResponse(BaseModel):
    analysis_id: str
    generated_at: str
    label: Optional[str] = None
    source: Optional[str] = None
    dataset_kind: Literal["synthetic_demo", "custom"] = "custom"
    inheritance_mode: str
    observed_phenotypes: List[str]
    results: List[Dict[str, Any]]
    inheritance_checks: List[Dict[str, Any]]
    compound_het_pairs: List[Dict[str, Any]]
    validation_errors: List[str] = Field(default_factory=list)
    summary: AnalysisSummary
    score_scale: Dict[str, Any]
    disclaimer: str = DISCLAIMER


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    api_version: str
    engine_version: str
    supported_inheritance_modes: List[str]
    demo_available: bool
    demos: Optional[Dict[str, Any]] = None
    score_scale: Dict[str, Any]
    disclaimer: str
    server_time: str


class EvaluationResponse(BaseModel):
    inheritance_mode: str
    labelled_target_variant_id: str
    metrics: Dict[str, Any]
    rankings: List[Dict[str, Any]]
    baseline_rankings: List[Dict[str, Any]]
    number_of_cases: int
    case_note: str
    disclaimer: str = DISCLAIMER


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="GENOVA API",
    version=API_VERSION,
    description=(
        "HTTP wrapper around the GENOVA research prototype analysis engine. "
        "Synthetic data only; not a clinical tool."
    ),
)

_default_origins = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:4173,http://127.0.0.1:4173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("GENOVA_ALLOWED_ORIGINS", _default_origins).split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Never report a fabricated success: surface failures as structured errors."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "message": f"Unhandled server error: {exc}",
                "errors": [str(exc)],
            }
        },
    )


def _load_demo() -> Dict[str, Any]:
    """Read the bundled synthetic dataset, or fail with a clear message."""
    if not DEMO_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Synthetic demo dataset is missing.",
                "errors": [
                    "Expected data/synthetic/demo_family.json. "
                    "Run: python data_generator.py"
                ],
            },
        )

    with DEMO_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _demo_summary(data: Dict[str, Any]) -> Dict[str, Any]:
    family = data.get("family", [])
    variants = data.get("variants", [])
    generations = sorted(
        {
            int(member.get("generation"))
            for member in family
            if member.get("generation") is not None
        }
    )

    return {
        "family_members": len(family),
        "affected_members": sum(
            1 for member in family if member.get("affected") is True
        ),
        "unaffected_members": sum(
            1 for member in family if member.get("affected") is False
        ),
        "variants": len(variants),
        "genes": sorted({str(v.get("gene")) for v in variants if v.get("gene")}),
        "generations": generations,
        "phenotype_terms": len(data.get("observed_phenotypes", [])),
        "declared_inheritance_mode": data.get("inheritance_mode"),
    }


def _summarise(
    family: List[Dict[str, Any]],
    variants: List[Dict[str, Any]],
    results: List[Dict[str, Any]],
    observed_phenotypes: List[str],
) -> AnalysisSummary:
    scores = [float(item.get("score", 0.0)) for item in results]
    top = results[0] if results else None

    return AnalysisSummary(
        family_members=len(family),
        affected_members=sum(1 for m in family if m.get("affected") is True),
        variants_analysed=len(variants),
        observed_phenotypes=len(observed_phenotypes),
        top_candidate_id=top.get("variant_id") if top else None,
        top_candidate_gene=top.get("gene") if top else None,
        top_score=top.get("score") if top else None,
        mean_score=round(sum(scores) / len(scores), 2) if scores else None,
        inheritance_compatible=sum(
            1
            for item in results
            if (item.get("inheritance") or {}).get("compatible") is True
        ),
        candidates_with_phenotype_match=sum(
            1
            for item in results
            if (item.get("phenotype") or {}).get("matched_terms")
        ),
    )


SCORE_SCALE = {
    "total_max": 100.0,
    "components": [
        {
            "key": "phenotype_points",
            "label": "Phenotype overlap",
            "max": 50.0,
            "source": "Exact phenotype-term overlap fraction x 50",
        },
        {
            "key": "inheritance_points",
            "label": "Inheritance compatibility",
            "max": 25.0,
            "source": "25 points when the simplified model check is compatible",
        },
        {
            "key": "effect_points",
            "label": "Supplied effect evidence",
            "max": 15.0,
            "source": "Caller-supplied effect_evidence, clamped to 0-15",
        },
        {
            "key": "frequency_points",
            "label": "Supplied frequency evidence",
            "max": 10.0,
            "source": "Caller-supplied frequency_evidence, clamped to 0-10",
        },
    ],
    "note": (
        "Engineered prioritisation score out of 100. Not a probability, "
        "not a pathogenicity classification."
    ),
}


# =========================================================
# ROUTES
# =========================================================


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Readiness probe used by the frontend status indicator."""
    demo_available = DEMO_PATH.exists()
    demos: Optional[Dict[str, Any]] = None

    if demo_available:
        try:
            demos = _demo_summary(_load_demo())
        except (HTTPException, json.JSONDecodeError, OSError):
            demos = None
            demo_available = False

    return HealthResponse(
        status="ok",
        service="genova-api",
        api_version=API_VERSION,
        engine_version=API_VERSION,
        supported_inheritance_modes=sorted(SUPPORTED_MODES),
        demo_available=demo_available,
        demos=demos,
        score_scale=SCORE_SCALE,
        disclaimer=DISCLAIMER,
        server_time=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/api/demo", response_model=DemoResponse, tags=["data"])
def demo() -> DemoResponse:
    """Return the bundled synthetic demonstration dataset (never real data)."""
    data = _load_demo()

    return DemoResponse(
        description=data.get("description", "Synthetic demonstration dataset."),
        family=data.get("family", []),
        variants=data.get("variants", []),
        observed_phenotypes=data.get("observed_phenotypes", []),
        inheritance_mode=data.get("inheritance_mode", "autosomal_recessive"),
        summary=_demo_summary(data),
        is_synthetic=True,
        disclaimer=DISCLAIMER,
    )


@app.post("/api/analysis", response_model=AnalysisResponse, tags=["analysis"])
def run_analysis(payload: AnalysisRequest) -> AnalysisResponse:
    """Run the existing ranking, inheritance, and compound-het engine functions."""
    family = [member.model_dump(exclude_none=False) for member in payload.family]
    variants = [variant.model_dump(exclude_none=False) for variant in payload.variants]

    # Strip keys the engine does not expect but tolerate extras on members.
    for member in family:
        member.pop("parents", None)

    validation_errors = validate_family_data(family, variants)

    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "The engine rejected the supplied dataset.",
                "errors": list(validation_errors),
            },
        )

    try:
        results = rank_variants(
            family=family,
            variants=variants,
            observed_phenotypes=payload.observed_phenotypes,
            inheritance_mode=payload.inheritance_mode,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Variant ranking failed.", "errors": [str(exc)]},
        ) from exc

    inheritance_checks: List[Dict[str, Any]] = []

    for variant in variants:
        try:
            check = check_inheritance(variant, family, payload.inheritance_mode)
            inheritance_checks.append(
                {
                    "variant_id": variant["id"],
                    "gene": variant["gene"],
                    "mode": payload.inheritance_mode,
                    "compatible": check.get("compatible"),
                    "reason": check.get("reason", ""),
                }
            )
        except (ValueError, KeyError) as exc:
            inheritance_checks.append(
                {
                    "variant_id": variant.get("id", "unknown"),
                    "gene": variant.get("gene", "unknown"),
                    "mode": payload.inheritance_mode,
                    "compatible": None,
                    "reason": f"Inheritance check failed: {exc}",
                }
            )

    try:
        pairs = find_compound_het_pairs(variants, family)
    except (ValueError, KeyError, TypeError) as exc:
        pairs = []
        validation_errors = validation_errors + [f"Compound-het search failed: {exc}"]

    now = datetime.now(timezone.utc)

    return AnalysisResponse(
        analysis_id=f"GENOVA-{now.strftime('%Y%m%dT%H%M%S')}-{now.microsecond // 1000:03d}",
        generated_at=now.isoformat(),
        label=payload.label,
        source=payload.source,
        dataset_kind="synthetic_demo" if payload.source == "synthetic_demo" else "custom",
        inheritance_mode=payload.inheritance_mode,
        observed_phenotypes=payload.observed_phenotypes,
        results=results,
        inheritance_checks=inheritance_checks,
        compound_het_pairs=pairs,
        validation_errors=list(validation_errors),
        summary=_summarise(family, variants, results, payload.observed_phenotypes),
        score_scale=SCORE_SCALE,
    )


@app.post("/api/analysis/demo", response_model=AnalysisResponse, tags=["analysis"])
def run_demo_analysis(
    inheritance_mode: Optional[InheritanceMode] = Query(default=None),
    label: Optional[str] = Query(default=None),
) -> AnalysisResponse:
    """Convenience endpoint: run the analysis on the bundled synthetic dataset."""
    data = _load_demo()

    payload = AnalysisRequest(
        family=data["family"],
        variants=data["variants"],
        observed_phenotypes=data.get("observed_phenotypes", []),
        inheritance_mode=inheritance_mode or data.get("inheritance_mode", "autosomal_recessive"),
        label=label or "Synthetic demo family",
        source="synthetic_demo",
    )

    return run_analysis(payload)


@app.get("/api/evaluation", response_model=EvaluationResponse, tags=["evaluation"])
def evaluation(
    inheritance_mode: Optional[InheritanceMode] = Query(default=None),
) -> EvaluationResponse:
    """
    Return genuine evaluation output from the existing evaluation module.

    Only the one labelled synthetic demonstration case shipped with the dataset
    is evaluated. No additional labels are invented here.
    """
    data = _load_demo()
    mode = inheritance_mode or data.get("inheritance_mode", "autosomal_recessive")

    target = "SYN-V001"

    if not any(variant.get("id") == target for variant in data.get("variants", [])):
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Labelled synthetic case is unavailable.",
                "errors": [f"Target variant {target} was not found in the dataset."],
            },
        )

    try:
        metrics = evaluate_cases(
            [
                {
                    "family": data["family"],
                    "variants": data["variants"],
                    "observed_phenotypes": data.get("observed_phenotypes", []),
                    "inheritance_mode": mode,
                    "target_variant_id": target,
                }
            ]
        )
        metrics["phenotype_only_baseline"] = {
            "ranked_variants": phenotype_only_ranking(
                data["variants"], data.get("observed_phenotypes", [])
            ),
            "note": (
                "Baseline scores are exact term-overlap fractions. "
                "Ties are ordered by input order."
            ),
        }
        metrics["interpretation"] = (
            "Only one labelled synthetic case is evaluated. These results "
            "demonstrate the evaluation pipeline, not generalisable or clinical "
            "model performance."
        )
        metrics["evaluation_source"] = "evaluation.evaluate_cases"

        rankings = rank_variants(
            family=data["family"],
            variants=data["variants"],
            observed_phenotypes=data.get("observed_phenotypes", []),
            inheritance_mode=mode,
        )
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Evaluation failed.", "errors": [str(exc)]},
        ) from exc

    return EvaluationResponse(
        inheritance_mode=mode,
        labelled_target_variant_id=target,
        metrics=metrics,
        rankings=[
            {
                "rank": item["rank"],
                "variant_id": item["variant_id"],
                "gene": item["gene"],
                "score": item["score"],
                "phenotype_score": item["phenotype_score"],
                "effect_points": item["effect_points"],
                "frequency_points": item["frequency_points"],
                "inheritance_compatible": (item.get("inheritance") or {}).get("compatible"),
                "is_target": item["variant_id"] == target,
            }
            for item in rankings
        ],
        baseline_rankings=[
            {**item, "rank": index, "is_target": item["variant_id"] == target}
            for index, item in enumerate(
                phenotype_only_ranking(
                    data["variants"], data.get("observed_phenotypes", [])
                ),
                start=1,
            )
        ],
        number_of_cases=metrics.get("number_of_cases", 0),
        case_note=(
            "Single labelled synthetic case: the demo dataset marks SYN-V001 as "
            "the seeded candidate. Metrics describe this pipeline demonstration "
            "only."
        ),
    )


@app.post("/api/validate", tags=["analysis"])
def validate(payload: AnalysisRequest) -> Dict[str, Any]:
    """Expose the engine's own input validation without running a ranking."""
    family = [member.model_dump() for member in payload.family]
    variants = [variant.model_dump() for variant in payload.variants]

    for member in family:
        member.pop("parents", None)

    errors = validate_family_data(family, variants)

    return {
        "valid": not errors,
        "errors": list(errors),
        "checks": [
            "family is a non-empty list with unique member ids",
            "variants have unique ids and a gene",
            "variant genotype keys reference known family members",
            "genotypes normalise to REF / HET / ALT",
        ],
    }


if __name__ == "__main__":  # pragma: no cover - manual launch helper
    import uvicorn

    uvicorn.run(
        "api:app",
        host=os.getenv("GENOVA_API_HOST", "127.0.0.1"),
        port=int(os.getenv("GENOVA_API_PORT", "8000")),
        reload=os.getenv("GENOVA_API_RELOAD", "0") == "1",
    )
