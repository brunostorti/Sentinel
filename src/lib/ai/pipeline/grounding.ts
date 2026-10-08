/**
 * Camada de "grounding" (determinística, SEM LLM).
 *
 * Roda entre o Curator e o Consultant. Para cada candidato (dimensão + intervenção)
 * monta um PACOTE DE FATOS 100% rastreável:
 *   1. Evidência da própria pesquisa — quais perguntas puxaram o score, com a
 *      distribuição real das respostas (respeita a Regra de 5).
 *   2. Setor real em risco + headcount real (fim do target_department: "all").
 *   3. Investimento estimado calculado em código (headcount × faixa interna de custo).
 *
 * Princípio: o LLM nunca emite um número sozinho. Todo valor exibido tem fórmula
 * visível e é rotulado pelo que é. Não há projeção de retorno/payback: não existe
 * benchmark verificável que a sustente (auditoria de 07/10/2026).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScoringDirection } from "@/lib/constants";
import { ANONYMITY_THRESHOLD } from "@/lib/constants";
import type { DimensionScore } from "@/lib/copsoq/types";
import type { Intervention } from "../knowledge-base/catalog";
import type { DepartmentBreakdown } from "./types";

/* ──────────────────────────────────────────────────────────────────────
 * Tipos do pacote de fatos
 * ────────────────────────────────────────────────────────────────────── */

/** Um número sempre acompanhado da origem e (quando aplicável) da fórmula. */
export interface SourcedNumber {
  label: string;
  value: string; // já formatado (ex: "R$ 1.400.000")
  rawValue: number;
  source: string; // de onde vem o número (ex.: estimativa interna)
  formula?: string; // como o número foi calculado (transparência)
}

/** Uma pergunta específica da pesquisa que puxou o score da dimensão. */
export interface SurveyEvidenceItem {
  questionText: string;
  meanScore: number; // 0-100 (já ajustado por inversão e direção)
  criticalPercent: number; // % de respondentes no nível mais crítico
  respondents: number;
}

export interface FinancialFacts {
  investment: SourcedNumber;
  investmentPerEmployeeMonth: SourcedNumber;
  estimateNote: string;
}

export interface GroundedFacts {
  department: string; // nome real do setor ou "all"
  headcount: number;
  responsesConsidered: number;
  surveyEvidence: SurveyEvidenceItem[];
  financials: FinancialFacts | null;
}

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────── */

