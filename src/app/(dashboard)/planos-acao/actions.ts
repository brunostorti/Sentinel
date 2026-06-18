"use server";

import { createClient } from "@/lib/supabase/server";
import { triggerActionPlanGeneration } from "@/lib/ai/trigger-generation";

/** Get or create the first kanban column for the company */
async function getFirstKanbanColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
) {
  let { data: columns } = await supabase
    .from("kanban_columns")
    .select("id")
    .eq("company_id", companyId)
    .order("order_index")
    .limit(1);

  if (!columns || columns.length === 0) {
    const defaults = [
      { name: "A Definir", order_index: 0, company_id: companyId },
      { name: "Em Andamento", order_index: 1, company_id: companyId },
      { name: "Quase Concluído", order_index: 2, company_id: companyId },
      { name: "Concluído", order_index: 3, company_id: companyId },
    ];
    const { data: created } = await supabase
      .from("kanban_columns")
      .insert(defaults)
      .select("id")
      .order("order_index");

    columns = created;
  }

  return columns?.[0]?.id ?? null;
}

export async function reviewActionPlan(
  planId: string,
  decision: "APPROVED" | "REJECTED"
) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Sem permissão." };
  }

  const { data: plan } = await supabase
    .from("action_plans")
    .select("id, company_id, status, survey_id, dimension_id, ai_recommendation")
    .eq("id", planId)
    .single();

  if (!plan || plan.company_id !== userData.company_id) {
    return { error: "Plano não encontrado." };
  }

  if (plan.status !== "PENDING_REVIEW") {
    return { error: "Este plano já foi revisado." };
  }

  const { error: updateError } = await supabase
    .from("action_plans")
    .update({ status: decision })
    .eq("id", planId);

  if (updateError) return { error: "Erro ao atualizar plano." };

  if (decision === "APPROVED") {
    const recommendation = plan.ai_recommendation as {
      title: string;
      rationale: string;
      suggested_role: string;
      estimated_impact: string;
    };

    const firstColumnId = await getFirstKanbanColumn(supabase, userData.company_id);
    if (firstColumnId) {
      await supabase.from("kanban_tasks").insert({
        company_id: userData.company_id,
        column_id: firstColumnId,
        title: recommendation.title,
        description: `${recommendation.rationale}\n\nImpacto esperado: ${recommendation.estimated_impact}\nResponsável sugerido: ${recommendation.suggested_role}`,
        dimension_id: plan.dimension_id,
        source_survey_id: plan.survey_id,
        action_plan_id: plan.id,
      });
    }
  }

  return { success: true };
}

export async function bulkApproveActionPlans(planIds: string[]) {
  if (planIds.length === 0) return { error: "Nenhum plano selecionado." };

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Sem permissão." };
  }

  // Fetch all plans in one query
  const { data: plans } = await supabase
    .from("action_plans")
    .select("id, company_id, status, survey_id, dimension_id, ai_recommendation")
    .in("id", planIds)
    .eq("company_id", userData.company_id)
    .eq("status", "PENDING_REVIEW");

  if (!plans || plans.length === 0) {
    return { error: "Nenhum plano pendente encontrado." };
  }

  // Batch update all to APPROVED
  const ids = plans.map((p) => p.id);
  const { error: updateError } = await supabase
    .from("action_plans")
    .update({ status: "APPROVED" })
    .in("id", ids);

  if (updateError) return { error: "Erro ao aprovar planos." };

  // Create kanban tasks — lookup column once
  const firstColumnId = await getFirstKanbanColumn(supabase, userData.company_id);
  if (firstColumnId) {
    const tasks = plans.map((plan) => {
      const rec = plan.ai_recommendation as {
        title: string;
        rationale: string;
        suggested_role: string;
        estimated_impact: string;
      };
      return {
        company_id: userData.company_id,
        column_id: firstColumnId,
        title: rec.title,
        description: `${rec.rationale}\n\nImpacto esperado: ${rec.estimated_impact}\nResponsável sugerido: ${rec.suggested_role}`,
        dimension_id: plan.dimension_id,
        source_survey_id: plan.survey_id,
        action_plan_id: plan.id,
      };
    });

    await supabase.from("kanban_tasks").insert(tasks);
  }

  return { success: true, approvedCount: plans.length };
}

export async function generatePlansForSurvey(surveyId: string) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
    return { error: "Sem permissão." };
  }

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, company_id, status")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.company_id !== userData.company_id) {
    return { error: "Pesquisa não encontrada." };
  }

  if (survey.status !== "CLOSED") {
    return { error: "Apenas pesquisas encerradas podem gerar planos." };
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("placeholder")) {
    return { error: "Chave da API de IA não configurada no .env.local (ANTHROPIC_API_KEY)." };
  }

  // Delete existing plans for this survey before regenerating
  await supabase
    .from("action_plans")
    .delete()
    .eq("survey_id", surveyId)
    .eq("company_id", userData.company_id);

  // Reseta status do pipeline — destrava se ficou preso em 'running' ou 'failed'
  await supabase
    .from("surveys")
    .update({
      ai_generation_status: "not_started",
      ai_generation_run_id: null,
      ai_generation_started_at: null,
      ai_generation_finished_at: null,
      ai_generation_error: null,
    })
    .eq("id", surveyId)
    .eq("company_id", userData.company_id);

  try {
    const result = await triggerActionPlanGeneration(surveyId, userData.company_id);
    if (result.status === "failed") {
      return { error: `Falha: ${result.error ?? "erro desconhecido"}` };
    }
    if (result.status === "skipped") {
      return { error: "Geração já em curso. Aguarde e atualize a página." };
    }
    if (result.status === "completed" && (result.plans_created ?? 0) === 0) {
      return {
        error:
          "Pipeline rodou mas não gerou planos. Verifique se a pesquisa tem dimensões em risco e o perfil da empresa está preenchido. Detalhe no servidor.",
      };
    }
    return { success: true };
  } catch (err) {
    console.error("AI generation failed:", err);
    return { error: "Falha na geração de planos. Tente novamente." };
  }
}
