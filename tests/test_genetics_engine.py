
import json
from pathlib import Path

import pytest

from genetics_engine import (
    check_inheritance,
    match_phenotypes,
    rank_variants,
    validate_family_data,
)


DATA_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "synthetic"
    / "demo_family.json"
)


@pytest.fixture
def demo_data():
    with DATA_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def test_demo_data_is_valid(demo_data):
    errors = validate_family_data(
        demo_data["family"],
        demo_data["variants"],
    )
    assert errors == []


def test_all_four_variants_are_ranked(demo_data):
    results = rank_variants(
        demo_data["family"],
        demo_data["variants"],
        demo_data["observed_phenotypes"],
        demo_data["inheritance_mode"],
    )
    assert len(results) == 4
    assert [r["rank"] for r in results] == [1, 2, 3, 4]


def test_expected_synthetic_candidate_ranks_first(demo_data):
    results = rank_variants(
        demo_data["family"],
        demo_data["variants"],
        demo_data["observed_phenotypes"],
        demo_data["inheritance_mode"],
    )
    assert results[0]["gene"] == "GENE_ALPHA"
    assert results[0]["score"] == 95.0


def test_recessive_compatibility_for_alpha(demo_data):
    variant = demo_data["variants"][0]
    result = check_inheritance(
        variant,
        demo_data["family"],
        "autosomal_recessive",
    )
    assert result["compatible"] is True


def test_beta_is_not_single_variant_recessive_match(demo_data):
    variant = demo_data["variants"][1]
    result = check_inheritance(
        variant,
        demo_data["family"],
        "autosomal_recessive",
    )
    assert result["compatible"] is False


def test_phenotype_overlap():
    result = match_phenotypes(
        ["HP:0001250", "HP:0001263"],
        ["HP:0001250"],
    )
    assert result["score"] == 0.5
    assert result["matched_terms"] == ["HP:0001250"]


def test_empty_phenotypes_return_zero():
    result = match_phenotypes([], ["HP:0001250"])
    assert result["score"] == 0.0


def test_unsupported_inheritance_mode_raises(demo_data):
    with pytest.raises(ValueError):
        check_inheritance(
            demo_data["variants"][0],
            demo_data["family"],
            "unknown_mode",
        )


def test_invalid_empty_family_is_reported(demo_data):
    errors = validate_family_data([], demo_data["variants"])
    assert any("Family" in error for error in errors)