function brl(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** Mapeia o timeframe do catálogo para um rótulo PT legível. */
export function timeframeLabel(tf: Intervention["timeframe"]): string {
  switch (tf) {
    case "curto_prazo":
      return "1-3 meses";
    case "medio_prazo":
      return "3-6 meses";
    case "longo_prazo":
      return "6-12 meses";
    default:
      return "3-6 meses";
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * 1. Evidência da pesquisa — perguntas que mais pesaram
 * ────────────────────────────────────────────────────────────────────── */

export async function buildSurveyEvidence(
  admin: SupabaseClient,
  surveyId: string,
  dimensionId: string,
  scoringDirection: ScoringDirection,
  departmentId?: string
): Promise<{ items: SurveyEvidenceItem[]; respondents: number }> {
  let respQuery = admin
    .from("survey_responses")
    .select("id")
    .eq("survey_id", surveyId);
  if (departmentId) respQuery = respQuery.eq("department_id", departmentId);

  const { data: responses } = await respQuery;
  const respondents = responses?.length ?? 0;

  // Regra de 5: não expõe nada abaixo do limiar de anonimato.
  if (respondents < ANONYMITY_THRESHOLD) return { items: [], respondents };

  const responseIds = responses!.map((r) => r.id);

  const { data: answers } = await admin
    .from("survey_answers")
    .select(
      `
      score,
      question_id,
      questionnaire_items ( text, dimension_id, is_inverted )
    `
    )
    .in("survey_response_id", responseIds);

  if (!answers?.length) return { items: [], respondents };

  // Agrupa por pergunta, aplicando inversão (alinha "alto = pior").
  const byQuestion = new Map<string, { text: string; adjusted: number[] }>();
  for (const a of answers) {
    const qi = a.questionnaire_items as unknown as {
      text: string;
      dimension_id: string;
      is_inverted: boolean;
    } | null;
    if (!qi || qi.dimension_id !== dimensionId) continue;

    const raw = a.score as number;
    const adjusted = qi.is_inverted ? 100 - raw : raw;
    const entry = byQuestion.get(a.question_id as string) ?? {
      text: qi.text,
      adjusted: [],
    };
    entry.adjusted.push(adjusted);
    byQuestion.set(a.question_id as string, entry);
  }

  const items: SurveyEvidenceItem[] = [];
  for (const q of byQuestion.values()) {
    const n = q.adjusted.length;
    if (n === 0) continue;
    const mean = q.adjusted.reduce((s, v) => s + v, 0) / n;
    // Nível crítico: depende da direção da pontuação.
    const criticalCount = q.adjusted.filter((v) =>
      scoringDirection === "HIGH_IS_RISK" ? v >= 75 : v <= 25
    ).length;
    items.push({
      questionText: q.text,
      meanScore: Math.round(mean),
      criticalPercent: Math.round((criticalCount / n) * 100),
      respondents: n,
    });
  }

  // Pior primeiro.
  items.sort((a, b) =>
    scoringDirection === "HIGH_IS_RISK"
      ? b.meanScore - a.meanScore
      : a.meanScore - b.meanScore
  );

  return { items: items.slice(0, 3), respondents };
}

/* ──────────────────────────────────────────────────────────────────────
 * 2. Setor real em risco
 * ────────────────────────────────────────────────────────────────────── */

export function pickWorstDepartment(
  deptBreakdowns: DepartmentBreakdown[],
  dimensionName: string
): { name: string; responseCount: number } | null {
  const candidates = deptBreakdowns
    .map((d) => ({
      d,
      dim: d.atRiskDimensions.find((x) => x.name === dimensionName),
    }))
    .filter((x) => x.dim);

  if (candidates.length === 0) return null;

  // Prioriza RED; desempata por quem tem mais respostas (mais confiável).
  candidates.sort((a, b) => {
    const ar = a.dim!.riskLevel === "RED" ? 1 : 0;
    const br = b.dim!.riskLevel === "RED" ? 1 : 0;
    if (ar !== br) return br - ar;
    return b.d.responseCount - a.d.responseCount;
  });

  return {
    name: candidates[0].d.name,
    responseCount: candidates[0].d.responseCount,
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * 3. Investimento estimado — calculado em código, rotulado como estimativa
 * ────────────────────────────────────────────────────────────────────── */

const ESTIMATE_SOURCE =
  "Estimativa interna da equipe Sentinel (faixa de custo não verificada)";

export function computeFinancials(
  intervention: Intervention,
  headcount: number
): FinancialFacts {
  const hc = Math.max(1, Math.round(headcount));
  const { min, max } = intervention.cost_per_employee;

  const investment: SourcedNumber = {
    label: "Investimento anual estimado",
    value: `${brl(Math.round(hc * min))} – ${brl(Math.round(hc * max))}`,
    rawValue: Math.round(hc * max),
    source: ESTIMATE_SOURCE,
    formula: `${hc} colab × ${brl(min)}–${brl(max)}/colab/ano`,
  };
  const investmentPerEmployeeMonth: SourcedNumber = {
    label: "Por colaborador/mês (estimativa)",
    value: `${brl(Math.round(min / 12))} – ${brl(Math.round(max / 12))}`,
    rawValue: Math.round(max / 12),
    source: ESTIMATE_SOURCE,
  };

  return {
    investment,
    investmentPerEmployeeMonth,
    estimateNote:
      "Ordem de grandeza para planejamento: headcount real da empresa × faixa de custo estimada pela equipe Sentinel, " +
      "não um orçamento de fornecedor. Não exibimos projeção de retorno ou payback porque não há benchmark verificável que a sustente.",
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * Monta o pacote de fatos completo para um candidato
 * ────────────────────────────────────────────────────────────────────── */

export async function buildGroundedFacts(args: {
  admin: SupabaseClient;
  surveyId: string;
  dim: DimensionScore;
  intervention: Intervention;
  deptBreakdowns: DepartmentBreakdown[];
  departments: { id: string; name: string }[];
  deptHeadcount: Map<string, number>; // deptId → nº de convidados (proxy de headcount)
  companyHeadcount: number;
}): Promise<GroundedFacts> {
  const {
    admin,
    surveyId,
    dim,
    intervention,
    deptBreakdowns,
    departments,
    deptHeadcount,
    companyHeadcount,
  } = args;

  const worst = pickWorstDepartment(deptBreakdowns, dim.name);
  const worstDeptId = worst
    ? departments.find((d) => d.name === worst.name)?.id
    : undefined;

  // Tenta evidência no setor pior; se não houver dados suficientes, cai para a empresa toda.
  let evidence = await buildSurveyEvidence(
    admin,
    surveyId,
    dim.dimensionId,
    dim.scoringDirection,
    worstDeptId
  );

  let department = worst?.name ?? "all";
  let headcount =
    worstDeptId != null
      ? deptHeadcount.get(worstDeptId) ?? worst?.responseCount ?? companyHeadcount
      : companyHeadcount;

  if (evidence.items.length === 0 && worstDeptId) {
    // Setor sem dados suficientes (Regra de 5): usa a empresa toda.
    evidence = await buildSurveyEvidence(
      admin,
      surveyId,
      dim.dimensionId,
      dim.scoringDirection
    );
    department = "all";
    headcount = companyHeadcount;
  }

  const financials = computeFinancials(intervention, headcount);

  return {
    department,
    headcount,
    responsesConsidered: evidence.respondents,
    surveyEvidence: evidence.items,
    financials,
  };
}
