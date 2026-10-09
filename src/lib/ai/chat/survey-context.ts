/**
 * Resultados da pesquisa mais recente, como contexto ESTRUTURADO do chat.
 *
 * Os números vêm do banco (survey_dimension_scores: médias, regra de 5 e supressão
 * complementar já aplicadas) e entram direto no prompt — não passam pelo RAG, que
 * poderia trazer o número errado ou de outra pesquisa (docs/rag/2026-10-09-design-rag.md, seção 2).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSurveyScoreBreakdown } from "@/lib/copsoq/dashboard";
import type { DimensionScore } from "@/lib/copsoq/types";

const LIGHT_LABEL = { GREEN: "Favorável", YELLOW: "Intermédio", RED: "Risco" } as const;
const VERSION_LABEL: Record<string, string> = { SHORT: "curta", MEDIUM: "média", LONG: "longa" };

function dimensionLine(d: DimensionScore): string {
  const direction = d.scoringDirection === "HIGH_IS_RISK" ? "quanto maior, pior" : "quanto maior, melhor";
  return `- ${d.name}: ${d.displayScore} (${direction}) — ${LIGHT_LABEL[d.trafficLight]}`;
}

export async function buildSurveyScoresBlock(admin: SupabaseClient, companyId: string): Promise<string> {
  const { data: survey } = await admin
    .from("surveys")
    .select("id, title, version, closed_at, questionnaire_instruments(name)")
    .eq("company_id", companyId)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!survey) return "## Resultados de pesquisa\nA empresa ainda não tem pesquisa encerrada.";

  const [breakdown, { data: departments }] = await Promise.all([
    fetchSurveyScoreBreakdown(admin, survey.id),
    admin.from("departments").select("id, name").eq("company_id", companyId),
  ]);
  const { company } = breakdown;
  const instrument = (survey.questionnaire_instruments as unknown as { name: string } | null)?.name ?? "questionário";
  const version = survey.version ? `, versão ${VERSION_LABEL[survey.version] ?? survey.version}` : "";
  const closed = survey.closed_at ? `, encerrada em ${new Date(survey.closed_at).toLocaleDateString("pt-BR")}` : "";

  const lines = [
    "## Resultados da pesquisa mais recente (fonte: banco do Sentinel — use exatamente estes números)",
    `Pesquisa "${survey.title}" (${instrument}${version}${closed}); ${company.responseCount} respostas.`,
    "Escala de 0 a 100. Semáforo: Favorável, Intermédio ou Risco (cortes nos terços da escala, conforme o manual do COPSOQ II).",
  ];

  if (company.isAnonymized || company.scores.length === 0) {
    lines.push("Resultados da empresa ocultos: menos de 5 respostas (regra de anonimato).");
    return lines.join("\n");
  }

  lines.push("", "Empresa toda:", ...company.scores.map(dimensionLine));

  const names = new Map((departments ?? []).map((d) => [d.id as string, d.name as string]));
  let hidden = 0;
  const deptLines: string[] = [];
  for (const [deptId, group] of breakdown.departments) {
    if (group.isAnonymized) {
      hidden++;
      continue;
    }
    const red = group.scores.filter((d) => d.trafficLight === "RED").map((d) => `${d.name} (${d.displayScore})`);
    const yellow = group.scores.filter((d) => d.trafficLight === "YELLOW").map((d) => `${d.name} (${d.displayScore})`);
    deptLines.push(
      `- ${names.get(deptId) ?? "Setor"} (${group.responseCount} respostas): ` +
        (red.length ? `Risco em ${red.join(", ")}` : "nenhuma dimensão em Risco") +
        (yellow.length ? `; Intermédio em ${yellow.join(", ")}` : "")
    );
  }
  if (deptLines.length || hidden) {
    lines.push("", "Por setor:", ...deptLines);
    if (hidden) {
      lines.push(
        `- ${hidden} setor(es) oculto(s) pela regra de anonimato (menos de 5 respostas, ou para impedir descobrir um setor pequeno por subtração). Nunca estime resultados de setores ocultos.`
      );
    }
  }
  return lines.join("\n");
}
