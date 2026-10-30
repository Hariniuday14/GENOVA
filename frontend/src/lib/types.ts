export type InheritanceMode =
  | "autosomal_recessive"
  | "autosomal_dominant"
  | "x_linked";

export const INHERITANCE_MODES: {
  value: InheritanceMode;
  label: string;
  short: string;
  description: string;
}[] = [
  {
    value: "autosomal_recessive",
    label: "Autosomal recessive",
    short: "Recessive",
    description:
      "Affected relatives must be homozygous alternate at this single variant.",
  },
  {
    value: "autosomal_dominant",
    label: "Autosomal dominant",
    short: "Dominant",
    description:
      "Affected relatives must carry at least one alternate allele.",
  },
  {
    value: "x_linked",
    label: "X-linked",
    short: "X-linked",
    description:
      "Simplified, deliberately conservative check on affected male genotypes.",
  },
];

export interface FamilyMember {
  id: string;
  generation?: number | null;
  sex?: string | null;
  affected?: boolean | null;
  mother_id?: string | null;
  father_id?: string | null;
  [key: string]: unknown;
}

export interface Variant {
  id: string;
  gene: string;
  genotypes: Record<string, string | null>;
  phenotype_terms?: string[] | null;
  effect_evidence?: number;
  frequency_evidence?: number;
  inheritance_mode?: string | null;
  phase?: Record<string, string> | null;
  [key: string]: unknown;
}

export interface DemoSummary {
  family_members: number;
  affected_members: number;
  unaffected_members: number;
  variants: number;
  genes: string[];
  generations: number[];
  phenotype_terms: number;
  declared_inheritance_mode: string;
}

export interface DemoDataset {
  description: string;
  family: FamilyMember[];
  variants: Variant[];
  observed_phenotypes: string[];
  inheritance_mode: string;
  summary: DemoSummary;
  is_synthetic: boolean;
  disclaimer: string;
}

export interface InheritanceResult {
  mode: string;
  compatible: boolean | null;
  reason: string;
}

export interface PhenotypeMatch {
  score: number;
  matched_terms: string[];
  unmatched_observed_terms: string[];
  method: string;
}

export interface RankedVariant {
  variant_id: string;
  gene: string;
  score: number;
  phenotype_score: number;
  inheritance: InheritanceResult;
  phenotype: PhenotypeMatch;
  effect_points: number;
  frequency_points: number;
  reasons: string[];
  interpretation: string;
  rank: number;
}

export interface InheritanceCheck {
  variant_id: string;
  gene: string;
  mode: string;
  compatible: boolean | null;
  reason: string;
}

export interface CompoundHetPair {
  gene: string;
  individual: string;
  variant_1: string;
  variant_2: string;
  phase_status: string;
  interpretation: string;
}

export interface AnalysisSummary {
  family_members: number;
  affected_members: number;
  variants_analysed: number;
  observed_phenotypes: number;
  top_candidate_id: string | null;
  top_candidate_gene: string | null;
  top_score: number | null;
  mean_score: number | null;
  inheritance_compatible: number;
  candidates_with_phenotype_match: number;
}

export interface ScoreComponent {
  key: "phenotype_points" | "inheritance_points" | "effect_points" | "frequency_points";
  label: string;
  max: number;
  source: string;
}

export interface ScoreScale {
  total_max: number;
  components: ScoreComponent[];
  note: string;
}

export interface AnalysisResult {
  analysis_id: string;
  generated_at: string;
  label: string | null;
  source: string | null;
  dataset_kind: "synthetic_demo" | "custom";
  inheritance_mode: InheritanceMode;
  observed_phenotypes: string[];
  results: RankedVariant[];
  inheritance_checks: InheritanceCheck[];
  compound_het_pairs: CompoundHetPair[];
  validation_errors: string[];
  summary: AnalysisSummary;
  score_scale: ScoreScale;
  disclaimer: string;
}

export interface AnalysisPayload {
  family: FamilyMember[];
  variants: Variant[];
  observed_phenotypes: string[];
  inheritance_mode: InheritanceMode;
  label?: string;
  source?: string;
}

export interface Health {
  status: "ok";
  service: string;
  api_version: string;
  engine_version: string;
  supported_inheritance_modes: string[];
  demo_available: boolean;
  demos: DemoSummary | null;
  score_scale: ScoreScale;
  disclaimer: string;
  server_time: string;
}

export interface EvaluationRanking {
  rank: number;
  variant_id: string;
  gene: string;
  score: number;
  phenotype_score?: number;
  effect_points?: number;
  frequency_points?: number;
  inheritance_compatible?: boolean | null;
  is_target: boolean;
}

export interface EvaluationMetrics {
  number_of_cases: number;
  top_k_hit_rates: Record<string, number>;
  mean_reciprocal_rank: number;
  metric_note: string;
  phenotype_only_baseline: {
    ranked_variants: { variant_id: string; gene: string; score: number }[];
    note: string;
  };
  interpretation: string;
  evaluation_source: string;
}

export interface EvaluationResponse {
  inheritance_mode: InheritanceMode;
  labelled_target_variant_id: string;
  metrics: EvaluationMetrics;
  rankings: EvaluationRanking[];
  baseline_rankings: EvaluationRanking[];
  number_of_cases: number;
  case_note: string;
  disclaimer: string;
}

export interface RunRecord {
  id: string;
  label: string;
  mode: InheritanceMode;
  createdAt: string;
  topGene: string | null;
  topScore: number | null;
  source: "synthetic_demo" | "custom";
  candidateCount: number;
}
