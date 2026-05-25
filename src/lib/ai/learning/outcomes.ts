/**
 * Loop de aprendizado: quando uma nova pesquisa fecha, encerra outcomes
 * pendentes (computa delta da dimensão) para alimentar o Curator do próximo ciclo.
 *
 * Chamado pelo orchestrator ANTES do pipeline gerar novos planos.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSurveyDimensionScores } from "@/lib/copsoq/dashboard";
import { fetchDepartmentDimensionScores, fetchDepartments } from "@/lib/copsoq/dashboard";

const ANONYMITY_THRESHOLD = 5;

export interface OutcomeComputeResult {
  computed: number;
  unmeasurable: number;
  anonymity_blocked: number;
}

/**
 * Para cada action_outcome com survey_id_after IS NULL desta empresa:
 *   - Tenta encontrar a dimensão na pesquisa atual (que está fechando)
 *   - Se dimensão presente e dept >= 5 respostas → score_after, delta, status=computed
 *   - Se dimensão sumiu → unmeasurable
 *   - Se dept < 5 respostas → anonymity_blocked
 */
export async function computeOutcomes(
  companyId: string,
  newSurveyId: string
): Promise<OutcomeComputeResult> {
  const admin = createAdminClient();

  // Outcomes em aberto desta empresa
  const { data: openOutcomes } = await admin
    .from("action_outcomes")
    .select("id, dimension_id, survey_id_before, action_plan_id")
    .eq("company_id", companyId)
    .is("survey_id_after", null);

  if (!openOutcomes || openOutcomes.length === 0) {
    return { computed: 0, unmeasurable: 0, anonymity_blocked: 0 };
  }

  // Scores da nova pesquisa (company-wide)
  const { scores } = await fetchSurveyDimensionScores(admin, newSurveyId);
  const scoreByDim = new Map(scores.map((s) => [s.dimensionId, s]));

  // (Opcional) Scores por departamento para outcomes com target_department específico
  const departments = await fetchDepartments(admin, companyId);
  const deptScores = await fetchDepartmentDimensionScores(
    admin,
    newSurveyId,
    departments
  );

  let computed = 0;
  let unmeasurable = 0;
  let anonymityBlocked = 0;
  const now = new Date().toISOString();

  for (const outcome of openOutcomes) {
    // Busca o target_department do plano (se houver)
    let targetDept: string | null = null;
    if (outcome.action_plan_id) {
      const { data: plan } = await admin
        .from("action_plans")
        .select("target_department")
        .eq("id", outcome.action_plan_id)
        .maybeSingle();
      if (plan?.target_department && plan.target_department !== "all") {
        targetDept = plan.target_department;
      }
    }

    let scoreAfter: number | null = null;
    let scoreBefore: number | null = null;
    let status: "computed" | "unmeasurable" | "anonymity_blocked" = "unmeasurable";

    if (targetDept) {
      // Usa scores do departamento alvo
      const deptResult = deptScores.find(
        (d) => d.departmentId === targetDept || d.departmentName === targetDept
      );
      if (deptResult) {
        if (deptResult.isAnonymous || deptResult.responseCount < ANONYMITY_THRESHOLD) {
          status = "anonymity_blocked";
          anonymityBlocked++;
        } else if (deptResult.dimensions) {
          const dim = deptResult.dimensions.find(
            (d) => d.dimensionId === outcome.dimension_id
          );
          if (dim) {
            scoreAfter = dim.displayScore;
            status = "computed";
            computed++;
          } else {
            unmeasurable++;
          }
        }
      }
    } else {
      // Usa score company-wide
      const dim = scoreByDim.get(outcome.dimension_id);
      if (dim) {
        scoreAfter = dim.displayScore;
        status = "computed";
        computed++;
      } else {
        unmeasurable++;
      }
    }

    // Pega score_before da pesquisa original + scoring_direction da dimensão
    const [{ data: outcomeRow }, { data: dimRow }] = await Promise.all([
      admin
        .from("action_outcomes")
        .select("score_before")
        .eq("id", outcome.id)
        .single(),
      admin
        .from("questionnaire_scales")
        .select("scoring_direction")
        .eq("id", outcome.dimension_id)
        .single(),
    ]);
    scoreBefore = outcomeRow?.score_before ?? null;

    // Delta NORMALIZADO: positivo = melhora, negativo = piora — independente da direção.
    // - HIGH_IS_FAVORABLE: score subindo é bom → delta = score_after - score_before
    // - HIGH_IS_RISK: score subindo é ruim → delta = score_before - score_after (inverte)
    let delta: number | null = null;
    if (scoreAfter != null && scoreBefore != null) {
      const raw = scoreAfter - scoreBefore;
      const direction = (dimRow?.scoring_direction as string | undefined) ?? "HIGH_IS_FAVORABLE";
      delta = direction === "HIGH_IS_RISK" ? -raw : raw;
    }

    await admin
      .from("action_outcomes")
      .update({
        survey_id_after: newSurveyId,
        score_after: scoreAfter,
        delta,
        outcome_status: status,
        delta_computed_at: status === "computed" ? now : null,
      })
      .eq("id", outcome.id);
  }

  return { computed, unmeasurable, anonymity_blocked: anonymityBlocked };
}
