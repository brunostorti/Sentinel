/* Shared types for the Planos de Ação UI — v2 (shape do pipeline novo) */

import type { AIRecommendation } from "@/lib/ai/pipeline/types";

/** Reexporta o shape canônico para o resto da UI deste módulo. */
export type Recommendation = AIRecommendation;

export interface PlanView {
  id: string;
  riskLevel: "RED" | "YELLOW";
  recommendation: Recommendation;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED" | "AI_GENERATION_FAILED";
  createdAt: string;
  surveyId: string;
  surveyTitle: string;
  dimensionName: string;
  priority: string | null;
  effort: string | null;
  timeframe: string | null;
  outcome?: "successful" | "partial" | "unsuccessful" | "in_progress" | null;
  outcomeNotes?: string | null;
}
