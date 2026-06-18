/**
 * Pipeline orchestrator — encadeia Analyst → Curator → Consultant e persiste.
 *
 * Idempotência: usa surveys.ai_generation_status para gating + run_id para tracing.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchSurveyDimensionScores,
  fetchDepartments,
  fetchDepartmentDimensionScores,
  fetchDepartmentResponseCounts,
  fetchHistoricalTrends,
} from "@/lib/copsoq/dashboard";

import { runAnalyst } from "./analyst";
import { runCurator } from "./curator";
import { runConsultant } from "./consultant";
import { buildGroundedFacts, timeframeLabel, type GroundedFacts } from "./grounding";
import { computeOutcomes } from "../learning/outcomes";
import { CATALOG, getInterventionById } from "../knowledge-base/catalog";
import { filterAndAnnotate, filterByCategories } from "../knowledge-base/filters";
import type {
  PipelineContext,
  DepartmentBreakdown,
  DimensionTrendInfo,
} from "./types";
import type {
  CompanyProfile,
  ActionOutcome,
  CompanyActionTaken,
} from "../profile/schema";
import type { UniversalCategoryCode } from "../knowledge-base/catalog";

interface OrchestratorResult {
  status: "completed" | "skipped" | "failed";
  run_id?: string;
  plans_created?: number;
  outcomes_created?: number;
  error?: string;
}

export async function runPipeline(
  surveyId: string,
  companyId: string,
  onProgress?: (step: number, label: string) => void
): Promise<OrchestratorResult> {
  const admin = createAdminClient();
  const run_id = crypto.randomUUID();

  // ─── 1. Idempotência: tenta capturar o "running" lock ─────────────
  const { data: lockResult, error: lockErr } = await admin
    .from("surveys")
    .update({
      ai_generation_status: "running",
      ai_generation_run_id: run_id,
      ai_generation_started_at: new Date().toISOString(),
      ai_generation_error: null,
    })
    .eq("id", surveyId)
    .not("ai_generation_status", "eq", "running")
    .select("id")
    .maybeSingle();

  if (lockErr) {
    return { status: "failed", error: `lock error: ${lockErr.message}` };
  }
  if (!lockResult) {
    return { status: "skipped" };
  }

  try {
    // ─── 1.5. Loop de aprendizado: fecha outcomes pendentes ANTES de gerar novos ──
    try {
      await computeOutcomes(companyId, surveyId);
    } catch (e) {
      console.error("computeOutcomes falhou (não-fatal):", e);
    }

    onProgress?.(1, "Carregando dados da pesquisa");

    // ─── 2. Busca contexto base ───────────────────────────────────────
    const { data: surveyRow } = await admin
      .from("surveys")
      .select(
        "title, version, companies(name, industry, employee_count, work_regime)"
      )
      .eq("id", surveyId)
      .single();

    if (!surveyRow) throw new Error("Survey não encontrada");

    const company = (surveyRow.companies as unknown) as {
      name: string;
      industry: string | null;
      employee_count: number | null;
      work_regime: string | null;
    } | null;

    if (!company) throw new Error("Company não encontrada");

    const { scores } = await fetchSurveyDimensionScores(admin, surveyId);
    if (scores.length === 0) {
      await admin
        .from("surveys")
        .update({
          ai_generation_status: "completed",
          ai_generation_finished_at: new Date().toISOString(),
        })
        .eq("id", surveyId);
      return { status: "completed", plans_created: 0, outcomes_created: 0, run_id };
    }

    const departments = await fetchDepartments(admin, companyId);
    let deptBreakdowns: DepartmentBreakdown[] = [];
    if (departments.length > 0) {
      const deptResults = await fetchDepartmentDimensionScores(
        admin,
        surveyId,
        departments
      );
      deptBreakdowns = deptResults
        .filter((d) => !d.isAnonymous && d.dimensions && d.dimensions.length > 0)
        .map((d) => ({
          name: d.departmentName,
          responseCount: d.responseCount,
          atRiskDimensions: (d.dimensions ?? [])
            .filter(
              (dim) =>
                dim.trafficLight === "RED" || dim.trafficLight === "YELLOW"
            )
            .map((dim) => ({
              name: dim.name,
              score: dim.displayScore,
              riskLevel: dim.trafficLight as "RED" | "YELLOW",
            })),
        }))
        .filter((d) => d.atRiskDimensions.length > 0);
    }

    let trends: DimensionTrendInfo[] = [];
    const historical = await fetchHistoricalTrends(admin, companyId);
    if (historical.dimensions.length > 0) {
      trends = historical.dimensions
        .filter((d) => d.scores.length >= 2)
        .map((d) => {
          const sorted = [...d.scores].sort((a, b) => {
            const sa = historical.surveys.findIndex((s) => s.id === a.surveyId);
            const sb = historical.surveys.findIndex((s) => s.id === b.surveyId);
            return sa - sb;
          });
          const previous = sorted[sorted.length - 2].displayScore;
          const current = sorted[sorted.length - 1].displayScore;
          const diff = current - previous;
          return {
            name: d.name,
            currentScore: current,
            previousScore: previous,
            direction: (diff <= -5
              ? "worsening"
              : diff >= 5
                ? "improving"
                : "stable") as DimensionTrendInfo["direction"],
          };
        });
    }

    const { count: totalResponses } = await admin
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", surveyId);
    const { count: totalParticipants } = await admin
      .from("survey_participants")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", surveyId);

    const responseRate =
      (totalParticipants ?? 0) > 0
        ? Math.round(((totalResponses ?? 0) / (totalParticipants ?? 1)) * 100)
        : 0;

    // ─── 3. Profile + histórico + outcomes ─────────────────────────────
    const { data: profileRow } = await admin
      .from("company_profiles")
      .select("*")
      .eq("company_id", companyId)
      .single();

    const profile = (profileRow as CompanyProfile) ?? null;
    if (!profile) throw new Error("company_profile não encontrado");

    const { data: historyRows } = await admin
      .from("company_actions_taken")
      .select("*")
      .eq("company_id", companyId)
      .order("year_started", { ascending: false })
      .limit(20);
    const history = (historyRows ?? []) as CompanyActionTaken[];

    const { data: outcomesRows } = await admin
      .from("action_outcomes")
      .select("*")
      .eq("company_id", companyId);
    const outcomes = (outcomesRows ?? []) as ActionOutcome[];

    const context: PipelineContext = {
      companyId,
      surveyId,
      surveyTitle: surveyRow.title,
      scores,
      responseRate,
      totalResponses: totalResponses ?? 0,
      totalParticipants: totalParticipants ?? 0,
      departmentBreakdowns: deptBreakdowns,
      trends,
    };

    // ─── 4. Stage 1 — Analyst ─────────────────────────────────────────
    onProgress?.(2, "Analisando dimensões em risco");
    console.log(`[pipeline ${run_id}] Stage 1 (Analyst) iniciando — ${scores.length} dimensões, ${scores.filter(s => s.trafficLight === "RED" || s.trafficLight === "YELLOW").length} em risco`);
    const report = await runAnalyst(context, company, profile);
    console.log(`[pipeline ${run_id}] Stage 1 OK — ${report.prioritized_dimensions.length} dimensões priorizadas: ${report.prioritized_dimensions.map(d => d.dimension_name).join(", ")}`);

    // ─── 5. Hard-filters em TS ────────────────────────────────────────
    const employeeCount = company.employee_count ?? 100;
    const allAnnotated = filterAndAnnotate(CATALOG, profile, outcomes, employeeCount);
    const relevantCategories = Array.from(
      new Set(
        report.prioritized_dimensions.map(
          (d) => d.universal_category_code as UniversalCategoryCode
        )
      )
    );
    const annotated = filterByCategories(allAnnotated, relevantCategories);
    console.log(`[pipeline ${run_id}] Hard-filters: ${annotated.length} interventions em categorias relevantes (${relevantCategories.join(", ")})`);

    // ─── 6. Stage 2 — Curator ─────────────────────────────────────────
    onProgress?.(3, "Selecionando intervenções aplicáveis");
    console.log(`[pipeline ${run_id}] Stage 2 (Curator) iniciando`);
    const selection = await runCurator({
      report,
      profile,
      company,
      history,
      outcomes,
      annotated,
    });
    console.log(`[pipeline ${run_id}] Stage 2 OK — ${selection.candidates.length} candidatos, ${selection.unmet_dimensions.length} dimensões sem candidato`);

    if (selection.candidates.length === 0) {
      console.warn(`[pipeline ${run_id}] ABORT: Curator devolveu 0 candidatos. Unmet: ${JSON.stringify(selection.unmet_dimensions)}`);
      await admin
        .from("surveys")
        .update({
          ai_generation_status: "completed",
          ai_generation_finished_at: new Date().toISOString(),
          ai_generation_error: "Curator devolveu 0 candidatos. Verifique se o perfil da empresa tem orçamento e estrutura compatíveis com as intervenções disponíveis.",
        })
        .eq("id", surveyId);
      return { status: "completed", plans_created: 0, outcomes_created: 0, run_id };
    }

    // ─── 6.5 Grounding — pacote de fatos determinístico por candidato ──
    const deptCounts = await fetchDepartmentResponseCounts(admin, surveyId);
    const deptHeadcount = new Map<string, number>();
    for (const [deptId, s] of deptCounts) {
      deptHeadcount.set(deptId, s.invited || s.responses || 0);
    }
    const companyHeadcount = company.employee_count ?? totalParticipants ?? 100;

    const scoreByDimIdForGrounding = new Map(
      scores.map((s) => [s.dimensionId, s])
    );
    const dimByNameForGrounding = new Map<string, (typeof scores)[number]>();
    for (const s of scores) {
      dimByNameForGrounding.set(s.name.toLowerCase().trim(), s);
    }
    const reportByDimForGrounding = new Map(
      report.prioritized_dimensions.map((d) => [d.dimension_id, d])
    );

    const groundingByKey = new Map<string, GroundedFacts>();
    const groundingByIntervention = new Map<string, GroundedFacts>();
    for (const cand of selection.candidates) {
      let gdim = scoreByDimIdForGrounding.get(cand.dimension_id);
      if (!gdim) {
        const re = reportByDimForGrounding.get(cand.dimension_id);
        if (re)
          gdim = dimByNameForGrounding.get(re.dimension_name.toLowerCase().trim());
      }
      if (!gdim) continue;
      const intervention = getInterventionById(cand.intervention_id);
      if (!intervention) continue;
      try {
        const facts = await buildGroundedFacts({
          admin,
          surveyId,
          dim: gdim,
          intervention,
          deptBreakdowns,
          departments,
          deptHeadcount,
          companyHeadcount,
        });
        groundingByKey.set(`${cand.dimension_id}::${cand.intervention_id}`, facts);
        groundingByIntervention.set(cand.intervention_id, facts);
      } catch (e) {
        console.error(
          `[pipeline ${run_id}] grounding falhou (${cand.intervention_id}):`,
          e
        );
      }
    }
    console.log(
      `[pipeline ${run_id}] Grounding: fatos calculados para ${groundingByKey.size}/${selection.candidates.length} candidatos`
    );

    // ─── 7. Stage 3 — Consultant ───────────────────────────────────────
    onProgress?.(4, "Redigindo plano de ação");
    console.log(`[pipeline ${run_id}] Stage 3 (Consultant) iniciando`);
    const plans = await runConsultant({
      selection,
      report,
      profile,
      company,
      history,
      grounding: groundingByKey,
    });
    console.log(`[pipeline ${run_id}] Stage 3 OK — ${plans.length} planos gerados pelo LLM`);

    // ─── 8. Lookup universal_category_id por code ──────────────────────
    const { data: ucRows } = await admin
      .from("universal_categories")
      .select("id, code");
    const codeToUcId = new Map<string, string>(
      (ucRows ?? []).map((r) => [r.code, r.id])
    );

    // ─── 9. Lookup dim names para mapear dimension_id ────────────────
    const scoreByDimId = new Map(
      scores.map((s) => [s.dimensionId, s])
    );

    // Score lookup por dimension_name (caso o LLM devolva nome em vez de id)
    const dimByName = new Map<string, typeof scores[0]>();
    for (const s of scores) {
      dimByName.set(s.name.toLowerCase().trim(), s);
    }

    // ─── 10. Insert action_plans + action_outcomes ─────────────────────
    type PlanRow = {
      survey_id: string;
      company_id: string;
      dimension_id: string;
      risk_level: "RED" | "YELLOW";
      ai_recommendation: unknown;
      status: "PENDING_REVIEW";
      priority: "critica" | "alta" | "media";
      effort: "baixo" | "medio" | "alto";
      timeframe: string;
      target_department: string;
      universal_category_id: string | null;
    };

    const planRows: PlanRow[] = [];
    type OutcomeRow = {
      company_id: string;
      action_plan_id: null;
      intervention_id: string;
      universal_category_id: string | null;
      dimension_id: string;
      survey_id_before: string;
      score_before: number;
      outcome_status: "pending";
    };
    const outcomeRows: (OutcomeRow & { _intervention_id: string; _dimension_id: string })[] = [];

    const reportByDim = new Map(
      report.prioritized_dimensions.map((d) => [d.dimension_id, d])
    );

    // Fuzzy match por nome (caso LLM tenha inventado uuid mas usado o nome certo
    // num campo de texto, ou tenha trocado a casing/acentuação).
    function fuzzyMatchByName(needle: string) {
      const n = needle.toLowerCase().trim();
      // exact
      const exact = dimByName.get(n);
      if (exact) return exact;
      // contains
      for (const [name, dim] of dimByName.entries()) {
        if (name.includes(n) || n.includes(name)) return dim;
      }
      return undefined;
    }

    let dropped = 0;
    for (const item of plans) {
      let dim = scoreByDimId.get(item.dimension_id);
      if (!dim) {
        // fallback 1: usa o report pra achar o nome verdadeiro dessa entry
        const reportEntry = reportByDim.get(item.dimension_id);
        if (reportEntry) {
          dim = dimByName.get(reportEntry.dimension_name.toLowerCase().trim());
        }
      }
      if (!dim) {
        // fallback 2: fuzzy match — pode ser que o LLM tenha posto o NOME no campo dimension_id
        dim = fuzzyMatchByName(item.dimension_id);
      }
      if (!dim) {
        dropped++;
        console.warn(`[pipeline ${run_id}] DROPPED plan — dimension_id "${item.dimension_id}" não encontrado. intervention="${item.intervention_id}". IDs reais: ${Array.from(scoreByDimId.keys()).join(", ")}`);
        continue;
      }

      const uc_id = codeToUcId.get(item.universal_category_code) ?? null;
      const reportEntry = reportByDim.get(item.dimension_id);
      const priority: "critica" | "alta" | "media" =
        reportEntry?.severity ?? (dim.trafficLight === "RED" ? "critica" : "alta");

      // ─── Merge dos fatos determinísticos (grounding) na recomendação ──
      const facts =
        groundingByKey.get(`${item.dimension_id}::${item.intervention_id}`) ??
        groundingByIntervention.get(item.intervention_id);
      const intervention = getInterventionById(item.intervention_id);

      if (facts) {
        item.recommendation.facts = facts;
        if (facts.financials) {
          item.recommendation.investment = {
            total_annual: facts.financials.investment.value,
            per_employee_month: facts.financials.investmentPerEmployeeMonth.value,
            breakdown: facts.financials.investment.formula ?? "",
          };
          item.recommendation.expected_return = {
            conservative: facts.financials.expectedReturnConservative?.value ?? "N/D",
            optimistic: facts.financials.expectedReturnOptimistic?.value ?? "N/D",
            payback_period: facts.financials.paybackPeriod,
          };
          // year=0 é falsy → a UI omite o ano (catálogo não traz ano por métrica).
          item.recommendation.impact_metrics = facts.financials.expectedImpacts.map(
            (e) => ({
              metric: e.metric,
              change: e.change,
              evidence: {
                study_or_case: e.source,
                year: 0,
                url_or_doi: null,
                br_context: null,
              },
            })
          );
        }
      }

      planRows.push({
        survey_id: surveyId,
        company_id: companyId,
        dimension_id: dim.dimensionId,
        risk_level: dim.trafficLight as "RED" | "YELLOW",
        ai_recommendation: item.recommendation,
        status: "PENDING_REVIEW",
        priority,
        effort: intervention?.effort ?? "medio",
        timeframe: intervention ? timeframeLabel(intervention.timeframe) : "3-6 meses",
        target_department: facts?.department ?? "all",
        universal_category_id: uc_id,
      });

      outcomeRows.push({
        company_id: companyId,
        action_plan_id: null, // será preenchido após o insert
        intervention_id: item.intervention_id,
        universal_category_id: uc_id,
        dimension_id: dim.dimensionId,
        survey_id_before: surveyId,
        score_before: dim.displayScore,
        outcome_status: "pending",
        _intervention_id: item.intervention_id,
        _dimension_id: dim.dimensionId,
      });
    }

    console.log(`[pipeline ${run_id}] Matching: ${planRows.length} planos válidos, ${dropped} descartados.`);

    if (planRows.length === 0) {
      const errorMsg = `LLM gerou ${plans.length} planos mas nenhum dimension_id bateu com os scores reais. Verifique logs do servidor.`;
      console.error(`[pipeline ${run_id}] ABORT: ${errorMsg}`);
      await admin
        .from("surveys")
        .update({
          ai_generation_status: "completed",
          ai_generation_finished_at: new Date().toISOString(),
          ai_generation_error: errorMsg,
        })
        .eq("id", surveyId);
      return { status: "completed", plans_created: 0, outcomes_created: 0, run_id };
    }

    // Limpa planos PENDING anteriores deste survey + run novo
    await admin
      .from("action_plans")
      .delete()
      .eq("survey_id", surveyId)
      .eq("status", "PENDING_REVIEW");

    const { data: insertedPlans, error: insertErr } = await admin
      .from("action_plans")
      .insert(planRows)
      .select("id, dimension_id, ai_recommendation");
    if (insertErr) throw insertErr;
    console.log(`[pipeline ${run_id}] INSERT OK — ${insertedPlans?.length ?? 0} planos salvos no banco.`);

    // Map plan_id → outcome
    const planIdByDim = new Map<string, string>();
    for (const p of insertedPlans ?? []) {
      planIdByDim.set(p.dimension_id, p.id);
    }

    const finalOutcomeRows: OutcomeRow[] = outcomeRows.map((o) => ({
      company_id: o.company_id,
      action_plan_id: (planIdByDim.get(o._dimension_id) ?? null) as null,
      intervention_id: o.intervention_id,
      universal_category_id: o.universal_category_id,
      dimension_id: o.dimension_id,
      survey_id_before: o.survey_id_before,
      score_before: o.score_before,
      outcome_status: o.outcome_status,
    }));

    // Fix: action_plan_id em outcomes precisa do plan_id real (não null)
    const outcomesToInsert = finalOutcomeRows.map((o, idx) => ({
      ...o,
      action_plan_id: (planIdByDim.get(outcomeRows[idx]._dimension_id) ??
        null) as unknown as string | null,
    }));

    if (outcomesToInsert.length > 0) {
      await admin.from("action_outcomes").insert(outcomesToInsert);
    }

    await admin
      .from("surveys")
      .update({
        ai_generation_status: "completed",
        ai_generation_finished_at: new Date().toISOString(),
      })
      .eq("id", surveyId);

    return {
      status: "completed",
      run_id,
      plans_created: insertedPlans?.length ?? 0,
      outcomes_created: outcomesToInsert.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("surveys")
      .update({
        ai_generation_status: "failed",
        ai_generation_finished_at: new Date().toISOString(),
        ai_generation_error: message,
      })
      .eq("id", surveyId);
    return { status: "failed", run_id, error: message };
  }
}
