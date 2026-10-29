import csv
import json
from pathlib import Path

from genetics_engine import rank_variants

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "synthetic"


def test_variant_csv_matches_schema():
    schema = json.loads(
        (DATA_DIR / "variant_schema.json").read_text(encoding="utf-8")
    )
    with (DATA_DIR / "demo_variants.csv").open(
        newline="", encoding="utf-8"
    ) as file:
        reader = csv.DictReader(file)
        assert reader.fieldnames == schema["required_columns"]
        rows = list(reader)

    assert len(rows) == 4
    assert all(row["id"] and row["gene"] for row in rows)
    for row in rows:
        assert row["inheritance_mode"] in schema["allowed_inheritance_modes"]
        assert isinstance(json.loads(row["phenotype_terms"]), list)
        assert isinstance(json.loads(row["genotypes"]), dict)
        float(row["effect_evidence"])
        float(row["frequency_evidence"])


def test_rankings_are_reproducible():
    data = json.loads(
        (DATA_DIR / "demo_family.json").read_text(encoding="utf-8")
    )

    def get_rankings():
        return [
            (row["variant_id"], row["score"])
            for row in rank_variants(
                family=data["family"],
                variants=data["variants"],
                observed_phenotypes=data["observed_phenotypes"],
                inheritance_mode=data["inheritance_mode"],
            )
        ]

    assert get_rankings() == get_rankings()
