/**
 * Tipos do perfil da empresa (`company_profiles`) e do histórico de ações.
 * Espelha a Migration 008.
 */

export type BudgetHorizon = "ano_corrente" | "12_meses" | "bienio";
export type BudgetFlexibility = "rigid" | "flexible" | "unlocked_for_critical";
export type DecisionSpeed = "fast" | "normal" | "slow";
export type CultureType =
  | "startup"
  | "family"
  | "corporate"
  | "public"
  | "multinational"
  | "other";
export type PredominantRoleType =
  | "office"
  | "industrial"
  | "field"
  | "mixed"
  | "remote";

export interface WorkforceComposition {
  avg_age?: number;
  education_distribution?: Record<string, number>; // ex: { "fundamental": 0.1, "medio": 0.5, ... }
  regime_split?: { clt?: number; pj?: number; terceirizado?: number };
  shift_pattern?: "diurno" | "noturno" | "rotativo" | "misto";
}

export interface CompanyProfile {
  id: string;
  company_id: string;

  // Orçamento
  annual_budget_brl: number | null;
  budget_per_employee_year_brl: number | null;
  budget_horizon: BudgetHorizon | null;
  budget_flexibility: BudgetFlexibility | null;
  existing_wellbeing_spend_brl: number | null;

  // Estrutura RH
  hr_team_size: number | null;
  has_dedicated_hr: boolean | null;
  has_internal_training: boolean | null;
  has_occupational_health: boolean | null;
  has_compliance_officer: boolean | null;
  decision_speed: DecisionSpeed | null;
  culture_type: CultureType | null;
  declared_values: string[] | null;

  // Colaboradores + região
  workforce_composition: WorkforceComposition | null;
  predominant_role_type: PredominantRoleType | null;
  regions: string[] | null;
  has_remote: boolean | null;
  has_shift_workers: boolean | null;
  has_unionized_workers: boolean | null;

  // Restrições/preferências
  constraints: string[] | null;
  preferred_modalities: string[] | null;
  avoid_modalities: string[] | null;

  // Flags "HR já revisou"
  regions_reviewed_at: string | null;
  constraints_reviewed_at: string | null;
  preferred_modalities_reviewed_at: string | null;
  workforce_composition_reviewed_at: string | null;

  setup_completeness: number;
  created_at: string;
  updated_at: string;
}

export type ActionOutcomeStatus =
  | "pending"
  | "computed"
  | "unmeasurable"
  | "anonymity_blocked";

export type HrAttribution = "high" | "medium" | "low" | "none" | "cannot_tell";

export interface ActionOutcome {
  id: string;
  company_id: string;
  action_plan_id: string | null;
  intervention_id: string;
  universal_category_id: string | null;
  dimension_id: string;
  survey_id_before: string;
  score_before: number;
  survey_id_after: string | null;
  score_after: number | null;
  delta: number | null;
  delta_computed_at: string | null;
  outcome_status: ActionOutcomeStatus | null;
  hr_attribution: HrAttribution | null;
  hr_notes: string | null;
  attribution_collected_at: string | null;
  attribution_user_id: string | null;
  attribution_skip_count: number;
  created_at: string;
  updated_at: string;
}

export type CompanyActionSource =
  | "manual_entry"
  | "sentinel_kanban"
  | "sentinel_outcome";

export type CompanyActionOutcome =
  | "successful"
  | "partial"
  | "unsuccessful"
  | "abandoned"
  | "in_progress"
  | "unknown";

export interface CompanyActionTaken {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  universal_category_id: string | null;
  year_started: number | null;
  year_ended: number | null;
  outcome: CompanyActionOutcome | null;
  outcome_notes: string | null;
  source: CompanyActionSource;
  linked_action_plan_id: string | null;
  created_at: string;
}

export interface ProfileEvent {
  id: string;
  company_id: string;
  event_type: string;
  field_path: string;
  old_value: unknown | null;
  new_value: unknown | null;
  source_context: string | null;
  confidence: "high" | "medium" | "low" | null;
  confirmed_by_user_id: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  created_at: string;
}
