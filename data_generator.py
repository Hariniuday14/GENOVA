
"""Generate fictional family and variant data for the GENOVA demo."""

import json
from pathlib import Path


OUTPUT_DIR = Path(__file__).parent / "data" / "synthetic"


def generate_demo_data():
    family = [
        {
            "id": "I-1",
            "generation": 1,
            "sex": "female",
            "affected": False,
            "mother_id": None,
            "father_id": None,
        },
        {
            "id": "I-2",
            "generation": 1,
            "sex": "male",
            "affected": False,
            "mother_id": None,
            "father_id": None,
        },
        {
            "id": "II-1",
            "generation": 2,
            "sex": "female",
            "affected": True,
            "mother_id": "I-1",
            "father_id": "I-2",
        },
        {
            "id": "II-2",
            "generation": 2,
            "sex": "male",
            "affected": False,
            "mother_id": None,
            "father_id": None,
        },
        {
            "id": "III-1",
            "generation": 3,
            "sex": "male",
            "affected": True,
            "mother_id": "II-1",
            "father_id": "II-2",
        },
        {
            "id": "III-2",
            "generation": 3,
            "sex": "female",
            "affected": False,
            "mother_id": "II-1",
            "father_id": "II-2",
        },
    ]

    # Every variant is fictional. Evidence points are illustrative
    # inputs for software testing, not clinical classifications.
    variants = [
        {
            "id": "SYN-V001",
            "gene": "GENE_ALPHA",
            "inheritance_mode": "autosomal_recessive",
            "genotypes": {
                "I-1": "HET",
                "I-2": "HET",
                "II-1": "ALT",
                "II-2": "HET",
                "III-1": "ALT",
                "III-2": "HET",
            },
            "phenotype_terms": ["HP:0001250", "HP:0001263"],
            "effect_evidence": 12.0,
            "frequency_evidence": 8.0,
        },
        {
            "id": "SYN-V002",
            "gene": "GENE_BETA",
            "inheritance_mode": "autosomal_dominant",
            "genotypes": {
                "I-1": "REF",
                "I-2": "REF",
                "II-1": "HET",
                "II-2": "REF",
                "III-1": "HET",
                "III-2": "REF",
            },
            "phenotype_terms": ["HP:0001250"],
            "effect_evidence": 9.0,
            "frequency_evidence": 6.0,
        },
        {
            "id": "SYN-V003",
            "gene": "GENE_GAMMA",
            "inheritance_mode": "autosomal_recessive",
            "genotypes": {
                "I-1": "HET",
                "I-2": "REF",
                "II-1": "HET",
                "II-2": "REF",
                "III-1": "HET",
                "III-2": "REF",
            },
            "phenotype_terms": ["HP:0004322"],
            "effect_evidence": 4.0,
            "frequency_evidence": 5.0,
        },
        {
            "id": "SYN-V004",
            "gene": "GENE_DELTA",
            "inheritance_mode": "autosomal_recessive",
            "genotypes": {
                "I-1": "HET",
                "I-2": "HET",
                "II-1": "HET",
                "II-2": "REF",
                "III-1": "HET",
                "III-2": "REF",
            },
            "phenotype_terms": ["HP:0001263", "HP:0004322"],
            "effect_evidence": 7.0,
            "frequency_evidence": 4.0,
        },
    ]

    observed_phenotypes = ["HP:0001250", "HP:0001263"]

    return {
        "description": (
            "Fictional three-generation family for software demonstration only."
        ),
        "family": family,
        "variants": variants,
        "observed_phenotypes": observed_phenotypes,
        "inheritance_mode": "autosomal_recessive",
    }


def save_demo_data():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    data = generate_demo_data()

    output_path = OUTPUT_DIR / "demo_family.json"
    output_path.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )

    return output_path


if __name__ == "__main__":
    path = save_demo_data()
    print(f"Synthetic demo data saved to: {path}")
