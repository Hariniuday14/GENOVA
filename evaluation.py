
"""Evaluation utilities for the GENOVA research prototype.

Metrics are intended for labelled synthetic benchmark cases.
They do not establish clinical diagnostic performance.
"""

from genetics_engine import rank_variants, match_phenotypes


def reciprocal_rank(results, target_variant_id):
    """Return reciprocal rank of target, or zero if absent."""
    for position, result in enumerate(results, start=1):
        variant_id = result.get("variant_id", result.get("id"))
        if variant_id == target_variant_id:
            return 1.0 / position
    return 0.0


def top_k_hit_rate(results, target_variant_id, k):
    """Return 1 if the target appears in the first k results."""
    return int(reciprocal_rank(results[:k], target_variant_id) > 0)


def phenotype_only_ranking(variants, observed_phenotypes):
    """Rank variants using exact phenotype-term overlap only."""
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


def evaluate_rankings(cases, k_values=(1, 3, 5)):
    """Evaluate the genetics engine and phenotype-only baseline."""
    if not cases:
        raise ValueError("At least one labelled test case is required.")

    methods = {
        "genetics_engine": [],
        "phenotype_only_baseline": [],
    }

    for case in cases:
        target = case["target_variant_id"]
        variants = case["variants"]

        if not any(v["id"] == target for v in variants):
            raise ValueError(
                f"Target variant {target!r} is missing from the case."
            )

        engine_results = rank_variants(
            family=case["family"],
            variants=variants,
            observed_phenotypes=case["observed_phenotypes"],
            inheritance_mode=case["inheritance_mode"],
        )

        baseline_results = phenotype_only_ranking(
            variants,
            case["observed_phenotypes"],
        )

        methods["genetics_engine"].append((engine_results, target))
        methods["phenotype_only_baseline"].append(
            (baseline_results, target)
        )

    report = {"number_of_cases": len(cases), "methods": {}}

    for method, case_results in methods.items():
        top_k_hits = {k: 0 for k in k_values}
        reciprocal_ranks = []

        for results, target in case_results:
            reciprocal_ranks.append(reciprocal_rank(results, target))

            for k in k_values:
                top_k_hits[k] += top_k_hit_rate(results, target, k)

        count = len(case_results)
        report["methods"][method] = {
            "top_k_hit_rates": {
                f"top_{k}": round(top_k_hits[k] / count, 4)
                for k in k_values
            },
            "mean_reciprocal_rank": round(
                sum(reciprocal_ranks) / count, 4
            ),
        }

    report["metric_note"] = (
        "Synthetic benchmark metrics only; not clinical accuracy."
    )
    return report


def evaluate_cases(cases, k_values=(1, 3, 5)):
    """Backwards-compatible evaluation of the genetics engine."""
    comparison = evaluate_rankings(cases, k_values)
    engine = comparison["methods"]["genetics_engine"]

    return {
        "number_of_cases": comparison["number_of_cases"],
        **engine,
        "metric_note": comparison["metric_note"],
    }


def evaluate_demo(data):
    """Evaluate one explicitly labelled synthetic demonstration case."""
    case = {
        "family": data["family"],
        "variants": data["variants"],
        "observed_phenotypes": data["observed_phenotypes"],
        "inheritance_mode": data["inheritance_mode"],
        "target_variant_id": "SYN-V001",
    }

    report = evaluate_rankings([case])
    report["interpretation"] = (
        "Only one labelled synthetic case is evaluated. "
        "These results demonstrate the evaluation pipeline, "
        "not generalisable model performance."
    )
    return report


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
