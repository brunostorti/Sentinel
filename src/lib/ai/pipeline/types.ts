/**
 * Contratos entre os 3 estágios do pipeline multi-step.
 * Spec: docs/superpowers/specs/2026-05-20-pipeline-de-planos-personalizados-design.md §5, §7
 */

import type { DimensionScore } from "@/lib/copsoq/types";

/* ──────────────────────────────────────────────────────────────────────
 * Contexto compartilhado por todos os estágios
 * ────────────────────────────────────────────────────────────────────── */

export interface PipelineContext {
  companyId: string;
  surveyId: string;
  surveyTitle: string;
  scores: DimensionScore[];
  responseRate: number;
  totalResponses: number;
  totalParticipants: number;
  departmentBreakdowns: DepartmentBreakdown[];
  trends: DimensionTrendInfo[];
}

export interface DepartmentBreakdown {
  name: string;
  responseCount: number;
  atRiskDimensions: {
    name: string;
    score: number;
    riskLevel: "RED" | "YELLOW";
  }[];
}

export interface DimensionTrendInfo {
  name: string;
  currentScore: number;
  previousScore: number;
  direction: "improving" | "worsening" | "stable";
}

/* ──────────────────────────────────────────────────────────────────────
 * Stage 1 — Analyst
 * ────────────────────────────────────────────────────────────────────── */

export interface AnalystReport {
  prioritized_dimensions: {
    dimension_id: string;
    dimension_name: string;
    universal_category_code: string;
    score: number;
    risk_level: "RED" | "YELLOW";
    severity: "critica" | "alta" | "media";
    trend: "improving" | "worsening" | "stable" | "first_measurement";
    why_priority: string;
  }[];
  cross_dimension_patterns: {
    pattern_label: string;
    involved_dimensions: string[];
    explanation: string;
  }[];
  systemic_root_causes: string[];
  data_limitations: string[];
}

/* ──────────────────────────────────────────────────────────────────────
 * Stage 2 — Curator
 * ────────────────────────────────────────────────────────────────────── */

export interface CuratedSelection {
  candidates: {
    dimension_id: string;
    intervention_id: string;
    fit_score: number; // 0-100
    personalization_rationale: string;
    cost_estimate_brl: { min: number; max: number };
    requires_external_vendor: boolean;
    excluded_alternatives: {
      intervention_id: string;
      reason: string;
    }[];
  }[];
  unmet_dimensions: {
    dimension_id: string;
    reason: string;
  }[];
  budget_summary: {
    total_estimated_brl: { min: number; max: number };
    fits_declared_budget: boolean;
    headroom_or_overflow_brl: number;
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * Stage 3 — Consultant (shape final do plano)
 * ────────────────────────────────────────────────────────────────────── */

export interface AIRecommendation {
  // Convencimento
  title: string;
  description: string;
  quick_action: string;
  rationale: string;

  // Execução
  roadmap: {
    phase: string;
    deliverable: string;
    owner_role: string;
  }[];
  prerequisites: string[];
  time_to_first_value: string;
  internal_capacity_required: string;

  // Pessoas (RACI)
  stakeholders: {
    accountable: string;
    responsible: string[];
    consulted: string[];
    informed: string[];
  };

  // Fornecedor
  vendors: {
    name: string;
    modality: string;
    price_range: string;
    contact_url: string | null;
    why_fit: string;
  }[];
  internal_alternative: string | null;

  // Acompanhamento
  leading_indicators: {
    metric: string;
    target: string;
    measurement: string;
  }[];
  monitoring_cadence: string;

  // Comunicação
  communication_plan: {
    channels: string[];
    key_message: string;
    timing: string;
  };

  // Custos & retorno
  investment: {
    total_annual: string;
    per_employee_month: string;
    breakdown: string;
  };
  expected_return: {
    conservative: string;
    optimistic: string;
    payback_period: string;
  };

  // Impacto + evidência reforçada
  impact_metrics: {
    metric: string;
    change: string;
    evidence: {
      study_or_case: string;
      year: number;
      url_or_doi: string | null;
      br_context: string | null;
    };
  }[];

  // Riscos
  risk_if_not_acted: string;
  implementation_risks: {
    risk: string;
    mitigation: string;
  }[];

  // Compliance
  nr1_compliance: string | null;
  compliance_extra: string[];
}

/**
 * O orchestrator persiste cada plano enriquecido junto com metadata fora da
 * recommendation. Esse é o shape que vai para `action_plans` no DB.
 */
export interface EnhancedPlan {
  dimensionId: string;
  dimensionName: string;
  riskLevel: "RED" | "YELLOW";
  universalCategoryCode: string;
  universalCategoryId: string | null;
  interventionId: string; // slug do catálogo, ex: 'workload.task-redistribution'
  priority: "critica" | "alta" | "media";
  effort: "baixo" | "medio" | "alto";
  timeframe: string;
  targetDepartment: string;
  recommendation: AIRecommendation;
}
