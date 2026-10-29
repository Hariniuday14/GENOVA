from pathlib import Path
import csv
import json

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "synthetic" / "demo_family.json"
SCHEMA_PATH = ROOT / "data" / "synthetic" / "variant_schema.json"
CSV_PATH = ROOT / "data" / "synthetic" / "demo_variants.csv"

with DATA_PATH.open("r", encoding="utf-8") as file:
    data = json.load(file)

fields = [
    "id",
    "gene",
    "inheritance_mode",
    "phenotype_terms",
    "effect_evidence",
    "frequency_evidence",
    "genotypes",
]

schema = {
    "description": "CSV schema for GENOVA synthetic variant records.",
    "required_columns": fields,
    "column_types": {
        "id": "string",
        "gene": "string",
        "inheritance_mode": "string",
        "phenotype_terms": "JSON array of phenotype identifiers",
        "effect_evidence": "number",
        "frequency_evidence": "number",
        "genotypes": "JSON object mapping family member IDs to genotypes",
    },
    "allowed_inheritance_modes": [
        "autosomal_dominant",
        "autosomal_recessive",
        "x_linked",
    ],
    "note": "Synthetic demonstration data only; not clinical evidence.",
}

with SCHEMA_PATH.open("w", encoding="utf-8") as file:
    json.dump(schema, file, indent=2)
    file.write("\n")

with CSV_PATH.open("w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=fields)
    writer.writeheader()
    for variant in data["variants"]:
        row = {key: variant[key] for key in fields}
        row["phenotype_terms"] = json.dumps(row["phenotype_terms"])
        row["genotypes"] = json.dumps(row["genotypes"])
        writer.writerow(row)

print(f"Created schema: {SCHEMA_PATH}")
print(f"Created variant CSV: {CSV_PATH}")
print(f"Exported {len(data['variants'])} synthetic variants.")
