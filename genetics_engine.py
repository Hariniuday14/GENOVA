
"""
GENOVA: Generational Variant Analysis for Predicting Inherited Disease Susceptibility

Research prototype only. Candidate rankings are not diagnoses or clinical
probabilities. Inheritance checks are simplified compatibility heuristics.
"""

from itertools import combinations


SUPPORTED_MODES = {
    "autosomal_dominant",
    "autosomal_recessive",
    "x_linked",
}


def normalize_genotype(genotype):
    """Normalize common genotype strings; return None if missing/invalid."""
    if genotype is None:
        return None

    value = str(genotype).strip().replace("|", "/").replace(" ", "")

    aliases = {
        "0/0": "REF",
        "0|0": "REF",
        "REF/REF": "REF",
        "0/1": "HET",
        "1/0": "HET",
        "0|1": "HET",
        "1|0": "HET",
        "1/1": "ALT",
        "1|1": "ALT",
        "ALT/ALT": "ALT",
        "./.": None,
        ".": None,
        "": None,
    }

    return aliases.get(value.upper(), value.upper() if value.upper() in {
        "REF", "HET", "ALT"
    } else None)


def validate_family_data(family, variants):
    """Return a list of input problems. Empty means basic validation passed."""
    errors = []

    if not isinstance(family, list) or not family:
        errors.append("Family must be a non-empty list.")
        return errors

    if not isinstance(variants, list) or not variants:
        errors.append("Variants must be a non-empty list.")
        return errors

    member_ids = set()

    for member in family:
        if not isinstance(member, dict) or not member.get("id"):
            errors.append("Every family member needs an id.")
            continue

        member_id = str(member["id"])

        if member_id in member_ids:
            errors.append(f"Duplicate family member id: {member_id}")

        member_ids.add(member_id)

    variant_ids = set()

    for variant in variants:
        if not isinstance(variant, dict):
            errors.append("Every variant must be a dictionary.")
            continue

        if not variant.get("id") or not variant.get("gene"):
            errors.append("Every variant needs an id and gene.")
            continue

        variant_id = str(variant["id"])

        if variant_id in variant_ids:
            errors.append(f"Duplicate variant id: {variant_id}")

        variant_ids.add(variant_id)

        genotypes = variant.get("genotypes", {})

        if not isinstance(genotypes, dict):
            errors.append(
                f"Variant {variant_id}: genotypes must be a dictionary."
            )
            continue

        unknown_members = set(genotypes) - member_ids

        if unknown_members:
            errors.append(
                f"Variant {variant_id}: unknown family members "
                f"{sorted(unknown_members)}."
            )

        for person_id, genotype in genotypes.items():
            if normalize_genotype(genotype) is None and genotype not in (
                None, "", ".", "./."
            ):
                errors.append(
                    f"Variant {variant_id}: invalid genotype "
                    f"for {person_id}: {genotype}"
                )

    return errors


def check_inheritance(variant, family, mode):
    """
    Assess simplified compatibility with an inheritance model.

    Each family member may contain:
      id, affected (True/False/None), mother_id, father_id, sex.

    This is a screening heuristic, not a clinical interpretation.
    """
    if mode not in SUPPORTED_MODES:
        raise ValueError(f"Unsupported inheritance mode: {mode}")

    genotypes = variant.get("genotypes", {})
    members = {str(m["id"]): m for m in family if m.get("id")}

    observed = {
        person_id: normalize_genotype(genotypes.get(person_id))
        for person_id in members
    }

    affected = [
        person_id for person_id, member in members.items()
        if member.get("affected") is True
    ]

    unaffected = [
        person_id for person_id, member in members.items()
        if member.get("affected") is False
    ]

    missing_affected = [
        person_id for person_id in affected
        if observed[person_id] is None
    ]

    if missing_affected:
        return {
            "mode": mode,
            "compatible": None,
            "reason": "Genotypes are missing for affected relatives.",
        }

    affected_genotypes = [observed[p] for p in affected]

    if mode == "autosomal_dominant":
        compatible = all(g in ("HET", "ALT") for g in affected_genotypes)
        contradictory = any(
            observed[p] in ("HET", "ALT")
            for p in unaffected
        )

        if not affected:
            compatible = None
            reason = "No affected relatives supplied."
        elif not compatible:
            reason = "At least one affected relative lacks the alternate allele."
        elif contradictory:
            reason = (
                "An unaffected relative carries the alternate allele; "
                "penetrance and age must be considered."
            )
            compatible = None
        else:
            reason = "Observed genotypes are compatible with a dominant model."

    elif mode == "autosomal_recessive":
        compatible = all(g == "ALT" for g in affected_genotypes)

        if not affected:
            compatible = None
            reason = "No affected relatives supplied."
        elif not compatible:
            reason = (
                "At least one affected relative is not homozygous alternate "
                "at this single variant; a second variant may be relevant."
            )
        else:
            reason = (
                "Homozygous alternate genotypes are compatible with a "
                "recessive model, subject to variant and clinical evidence."
            )

    else:  # X-linked: deliberately conservative simplified heuristic
        male_affected = [
            p for p in affected
            if str(members[p].get("sex", "")).lower()
            in ("m", "male", "xy")
        ]

        if not affected:
            compatible = None
            reason = "No affected relatives supplied."
        elif any(observed[p] is None for p in male_affected):
            compatible = None
            reason = "Missing genotype in an affected male relative."
        elif male_affected and all(
            observed[p] == "ALT" for p in male_affected
        ):
            compatible = True
            reason = (
                "Affected male genotypes are compatible with an X-linked "
                "hypothesis; inheritance and sex-chromosome context need review."
            )
        else:
            compatible = None
            reason = (
                "This simplified checker cannot establish X-linked "
                "compatibility from the available information."
            )

    return {
        "mode": mode,
        "compatible": compatible,
        "reason": reason,
    }


