
"""Evaluation utilities for the GENOVA research prototype.

Metrics are intended for labelled synthetic benchmark cases.
They do not establish clinical diagnostic performance.
"""

from genetics_engine import rank_variants, match_phenotypes


def reciprocal_rank(results, target_variant_id):
    """Return the reciprocal rank of the target, or zero if absent."""
    for result in results:
        if result["variant_id"] == target_variant_id:
            return 1.0 / result["rank"]
    return 0.0


def evaluate_cases(cases, k_values=(1, 3, 5)):
    """
    Evaluate rankings on labelled cases.

    Each case must contain:
      family, variants, observed_phenotypes,
      inheritance_mode, target_variant_id

    Returns top-k hit rates and mean reciprocal rank.
    """
    if not cases:
        raise ValueError("At least one labelled test case is required.")

    hits = {k: 0 for k in k_values}
    reciprocal_ranks = []
    evaluated = 0

    for case in cases:
        target = case["target_variant_id"]

        if not any(v["id"] == target for v in case["variants"]):
            raise ValueError(
                f"Target variant {target!r} is missing from the case."
            )

        results = rank_variants(
            family=case["family"],
            variants=case["variants"],
            observed_phenotypes=case["observed_phenotypes"],
            inheritance_mode=case["inheritance_mode"],
        )

        evaluated += 1
        reciprocal_ranks.append(reciprocal_rank(results, target))

        for k in k_values:
            if any(r["variant_id"] == target for r in results[:k]):
                hits[k] += 1

    return {
        "number_of_cases": evaluated,
        "top_k_hit_rates": {
            f"top_{k}": round(hits[k] / evaluated, 4)
            for k in k_values
        },
        "mean_reciprocal_rank": round(
            sum(reciprocal_ranks) / evaluated, 4
        ),
        "metric_note": (
            "Synthetic benchmark metrics only; not clinical accuracy."
        ),
    }


def phenotype_only_ranking(variants, observed_phenotypes):
    """Baseline ranking using exact phenotype-term overlap only."""
    results = []

    for variant in variants:
        match = match_phenotypes(
            observed_phenotypes,
            variant.get("phenotype_terms", []),
        )

        results.append({
            "variant_id": variant["id"],
            "gene": variant["gene"],
            "score": round(match["score"], 4),
        })

    return sorted(
        results,
        key=lambda result: result["score"],
        reverse=True,
    )


def evaluate_demo(data):
    """Evaluate one explicitly labelled synthetic demonstration case."""
    case = {
        "family": data["family"],
        "variants": data["variants"],
        "observed_phenotypes": data["observed_phenotypes"],
        "inheritance_mode": data["inheritance_mode"],
        "target_variant_id": "SYN-V001",
    }

    metrics = evaluate_cases([case])

    baseline = phenotype_only_ranking(
        data["variants"],
        data["observed_phenotypes"],
    )

    metrics["phenotype_only_baseline"] = {
        "ranked_variants": baseline,
        "note": (
            "Baseline scores are exact term-overlap fractions. "
            "Ties are ordered by input order."
        ),
    }

    metrics["interpretation"] = (
        "Only one labelled synthetic case is evaluated. "
        "These results demonstrate the evaluation pipeline, "
        "not generalisable model performance."
    )

    return metrics


if __name__ == "__main__":
    import json
    from pathlib import Path

    data_path = (
        Path(__file__).parent
        / "data"
        / "synthetic"
        / "demo_family.json"
    )

    with data_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    report = evaluate_demo(data)

    print("\n========== GENOVA EVALUATION ==========")
    print(json.dumps(report, indent=2))
