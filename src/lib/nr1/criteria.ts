/**
 * Documento de critérios do GRO/PGR para riscos psicossociais (NR-1, subitem
 * 1.5.4.4.2.2) — critério PROPOSTO pelo Sentinel, que a organização deve revisar e
 * adotar formalmente.
 *
 * Base: Manual GRO/PGR da NR-1 (MTE, 2026), seções 11.3 a 11.6 — matriz 5×5 de
 * severidade × probabilidade (exemplo da ISO 45002:2023) e quadro 5 (níveis, prioridade,
 * ações e prazos, adaptado de Popov et al., 2022 e BS 18004).
 *
 * Funções puras: testadas em tests/nr1/criteria.test.ts.
 */

import { TERCILE_HIGH } from "@/lib/copsoq/scoring";

/* ── Severidade ──────────────────────────────────────────────────────────
 * NR-1 1.5.4.4.4.1 e "regra de ouro" do Manual (11.3): para cada perigo, vale a
 * consequência de MAIOR magnitude. Para os fatores psicossociais, a consequência
 * listada pelo Guia do MTE (2025) é o transtorno mental, cujo pior cenário
 * (incapacitante, com afastamento) é classificado como MAIOR (4). */
export const PSYCHOSOCIAL_SEVERITY = 4;

export const SEVERITY_LABELS: Record<number, string> = {
  5: "Morte",
  4: "Maior",
  3: "Moderada",
  2: "Menor",
  1: "Leve",
};

export const PROBABILITY_LABELS: Record<number, string> = {
  5: "Muito provável",
  4: "Provável",
  3: "Possível",
  2: "Pouco provável",
  1: "Muito improvável",
};

/* ── Probabilidade ───────────────────────────────────────────────────────
 * NR-1 1.5.4.4.5.3: para fatores psicossociais, considerar as exigências da atividade
 * (intensidade e duração) e a eficácia das medidas implementadas. A intensidade vem da
 * favorabilidade da dimensão (0–100, quanto menor, pior); as perguntas do COPSOQ II
 * medem frequência nas últimas 4 semanas, o que cobre a duração. */

/**
 * Faixas de favorabilidade → probabilidade-base. A partir do limite verde da dimensão
 * (`greenAt`): sem exposição relevante. Abaixo dele, 3/4, 1/2 e 1/4 do limite separam
 * as probabilidades 2 a 5. Nos tercis do COPSOQ (limite 200/3) isso dá 50, 33,3 e 16,7;
 * em instrumentos com cortes do autor (ex.: JSS, limite 60), as faixas acompanham o corte.
 */
export function baseProbability(favorability: number, greenAt: number = TERCILE_HIGH): number | null {
  if (favorability >= greenAt) return null;
  if (favorability >= greenAt * 0.75) return 2;
  if (favorability >= greenAt * 0.5) return 3;
  if (favorability >= greenAt * 0.25) return 4;
  return 5;
}

export interface ProbabilityAdjustments {
  /** Dimensões de saúde (burnout, stress, sintomas depressivos…) em Risco no mesmo grupo. */
  healthEvidence: boolean;
  /** Medida concluída para o perigo e reavaliação que mostrou melhora. */
  effectiveMeasure: boolean;
}

/**
 * Probabilidade final: +1 se o grupo já relata agravos à saúde (o dano não é só
 * possível, já aparece); −1 se há medida implantada e comprovadamente eficaz.
 */
export function finalProbability(base: number, adj: ProbabilityAdjustments): number {
  let p = base;
  if (adj.healthEvidence) p += 1;
  if (adj.effectiveMeasure) p -= 1;
  return Math.min(5, Math.max(1, p));
}

/* ── Nível de risco, prioridade e prazo (Manual, figura 32 e quadro 5) ── */

export type RiskLevel = "MUITO_ALTO" | "ALTO" | "MEDIO" | "BAIXO";

/** Faixas sobre o produto severidade × probabilidade (valores possíveis da matriz 5×5). */
export function riskLevel(severity: number, probability: number): RiskLevel {
  const product = severity * probability;
  if (product >= 20) return "MUITO_ALTO";
  if (product >= 10) return "ALTO";
  if (product >= 5) return "MEDIO";
  return "BAIXO";
}

export interface LevelInfo {
  label: string;
  priority: string;
  action: string;
  deadline: string;
  /** Prazo usado para sugerir a data da tarefa no Kanban. */
  deadlineDays: number;
  /** Faixa do produto S×P, para o documento de critérios. */
  range: string;
}

export const LEVEL_INFO: Record<RiskLevel, LevelInfo> = {
  MUITO_ALTO: {
    label: "Muito alto",
    priority: "Altíssima",
    action:
      "Ações corretivas imediatas. A situação não deve continuar sem que o risco seja reduzido.",
    deadline: "Imediato (primeira ação em até 7 dias)",
    deadlineDays: 7,
    range: "20 a 25",
  },
  ALTO: {
    label: "Alto",
    priority: "Alta",
    action: "Ações urgentes: adotar medidas de controle que reduzam o risco.",
    deadline: "Menos de 3 meses",
    deadlineDays: 89,
    range: "10 a 16",
  },
  MEDIO: {
    label: "Médio",
    priority: "Moderada",
    action:
      "Reavaliar os controles existentes e implementar medidas adicionais; pode exigir análise mais detalhada.",
    deadline: "Menos de 9 meses",
    deadlineDays: 269,
    range: "5 a 9",
  },
  BAIXO: {
    label: "Baixo",
    priority: "Baixa",
    action: "Nenhum controle adicional necessário; manter o monitoramento.",
    deadline: "Periódico, até 12 meses",
    deadlineDays: 365,
    range: "1 a 4",
  },
};

export const LEVEL_ORDER: RiskLevel[] = ["MUITO_ALTO", "ALTO", "MEDIO", "BAIXO"];

/** Classificação completa de um perigo num grupo. */
export function classify(favorability: number, adj: ProbabilityAdjustments, greenAt: number = TERCILE_HIGH) {
  const base = baseProbability(favorability, greenAt);
  if (base === null) return null;
  const probability = finalProbability(base, adj);
  const level = riskLevel(PSYCHOSOCIAL_SEVERITY, probability);
  return { severity: PSYCHOSOCIAL_SEVERITY, baseProbability: base, probability, level, product: PSYCHOSOCIAL_SEVERITY * probability };
}

/**
 * Prazo sugerido para a tarefa de um plano aprovado, a partir da favorabilidade da
 * dimensão (sem os ajustes, que dependem do grupo): usado como data inicial no Kanban.
 */
export function suggestedDueDate(favorability: number, from = new Date(), greenAt: number = TERCILE_HIGH): string {
  const result = classify(favorability, { healthEvidence: false, effectiveMeasure: false }, greenAt);
  const days = LEVEL_INFO[result?.level ?? "BAIXO"].deadlineDays;
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due.toISOString().slice(0, 10);
}
