/**
 * Entry-point externo do pipeline de geração de planos.
 *
 * Mantém a assinatura `triggerActionPlanGeneration(surveyId, companyId)` que já é
 * chamada por server actions em /planos-acao e /gerenciar-pesquisas. Internamente
 * delega para o orchestrator multi-step (Analyst → Curator → Consultant).
 *
 * Spec: docs/superpowers/specs/2026-05-20-pipeline-de-planos-personalizados-design.md
 */

import { runPipeline } from "./pipeline/orchestrator";

export async function triggerActionPlanGeneration(
  surveyId: string,
  companyId: string
) {
  return runPipeline(surveyId, companyId);
}
