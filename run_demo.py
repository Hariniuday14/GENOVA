
import json
from pathlib import Path

from genetics_engine import rank_variants

# Load the synthetic family dataset
data_path = Path("data/synthetic/demo_family.json")

with data_path.open("r", encoding="utf-8") as file:
    data = json.load(file)

# Run the GENOVA analysis engine
results = rank_variants(
    family=data["family"],
    variants=data["variants"],
    observed_phenotypes=data["observed_phenotypes"],
    inheritance_mode=data["inheritance_mode"],
)

# Display the results
print("\n========== GENOVA VARIANT RANKINGS ==========\n")

for result in results:
    print(f"Rank: {result['rank']}")
    print(f"Gene: {result['gene']}")
    print(f"Variant: {result['variant_id']}")
    print(f"Prioritisation score: {result['score']}/100")
    print("Evidence:")
    
    for reason in result["reasons"]:
        print(f"  - {reason}")

    print("-" * 45)

print("\nAnalysis completed.")
print("Scores are for research demonstration only.")
