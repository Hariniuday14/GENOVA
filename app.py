
"""
GENOVA
Generational Variant Analysis for Predicting Inherited Disease Susceptibility

Educational research prototype using synthetic data only.
Not for clinical diagnosis or treatment decisions.
"""

import json
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from genetics_engine import (
    rank_variants,
    find_compound_het_pairs,
    validate_family_data,
    check_inheritance,
)
from evaluation import evaluate_demo


# =========================================================
# CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).parent
DEMO_PATH = BASE_DIR / "data" / "synthetic" / "demo_family.json"

st.set_page_config(
    page_title="GENOVA | Variant Analysis",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)


# =========================================================
# CUSTOM STYLING
# =========================================================

st.markdown(
    """
    <style>
    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
    }

    .hero {
        padding: 1.6rem;
        border-radius: 16px;
        background: linear-gradient(115deg, #101c36, #173e5c);
        color: white;
        margin-bottom: 1rem;
    }

    .hero h1 {
        color: white;
        font-size: 2.4rem;
        margin-bottom: 0.3rem;
    }

    .hero p {
        color: #d6e6f4;
        margin-bottom: 0.25rem;
    }

    .section-note {
        color: #8a9bb0;
        font-size: 0.9rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# =========================================================
# DATA HELPERS
# =========================================================

def load_demo_data():
    """Load the synthetic demonstration dataset."""
    if not DEMO_PATH.exists():
        raise FileNotFoundError(
            "Demo dataset not found. Run: python data_generator.py"
        )

    with DEMO_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_family_members(family):
    """Support a list of members or a dictionary containing members."""
    if isinstance(family, list):
        return family

    if isinstance(family, dict):
        members = family.get("members", [])
        if isinstance(members, list):
            return members

    return []


def get_generation(member):
    """Get the generation number from the member record or ID."""
    generation = member.get("generation")

    if generation is not None:
        try:
            return int(generation)
        except (ValueError, TypeError):
            pass

    member_id = str(member.get("id", "")).upper()

    if member_id.startswith("III"):
        return 3
    if member_id.startswith("II"):
        return 2
    if member_id.startswith("I"):
        return 1

    return 1


def get_parent_ids(member):
    """
    Read parent IDs from:
    - parents
    - mother_id
    - father_id
    """
    parents = []

    supplied_parents = member.get("parents", [])

    if isinstance(supplied_parents, str):
        supplied_parents = [supplied_parents] if supplied_parents else []

    if isinstance(supplied_parents, list):
        for parent in supplied_parents:
            if isinstance(parent, dict):
                parent_id = parent.get("id")
            else:
                parent_id = parent

            if parent_id and parent_id not in parents:
                parents.append(parent_id)

    for field in ("mother_id", "father_id"):
        parent_id = member.get(field)

        if parent_id and parent_id not in parents:
            parents.append(parent_id)

    return parents


def prepare_results(data, inheritance_mode):
    """Run variant prioritisation using the selected inheritance model."""
    return rank_variants(
        family=data["family"],
        variants=data["variants"],
        observed_phenotypes=data.get("observed_phenotypes", []),
        inheritance_mode=inheritance_mode,
    )


def display_ranked_variants(results):
    """Create a compact table without nested data structures."""
    results_df = pd.DataFrame(results)

    if results_df.empty:
        st.info("The engine did not return any ranked variants.")
        return results_df

    display_columns = {
        "rank": "Rank",
        "variant_id": "Variant ID",
        "gene": "Gene",
        "score": "Score / 100",
        "phenotype_score": "Phenotype Score",
        "effect_points": "Effect Evidence",
        "frequency_points": "Frequency Evidence",
    }

    available_columns = [
        column
        for column in display_columns
        if column in results_df.columns
    ]

    clean_df = results_df[available_columns].rename(
        columns=display_columns
    )

    # If the engine doesn't return an explicit rank, add one.
    if "Rank" not in clean_df.columns:
        clean_df.insert(
            0,
            "Rank",
            range(1, len(clean_df) + 1),
        )

    st.dataframe(
        clean_df,
        use_container_width=True,
        hide_index=True,
    )

    return results_df


# =========================================================
# THREE-GENERATION PEDIGREE
# =========================================================

def build_pedigree(family):
    """Draw family members and supplied parent-child connections."""
    members = get_family_members(family)

    if not members:
        return None

    generations = {}

    for member in members:
        generation = get_generation(member)
        generations.setdefault(generation, []).append(member)

    x_positions = {}
    y_positions = {}
    member_by_id = {}

    # Assign positions to members.
    for generation, group in generations.items():
        count = len(group)

        for index, member in enumerate(group):
            member_id = member.get("id")

            if member_id is None:
                continue

            member_by_id[member_id] = member
            x_positions[member_id] = index - (count - 1) / 2
            y_positions[member_id] = -generation

    fig = go.Figure()

    # Draw connections before drawing member symbols.
    for member in members:
        child_id = member.get("id")

        if child_id not in x_positions:
            continue

        for parent_id in get_parent_ids(member):
            if parent_id not in x_positions:
                continue

            fig.add_trace(
                go.Scatter(
                    x=[
                        x_positions[parent_id],
                        x_positions[child_id],
                    ],
                    y=[
                        y_positions[parent_id],
                        y_positions[child_id],
                    ],
                    mode="lines",
                    line=dict(
                        color="#94a3b8",
                        width=2,
                    ),
                    hoverinfo="skip",
                    showlegend=False,
                )
            )

    # Draw family members.
    for member in members:
        member_id = member.get("id")

        if member_id not in x_positions:
            continue

        affected = bool(member.get("affected", False))
        sex = str(member.get("sex", "")).lower()

        if sex in ("m", "male"):
            symbol = "square"
        else:
            symbol = "circle"

        node_color = "#ef6b73" if affected else "#7cc9b8"

        fig.add_trace(
            go.Scatter(
                x=[x_positions[member_id]],
                y=[y_positions[member_id]],
                mode="markers+text",
                text=[str(member_id)],
                textposition="bottom center",
                marker=dict(
                    size=30,
                    symbol=symbol,
                    color=node_color,
                    line=dict(
                        color="#243247",
                        width=1.3,
                    ),
                ),
                customdata=[[
                    "Affected" if affected else "Unaffected",
                    get_generation(member),
                    sex or "Not specified",
                ]],
                hovertemplate=(
                    "<b>%{text}</b>"
                    "<br>Status: %{customdata[0]}"
                    "<br>Generation: %{customdata[1]}"
                    "<br>Sex: %{customdata[2]}"
                    "<extra></extra>"
                ),
                showlegend=False,
            )
        )

    ordered_generations = sorted(generations)

    fig.update_layout(
        height=400,
        margin=dict(l=20, r=20, t=20, b=50),
        xaxis=dict(
            visible=False,
            zeroline=False,
        ),
        yaxis=dict(
            tickmode="array",
            tickvals=[-generation for generation in ordered_generations],
            ticktext=[
                f"Generation {generation}"
                for generation in ordered_generations
            ],
            showgrid=False,
            zeroline=False,
        ),
        plot_bgcolor="white",
        paper_bgcolor="white",
    )

    return fig


# =========================================================
# HEADER
# =========================================================

st.markdown(
    """
    <div class="hero">
        <h1>🧬 GENOVA</h1>
        <p>
            Generational Variant Analysis for Predicting
            Inherited Disease Susceptibility
        </p>
        <p>
            Family-aware variant prioritisation ·
            Inheritance review · Phenotype matching
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.warning(
    "RESEARCH PROTOTYPE — This application uses synthetic demonstration "
    "data. Scores are prioritisation scores, not disease probabilities. "
    "It is not validated for clinical diagnosis or treatment."
)


# =========================================================
# LOAD AND VALIDATE DATA
# =========================================================

try:
    data = load_demo_data()

    family = data["family"]
    variants = data["variants"]
    observed_phenotypes = data.get("observed_phenotypes", [])

    family_members = get_family_members(family)

    validation_errors = validate_family_data(family, variants)

    if validation_errors:
        st.error("Dataset validation reported issues:")

        if isinstance(validation_errors, (list, tuple)):
            for error in validation_errors:
                st.write(f"- {error}")
        else:
            st.write(validation_errors)

        st.stop()

except Exception as exc:
    st.error(f"Could not load the GENOVA dataset: {exc}")
    st.info(
        "Check that data/synthetic/demo_family.json exists. "
        "If needed, run: python data_generator.py"
    )
    st.stop()


# =========================================================
# SIDEBAR
# =========================================================

with st.sidebar:
    st.header("Analysis controls")

    st.caption("Explore the included fictional family dataset.")

    if st.button("↻ Reload demo data", use_container_width=True):
        st.rerun()

    inheritance_mode = st.selectbox(
        "Inheritance model",
        options=[
            "autosomal_recessive",
            "autosomal_dominant",
            "x_linked",
        ],
        format_func=lambda value: value.replace("_", " ").title(),
        index=0,
    )

    st.divider()

    st.markdown("**Current dataset**")
    st.write("Synthetic three-generation family")
    st.write(f"Family members: {len(family_members)}")
    st.write(f"Variants: {len(variants)}")

    st.caption("No real patient information is required.")


# =========================================================
# RUN VARIANT RANKING
# =========================================================

try:
    results = prepare_results(data, inheritance_mode)

except Exception as exc:
    st.error(f"Variant analysis failed: {exc}")
    st.stop()


# =========================================================
# TOP METRICS
# =========================================================

affected_count = sum(
    bool(member.get("affected", False))
    for member in family_members
)

metric1, metric2, metric3, metric4 = st.columns(4)

metric1.metric("Family members", len(family_members))
metric2.metric("Affected in demo", affected_count)
metric3.metric("Variants analysed", len(variants))
metric4.metric("Phenotype terms", len(observed_phenotypes))


# =========================================================
# DASHBOARD TABS
# =========================================================

tab_overview, tab_variants, tab_inheritance, tab_evaluation, tab_export = (
    st.tabs(
        [
            "🏠 Overview",
            "🧪 Variant Prioritisation",
            "🧬 Inheritance Analysis",
            "📊 Evaluation",
            "📥 Export",
        ]
    )
)


# =========================================================
# TAB 1: OVERVIEW
# =========================================================

with tab_overview:
    st.subheader("Family overview")

    st.write(
        "GENOVA demonstrates how family genotypes, phenotype-term overlap, "
        "inheritance compatibility, and supplied evidence values can be "
        "combined to prioritise synthetic candidate variants."
    )

    pedigree = build_pedigree(family)

    if pedigree is not None:
        st.plotly_chart(
            pedigree,
            use_container_width=True,
        )

        st.caption(
            "Schematic pedigree: red indicates members marked affected "
            "in the synthetic dataset; teal indicates members marked "
            "unaffected. Lines show parent relationships where available."
        )
    else:
        st.info("No family members are available to draw.")

    with st.expander("View family member records"):
        if family_members:
            st.dataframe(
                pd.DataFrame(family_members),
                use_container_width=True,
                hide_index=True,
            )
        else:
            st.info("No family member records found.")

    st.subheader("How GENOVA works")

    st.markdown(
        """
        **1. Family data:** examines the supplied family members and genotypes.

        **2. Phenotype matching:** compares observed terms with terms supplied
        for each candidate variant.

        **3. Inheritance analysis:** applies the selected simplified
        inheritance model to the available genotype information.

        **4. Evidence scoring:** combines phenotype overlap, inheritance
        compatibility, and the supplied effect and frequency evidence values.

        **5. Candidate ranking:** sorts variants by their prioritisation score.
        """
    )

    st.info(
        "The evidence values and inheritance checks are demonstration "
        "heuristics. They are not clinical classifications."
    )


# =========================================================
# TAB 2: VARIANT PRIORITISATION
# =========================================================

with tab_variants:
    st.subheader("Ranked variant candidates")

    st.caption(
        "Scores are engineered prioritisation scores out of 100, "
        "not probabilities of disease or pathogenicity."
    )

    results_df = display_ranked_variants(results)

    if not results_df.empty and "score" in results_df.columns:
        chart_df = results_df.copy()

        if "gene" in chart_df.columns:
            label_column = "gene"
        elif "variant_id" in chart_df.columns:
            label_column = "variant_id"
        else:
            chart_df["candidate"] = [
                f"Candidate {index + 1}"
                for index in range(len(chart_df))
            ]
            label_column = "candidate"

        chart_df = chart_df.sort_values(
            "score",
            ascending=True,
        )

        fig = go.Figure(
            go.Bar(
                x=chart_df["score"],
                y=chart_df[label_column],
                orientation="h",
                text=chart_df["score"],
                textposition="auto",
                hovertemplate=(
                    "Candidate: %{y}<br>"
                    "Score: %{x}<extra></extra>"
                ),
            )
        )

        fig.update_layout(
            title="Candidate prioritisation scores",
            xaxis_title="Prioritisation score",
            yaxis_title="Candidate",
            xaxis=dict(range=[0, 100]),
            height=350,
            margin=dict(l=20, r=20, t=50, b=40),
        )

        st.plotly_chart(
            fig,
            use_container_width=True,
        )

    st.subheader("Candidate explanations")

    if results:
        for index, result in enumerate(results):
            rank = result.get("rank", index + 1)
            gene = result.get("gene", "Unknown gene")
            variant_id = result.get("variant_id", "Unknown variant")
            score = result.get("score", "N/A")

            with st.expander(
                f"Rank {rank} — {gene} ({variant_id})"
            ):
                st.write(f"**Prioritisation score:** {score}/100")

                reasons = result.get("reasons", [])

                if isinstance(reasons, (list, tuple)) and reasons:
                    for reason in reasons:
                        st.write(f"- {reason}")

                elif isinstance(reasons, str) and reasons:
                    st.write(reasons)

                else:
                    st.write(
                        "No explanation text was returned by the engine."
                    )


# =========================================================
# TAB 3: INHERITANCE ANALYSIS
# =========================================================

with tab_inheritance:
    st.subheader("Inheritance compatibility")

    st.write(
        "Selected model: "
        f"**{inheritance_mode.replace('_', ' ').title()}**"
    )

    st.caption(
        "Compatibility results are simplified heuristic checks, "
        "not proof of inheritance or pathogenicity."
    )

    inheritance_rows = []

    for variant in variants:
        try:
            check = check_inheritance(
                variant,
                family,
                inheritance_mode,
            )

            inheritance_rows.append(
                {
                    "Variant": variant.get("id", "Unknown"),
                    "Gene": variant.get("gene", "Unknown"),
                    "Compatible": check.get("compatible", "Unknown"),
                    "Reason": check.get("reason", ""),
                }
            )

        except Exception as exc:
            inheritance_rows.append(
                {
                    "Variant": variant.get("id", "Unknown"),
                    "Gene": variant.get("gene", "Unknown"),
                    "Compatible": "Error",
                    "Reason": str(exc),
                }
            )

    st.dataframe(
        pd.DataFrame(inheritance_rows),
        use_container_width=True,
        hide_index=True,
    )

    st.subheader("Compound heterozygous candidate pairs")

    st.write(
        "The engine searches for candidate pairs of heterozygous variants "
        "in the same gene. A pair does not establish that variants are "
        "on opposite chromosome copies (in trans)."
    )

    try:
        pairs = find_compound_het_pairs(variants, family)

        if pairs:
            st.dataframe(
                pd.DataFrame(pairs),
                use_container_width=True,
                hide_index=True,
            )
        else:
            st.info(
                "No candidate pairs were returned by the current dataset "
                "and engine rules."
            )

    except Exception as exc:
        st.info(f"Pair analysis could not be completed: {exc}")


# =========================================================
# TAB 4: EVALUATION
# =========================================================

with tab_evaluation:
    st.subheader("Synthetic benchmark evaluation")

    try:
        metrics = evaluate_demo(data)

        hit_rates = metrics.get("top_k_hit_rates", {})

        metric_cols = st.columns(3)

        metric_cols[0].metric(
            "Top-1 hit rate",
            f"{hit_rates.get('top_1', 0):.2f}",
        )

        metric_cols[1].metric(
            "Top-3 hit rate",
            f"{hit_rates.get('top_3', 0):.2f}",
        )

        metric_cols[2].metric(
            "Mean reciprocal rank",
            f"{metrics.get('mean_reciprocal_rank', 0):.2f}",
        )

        st.info(
            f"Number of labelled synthetic cases: "
            f"{metrics.get('number_of_cases', 0)}. "
            "The current evaluation uses only one labelled synthetic case. "
            "These metrics demonstrate the evaluation pipeline; they do not "
            "establish generalisable or clinical performance."
        )

        baseline = metrics.get(
            "phenotype_only_baseline", {}
        ).get("ranked_variants", [])

        if baseline:
            st.subheader("Phenotype-only baseline")

            st.dataframe(
                pd.DataFrame(baseline),
                use_container_width=True,
                hide_index=True,
            )

        with st.expander("View complete evaluation report"):
            st.json(metrics)

    except Exception as exc:
        st.error(f"Could not generate the evaluation report: {exc}")


# =========================================================
# TAB 5: EXPORT
# =========================================================

with tab_export:
    st.subheader("Download analysis results")

    export_payload = {
        "project": "GENOVA",
        "data_type": "synthetic_demo",
        "inheritance_mode": inheritance_mode,
        "observed_phenotypes": observed_phenotypes,
        "ranked_variants": results,
        "disclaimer": (
            "Synthetic research demonstration only. "
            "Scores are not clinical probabilities."
        ),
    }

    json_output = json.dumps(
        export_payload,
        indent=2,
        default=str,
    )

    csv_output = pd.DataFrame(results).to_csv(index=False)

    st.download_button(
        label="⬇ Download ranked variants (JSON)",
        data=json_output,
        file_name="genova_variant_results.json",
        mime="application/json",
        use_container_width=True,
    )

    st.download_button(
        label="⬇ Download ranked variants (CSV)",
        data=csv_output,
        file_name="genova_variant_results.csv",
        mime="text/csv",
        use_container_width=True,
    )

    family_json = json.dumps(
        data,
        indent=2,
        default=str,
    )

    st.download_button(
        label="⬇ Download complete synthetic demo data (JSON)",
        data=family_json,
        file_name="genova_demo_family.json",
        mime="application/json",
        use_container_width=True,
    )

    st.caption(
        "Exports contain the current synthetic demonstration results. "
        "Review the disclaimer before presenting them."
    )


# =========================================================
# FOOTER
# =========================================================

st.divider()

st.markdown(
    """
    <p class="section-note">
        GENOVA · Educational research prototype ·
        Synthetic data only · Not for clinical use
    </p>
    """,
    unsafe_allow_html=True,
)
