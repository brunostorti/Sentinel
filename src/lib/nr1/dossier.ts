/**
 * Monta o Dossiê NR-1 (riscos psicossociais) de uma pesquisa encerrada: documento de
 * critérios, inventário de riscos (1.5.7.3.2), riscos evidentes, plano de ação
 * (1.5.5.2) e anexo com os resultados do questionário.
 *
 * Usa o client admin; quem chama (rota da API) confere antes que o usuário é da empresa
 * dona da pesquisa. Os escores vêm de survey_dimension_scores (regra de 5 e supressão
 * complementar aplicadas no banco).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSurveyScoreBreakdown } from "@/lib/copsoq/dashboard";
import type { DimensionScore } from "@/lib/copsoq/types";
import { buildInventory, type GroupInput, type InventoryRow, type MeasureInput } from "./inventory";
import { dimensionRole } from "./hazards";

export interface DossierPlanItem {
  title: string;
  dimension: string | null;
  status: string;
  responsible: string | null;
  dueDate: string | null;
  kanbanColumn: string | null;
  monitoring: string | null;
  indicators: string[];
  sourceSurvey: string | null;
}

export interface Dossier {
  generatedAt: string;
  company: {
    name: string;
    cnpj: string | null;
    industry: string | null;
    employeeCount: number | null;
    workRegime: string | null;
    hasRemote: boolean | null;
    hasShiftWorkers: boolean | null;
    predominantRole: string | null;
  };
  survey: {
    title: string;
    instrument: string;
    version: string | null;
    startedAt: string;
    closedAt: string | null;
    invited: number;
    responses: number;
  };
  groups: { name: string; invited: number; responses: number; visible: boolean }[];
  companyScores: DimensionScore[];
  departmentScores: { name: string; responses: number; scores: DimensionScore[] }[];
  inventory: InventoryRow[];
  evidentRisks: { source: string; description: string }[];
  plan: DossierPlanItem[];
  warnings: string[];
}

const VERSION_LABEL: Record<string, string> = { SHORT: "curta", MEDIUM: "média", LONG: "longa" };

export async function buildDossier(admin: SupabaseClient, surveyId: string): Promise<Dossier> {
  const { data: survey, error } = await admin
    .from("surveys")
    .select("id, title, version, status, created_at, closed_at, company_id, questionnaire_instruments(name)")
    .eq("id", surveyId)
    .single();
  if (error || !survey) throw new Error("Pesquisa não encontrada.");
  const companyId = survey.company_id as string;

  const [
    breakdown,
    { data: company },
    { data: profile },
    { data: departments },
    { data: participants },
    { data: plans },
    { data: reports },
  ] = await Promise.all([
    fetchSurveyScoreBreakdown(admin, surveyId),
    admin.from("companies").select("name, cnpj, industry, employee_count, work_regime").eq("id", companyId).single(),
    admin.from("company_profiles").select("has_remote, has_shift_workers, predominant_role_type").eq("company_id", companyId).maybeSingle(),
    admin.from("departments").select("id, name").eq("company_id", companyId),
    admin.from("survey_participants").select("department_id").eq("survey_id", surveyId),
    admin
      .from("action_plans")
      .select(
        "id, status, dimension_id, survey_id, ai_recommendation, questionnaire_scales(name, scoring_direction), surveys(title), action_outcomes(delta, outcome_status), kanban_tasks(due_date, users!kanban_tasks_assigned_to_fkey(name), kanban_columns(name))"
      )
      .eq("company_id", companyId)
      .in("status", ["APPROVED", "COMPLETED"]),
    admin
      .from("reports")
      .select("occurrence_type")
      .eq("company_id", companyId)
      .gte("created_at", new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()),
  ]);

  const deptName = new Map((departments ?? []).map((d) => [d.id as string, d.name as string]));
  const invitedByDept = new Map<string, number>();
  for (const p of participants ?? []) {
    const key = (p.department_id as string | null) ?? "";
    invitedByDept.set(key, (invitedByDept.get(key) ?? 0) + 1);
  }
  const invited = participants?.length ?? 0;

  // ── Medidas existentes por dimensão (para "medidas implementadas" e eficácia) ──
  type PlanRow = {
    id: string;
    status: string;
    dimension_id: string;
    ai_recommendation: { title?: string; monitoring_cadence?: string; leading_indicators?: { metric: string; target: string }[] } | null;
    questionnaire_scales: { name: string; scoring_direction: "HIGH_IS_RISK" | "HIGH_IS_FAVORABLE" } | null;
    surveys: { title: string } | null;
    action_outcomes: { delta: number | null; outcome_status: string }[];
    kanban_tasks: { due_date: string | null; users: { name: string } | null; kanban_columns: { name: string } | null }[];
  };
  const planRows = (plans ?? []) as unknown as PlanRow[];
  const measuresByDimension = new Map<string, MeasureInput[]>();
  for (const p of planRows) {
    const direction = p.questionnaire_scales?.scoring_direction ?? "HIGH_IS_RISK";
    const improved = p.action_outcomes.some(
      (o) => o.outcome_status === "computed" && o.delta !== null && (direction === "HIGH_IS_RISK" ? o.delta < 0 : o.delta > 0)
    );
    const list = measuresByDimension.get(p.dimension_id) ?? [];
    list.push({ title: p.ai_recommendation?.title ?? "(sem título)", status: p.status, effective: p.status === "COMPLETED" && improved });
    measuresByDimension.set(p.dimension_id, list);
  }

  // ── Grupos (empresa + setores visíveis) ──
  const companyGroup: GroupInput = {
    id: null,
    name: "Empresa toda",
    headcount: company?.employee_count ?? invited,
    responses: breakdown.company.responseCount,
    scores: breakdown.company.isAnonymized ? [] : breakdown.company.scores,
  };
  const groups: Dossier["groups"] = [];
  const visibleDepts: GroupInput[] = [];
  for (const [deptId, group] of breakdown.departments) {
    const name = deptName.get(deptId) ?? "Setor";
    groups.push({ name, invited: invitedByDept.get(deptId) ?? 0, responses: group.responseCount, visible: !group.isAnonymized });
    if (!group.isAnonymized) {
      visibleDepts.push({ id: deptId, name, headcount: invitedByDept.get(deptId) ?? group.responseCount, responses: group.responseCount, scores: group.scores });
    }
  }
  // Setores convidados sem nenhuma resposta também aparecem (adesão é sempre visível).
  for (const [deptId, n] of invitedByDept) {
    if (deptId && !breakdown.departments.has(deptId)) groups.push({ name: deptName.get(deptId) ?? "Setor", invited: n, responses: 0, visible: false });
  }
  groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const inventory = buildInventory(companyGroup, visibleDepts, measuresByDimension);

  // ── Riscos evidentes: denúncias e relatos de violência/assédio no questionário ──
  const evidentRisks: Dossier["evidentRisks"] = [];
  const reportCounts = new Map<string, number>();
  for (const r of reports ?? []) reportCounts.set(r.occurrence_type as string, (reportCounts.get(r.occurrence_type as string) ?? 0) + 1);
  for (const [type, n] of reportCounts) {
    const qty = `${n} ${n === 1 ? "denúncia" : "denúncias"} de "${type}"`;
    evidentRisks.push({
      source: "Canal de denúncias (últimos 12 meses)",
      description: /ass[eé]dio|viol[eê]ncia|discrimina|amea[cç]a|abuso/i.test(type)
        ? `${qty}. Tratar como risco evidente: apurar e adotar medidas imediatas, independentemente da matriz.`
        : `${qty}. Verificar se envolvem fatores psicossociais do trabalho; se sim, tratar como risco evidente.`,
    });
  }
  const offensive = breakdown.company.scores.find((d) => d.name === "Comportamentos ofensivos");
  if (offensive && !breakdown.company.isAnonymized) {
    const { data: items } = await admin.rpc("survey_item_stats", {
      p_survey_id: surveyId,
      p_dimension_id: offensive.dimensionId,
      p_department_id: null,
    });
    for (const item of (items ?? []) as { question_text: string; mean_score: number | string }[]) {
      // Média > 0 significa que ao menos um respondente relatou a situação.
      if (Number(item.mean_score) > 0) {
        evidentRisks.push({
          source: "Questionário (empresa toda)",
          description: `Ao menos um respondente relatou: "${item.question_text.replace(/^Nos últimos 12 meses, no seu local de trabalho:\s*/i, "")}" (últimos 12 meses). Apurar com os canais internos e a CIPA, preservando o anonimato.`,
        });
      }
    }
  }

  // ── Plano de ação ──
  const plan: DossierPlanItem[] = planRows.map((p) => {
    const task = p.kanban_tasks[0];
    return {
      title: p.ai_recommendation?.title ?? "(sem título)",
      dimension: p.questionnaire_scales?.name ?? null,
      status: p.status === "COMPLETED" ? "Concluída" : task?.kanban_columns?.name ?? "Aprovada",
      responsible: task?.users?.name ?? null,
      dueDate: task?.due_date ?? null,
      kanbanColumn: task?.kanban_columns?.name ?? null,
      monitoring: p.ai_recommendation?.monitoring_cadence ?? null,
      indicators: (p.ai_recommendation?.leading_indicators ?? []).map((i) => `${i.metric}: ${i.target}`),
      sourceSurvey: p.surveys?.title ?? null,
    };
  });

  // ── Avisos ──
  const warnings: string[] = [
    "O questionário, sozinho, não basta para caracterizar o gerenciamento dos riscos psicossociais (MTE, Perguntas e Respostas GRO/PGR, item 10): complemente com observação do trabalho, escuta dos trabalhadores e da CIPA e com a Avaliação Ergonômica Preliminar (NR-17).",
  ];
  const measuresHazards = breakdown.company.scores.some(
    (s) => dimensionRole(s.name, s.universalCategory).role === "hazard"
  );
  if (breakdown.company.scores.length && !measuresHazards) {
    warnings.push(
      "O questionário aplicado mede efeitos à saúde (ex.: burnout), não fatores de risco do trabalho: ele não basta para montar o inventário. Para identificar perigos, aplique o COPSOQ II."
    );
  }
  const hidden = groups.filter((g) => !g.visible && g.responses > 0);
  if (hidden.length) {
    warnings.push(
      `${hidden.length} ${hidden.length === 1 ? "setor ficou oculto" : "setores ficaram ocultos"} pela regra de anonimato (${hidden.map((g) => g.name).join(", ")}). Para grupos pequenos, avalie por observação e diálogo, sem identificar pessoas (MTE, Perguntas e Respostas, item 11).`
    );
  }
  const noOwner = plan.filter((p) => !p.responsible).length;
  const noDue = plan.filter((p) => !p.dueDate).length;
  if (noOwner || noDue) {
    warnings.push(
      `Plano de ação incompleto: ${noOwner} ${noOwner === 1 ? "medida sem responsável" : "medidas sem responsável"} e ${noDue} sem prazo. A NR-1 (1.5.5.2.2) exige cronograma com responsáveis — defina no Kanban.`
    );
  }
  const uncovered = inventory.filter((r) => (r.level === "ALTO" || r.level === "MUITO_ALTO") && r.measures.length === 0);
  if (uncovered.length) {
    warnings.push(
      `${uncovered.length} ${uncovered.length === 1 ? "risco alto ou muito alto ainda não tem" : "riscos altos ou muito altos ainda não têm"} medida aprovada no plano de ação.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    company: {
      name: company?.name ?? "Empresa",
      cnpj: company?.cnpj ?? null,
      industry: company?.industry ?? null,
      employeeCount: company?.employee_count ?? null,
      workRegime: company?.work_regime ?? null,
      hasRemote: profile?.has_remote ?? null,
      hasShiftWorkers: profile?.has_shift_workers ?? null,
      predominantRole: profile?.predominant_role_type ?? null,
    },
    survey: {
      title: survey.title as string,
      instrument: (survey.questionnaire_instruments as unknown as { name: string } | null)?.name ?? "Questionário",
      version: survey.version ? VERSION_LABEL[survey.version as string] ?? (survey.version as string) : null,
      startedAt: survey.created_at as string,
      closedAt: (survey.closed_at as string | null) ?? null,
      invited,
      responses: breakdown.company.responseCount,
    },
    groups,
    companyScores: breakdown.company.isAnonymized ? [] : breakdown.company.scores,
    departmentScores: visibleDepts.map((d) => ({ name: d.name, responses: d.responses, scores: d.scores })),
    inventory,
    evidentRisks,
    plan,
    warnings,
  };
}

