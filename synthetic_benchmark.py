"""Synthetic benchmark for GENOVA software testing only."""

import copy
import json
from pathlib import Path

from evaluation import evaluate_rankings, phenotype_only_ranking
from genetics_engine import rank_variants, validate_family_data

ROOT = Path(__file__).resolve().parent
DEMO_PATH = ROOT / "data" / "synthetic" / "demo_family.json"


def build_benchmark():
    with DEMO_PATH.open("r", encoding="utf-8") as file:
        demo = json.load(file)

    cases = []

    scenarios = [
        ("CASE-01", "SYN-V001", ["HP:0001250", "HP:0001263"],
         "autosomal_recessive"),
        ("CASE-02", "SYN-V002", ["HP:0001250"],
         "autosomal_dominant"),
        ("CASE-03", "SYN-V003", ["HP:0004322"],
         "autosomal_recessive"),
        ("CASE-04", "SYN-V004", ["HP:0001263", "HP:0004322"],
         "autosomal_recessive"),
        ("CASE-05", "SYN-V002", ["HP:0001250", "HP:0001263"],
         "autosomal_dominant"),
        ("CASE-06", "SYN-V001", ["HP:0001263"],
         "autosomal_recessive"),
    ]

    for case_id, target_id, phenotypes, mode in scenarios:
        family = copy.deepcopy(demo["family"])
        variants = copy.deepcopy(demo["variants"])

        for variant in variants:
            variant["id"] = f"{case_id}-{variant['id']}"

        renamed_target = f"{case_id}-{target_id}"

        errors = validate_family_data(family, variants)
        if errors:
            raise ValueError(f"{case_id}: {' '.join(errors)}")

        if not any(v["id"] == renamed_target for v in variants):
            raise ValueError(f"{case_id}: target variant is missing.")

        cases.append({
            "case_id": case_id,
            "family": family,
            "variants": variants,
            "observed_phenotypes": phenotypes,
            "inheritance_mode": mode,
            "target_variant_id": renamed_target,
        })

    return cases



def main():
    cases = build_benchmark()

    for case in cases:
        if case["case_id"] not in ("CASE-03", "CASE-04"):
            continue

        results = rank_variants(
            case["family"],
            case["variants"],
            case["observed_phenotypes"],
            case["inheritance_mode"],
        )

        print(
            f"\n{case['case_id']} | "
            f"phenotypes={case['observed_phenotypes']} | "
            f"mode={case['inheritance_mode']}"
        )

        for result in results:
            inheritance = result["inheritance"]

            print(
                f"\n  {result['variant_id']} ({result['gene']})"
                f"\n    Rank: {result['rank']}"
                f"\n    Total: {result['score']}"
                f"\n    Phenotype points: {result['phenotype_score']}"
                f"\n    Inheritance points: "
                f"{25.0 if inheritance['compatible'] is True else 0.0}"
                f"\n    Inheritance compatible: "
                f"{inheritance['compatible']}"
                f"\n    Inheritance reason: {inheritance['reason']}"
                f"\n    Effect points: {result['effect_points']}"
                f"\n    Frequency points: {result['frequency_points']}"
            )

    report = evaluate_rankings(cases)
    print("\n========== PER-CASE RANKING DIAGNOSTICS ==========")

    for case in cases:
        engine_results = rank_variants(
        family=case["family"],
        variants=case["variants"],
        observed_phenotypes=case["observed_phenotypes"],
        inheritance_mode=case["inheritance_mode"],
)
        baseline_results = phenotype_only_ranking(
            case["variants"],
            case["observed_phenotypes"],
        )

        target_id = case["target_variant_id"]

        def find_rank(results):
            for position, result in enumerate(results, start=1):
                if result.get("variant_id", result.get("id")) == target_id:
                    return position
            return None

        print(f"\n{case['case_id']} | assumed target: {target_id}")
        print(f"  GENOVA target rank: {find_rank(engine_results)}")
        print(f"  Baseline target rank: {find_rank(baseline_results)}")
        print("  GENOVA order:",
              " > ".join(
                  str(r.get("variant_id", r.get("id")))
                  for r in engine_results
              ))
        print("  Baseline order:",
              " > ".join(
                  str(r.get("variant_id", r.get("id")))
                  for r in baseline_results
              ))

    report["benchmark_note"] = (
        "Six constructed synthetic scenarios. Target labels are assumed "
        "for software testing and are not independent clinical ground truth. "
        "Several scenarios reuse the same underlying family and variant "
        "records, so they are not six independent families."
    )

    output_path = ROOT / "synthetic_benchmark_results.json"
    output_path.write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )

    print("\n========== GENOVA SYNTHETIC BENCHMARK ==========")
    print(json.dumps(report, indent=2))
    print(f"\nSaved report to: {output_path}")


if __name__ == "__main__":
    main()