def match_phenotypes(observed_terms, candidate_terms):
    """
    Return simple term-overlap similarity from 0 to 1.

    This is not ontology-based semantic HPO similarity.
    """
    observed = {str(t).strip() for t in (observed_terms or []) if str(t).strip()}
    candidate = {
        str(t).strip() for t in (candidate_terms or []) if str(t).strip()
    }

    if not observed or not candidate:
        return {
            "score": 0.0,
            "matched_terms": [],
            "unmatched_observed_terms": sorted(observed),
            "method": "exact_term_overlap",
        }

    matched = sorted(observed & candidate)

    return {
        "score": len(matched) / len(observed),
        "matched_terms": matched,
        "unmatched_observed_terms": sorted(observed - candidate),
        "method": "exact_term_overlap",
    }


def find_compound_het_pairs(variants, family):
    """
    Find candidate pairs in the same gene when both are heterozygous
    in an affected individual. Report phase separately; do not assume
    the variants are in trans.
    """
    pairs = []

    affected_members = [
        str(member["id"])
        for member in family
        if member.get("id") and member.get("affected") is True
    ]

    for first, second in combinations(variants, 2):
        if first.get("gene") != second.get("gene"):
            continue

        for person_id in affected_members:
            g1 = normalize_genotype(
                first.get("genotypes", {}).get(person_id)
            )
            g2 = normalize_genotype(
                second.get("genotypes", {}).get(person_id)
            )

            if g1 != "HET" or g2 != "HET":
                continue

            phase1 = first.get("phase", {}).get(person_id)
            phase2 = second.get("phase", {}).get(person_id)

            if phase1 and phase2 and phase1 != phase2:
                phase_status = "reported_in_trans"
            elif phase1 and phase2 and phase1 == phase2:
                phase_status = "reported_in_cis"
            else:
                phase_status = "unknown"

            pairs.append({
                "gene": first["gene"],
                "individual": person_id,
                "variant_1": first["id"],
                "variant_2": second["id"],
                "phase_status": phase_status,
                "interpretation": (
                    "Candidate pair for expert review; phase and "
                    "pathogenicity require evidence."
                ),
            })

    return pairs


def rank_variants(
    family,
    variants,
    observed_phenotypes,
    inheritance_mode="autosomal_recessive",
):
    """
    Rank variants using a transparent demonstration score.

    Scores are prioritisation scores, NOT probabilities of disease.
    Annotation fields must come from supplied data; this function
    does not fetch or invent external annotations.
    """
    errors = validate_family_data(family, variants)

    if errors:
        raise ValueError("Invalid input: " + " ".join(errors))

    results = []

    for variant in variants:
        inheritance = check_inheritance(
            variant, family, inheritance_mode
        )

        phenotype = match_phenotypes(
            observed_phenotypes,
            variant.get("phenotype_terms", []),
        )

        # Each component is an explicit prototype heuristic.
        phenotype_points = 50.0 * phenotype["score"]

        inheritance_points = (
            25.0 if inheritance["compatible"] is True
            else 0.0
        )

        # These fields must be provided in the input data.
        effect_points = float(variant.get("effect_evidence", 0.0))
        frequency_points = float(variant.get("frequency_evidence", 0.0))

        # Keep inputs bounded so the demonstration score is interpretable.
        effect_points = max(0.0, min(15.0, effect_points))
        frequency_points = max(0.0, min(10.0, frequency_points))

        total = (
            phenotype_points
            + inheritance_points
            + effect_points
            + frequency_points
        )

        reasons = [
            f"Phenotype overlap: {len(phenotype['matched_terms'])} "
            "matched term(s).",
            inheritance["reason"],
            "Variant-effect evidence: "
            f"{effect_points:.1f}/15 supplied points.",
            "Population-frequency evidence: "
            f"{frequency_points:.1f}/10 supplied points.",
        ]

        results.append({
            "variant_id": variant["id"],
            "gene": variant["gene"],
            "score": round(total, 2),
            "phenotype_score": round(phenotype_points, 2),
            "inheritance": inheritance,
            "phenotype": phenotype,
            "effect_points": effect_points,
            "frequency_points": frequency_points,
            "reasons": reasons,
            "interpretation": "Research prioritisation only; not a diagnosis.",
        })

    results.sort(key=lambda item: item["score"], reverse=True)

    for index, result in enumerate(results, start=1):
        result["rank"] = index

    return results
