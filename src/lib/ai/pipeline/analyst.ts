/**
 * Stage 1 — Analyst
 *
 * Lê scores + perfil + trends + breakdowns e devolve um "retrato" da empresa:
 * dimensões priorizadas, padrões cruzados entre dimensões, raízes sistêmicas e
 * limitações de dado. NÃO sugere intervenções.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AnalystReport, PipelineContext } from "./types";
import type { CompanyProfile } from "../profile/schema";
import { buildPerfilCompacto } from "../profile/narrative";
import { extractJsonObject } from "./json-utils";

interface CompanyInfo {
  name: string;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

function severityLabel(score: number): string {
  if (score < 20) return "CRÍTICO";
  if (score < 33) return "GRAVE";
  return "ATENÇÃO";
}

function buildDimensionsBlock(context: PipelineContext): string {
  const atRisk = context.scores.filter(
    (s) => s.trafficLight === "RED" || s.trafficLight === "YELLOW"
  );
  // IMPORTANTE: inclui o dimension_id REAL (uuid) pra que o LLM use no output.
  // Sem isso, o LLM inventa UUIDs e o orchestrator descarta tudo silenciosamente.
  const lines = atRisk.map(
    (d) =>
      `- dimension_id="${d.dimensionId}" | nome="${d.name}" | categoria=${d.universalCategory ?? d.category} | score=${d.displayScore}/100 | ${
        d.trafficLight === "RED" ? "RISCO" : "INTERMÉDIO"
      } | ${severityLabel(d.displayScore)} | direction=${d.scoringDirection}`
  );
  return `## Dimensões em Risco
USE EXATAMENTE o dimension_id (uuid) listado para cada dimensão no seu output. NÃO invente IDs.

${lines.join("\n")}`;
}

function buildDeptBlock(context: PipelineContext): string {
  if (context.departmentBreakdowns.length === 0) return "";
  const blocks = context.departmentBreakdowns
    .filter((d) => d.atRiskDimensions.length > 0)
    .map((d) => {
      const dims = d.atRiskDimensions
        .map(
          (dim) =>
            `  • ${dim.name}: ${dim.score}/100 (${dim.riskLevel === "RED" ? "RISCO" : "INTERMÉDIO"})`
        )
        .join("\n");
      return `### ${d.name} (${d.responseCount} respostas)\n${dims}`;
    });
  if (blocks.length === 0) return "";
  return `## Análise por Departamento\n${blocks.join("\n\n")}`;
}

function buildTrendsBlock(context: PipelineContext): string {
  if (context.trends.length === 0) return "";
  const arrow = (d: "improving" | "worsening" | "stable") =>
    d === "worsening" ? "↓ piorando" : d === "improving" ? "↑ melhorando" : "→ estável";
  const lines = context.trends.map(
    (t) =>
      `- ${t.name}: ${t.previousScore} → ${t.currentScore} (${arrow(t.direction)} ${Math.abs(
        t.currentScore - t.previousScore
      )}pts)`
  );
  return `## Tendências\n${lines.join("\n")}`;
}

export async function runAnalyst(
  context: PipelineContext,
  company: CompanyInfo,
  profile: CompanyProfile
): Promise<AnalystReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const perfilCompacto = buildPerfilCompacto(company, profile);
  const dimensionsBlock = buildDimensionsBlock(context);
  const deptBlock = buildDeptBlock(context);
  const trendsBlock = buildTrendsBlock(context);

  const responseRateNote =
    context.responseRate > 0 && context.responseRate < 50
      ? `ATENÇÃO: Taxa de resposta ${context.responseRate}% — scores podem não ser representativos. Inclua isso em data_limitations.\n`
      : "";

  const prompt = `Você é o analista de uma plataforma de saúde ocupacional. Sua tarefa é PRIORIZAR e DIAGNOSTICAR — não sugerir intervenções (outro estágio faz isso).

## Contexto compacto da empresa
${perfilCompacto}
Pesquisa: "${context.surveyTitle}"
Taxa de resposta: ${context.responseRate}% (${context.totalResponses}/${context.totalParticipants})
${responseRateNote}
${dimensionsBlock}

${deptBlock}

${trendsBlock}

## REGRAS

### Direção de pontuação
Cada dimensão tem direction: HIGH_IS_RISK (score alto = pior) ou HIGH_IS_FAVORABLE (score alto = melhor).
- Para HIGH_IS_RISK: scores ALTOS são piores (mais risco).
- Para HIGH_IS_FAVORABLE: scores BAIXOS são piores.
Considere isso ao identificar severidade.

### Priorização
Selecione 5-7 dimensões mais críticas. Critérios:
1. RED (extremo do ruim na sua direção)
2. YELLOW que está piorando (trend=worsening)
3. YELLOW com severidade alta

### Padrões cruzados
Identifique combinações perigosas entre dimensões:
- Carga alta + baixo apoio liderança → cascata de burnout
- Baixa autonomia + baixo significado → desengajamento
- Comportamentos ofensivos + baixa comunicação → cultura tóxica
- Burnout + insegurança → risco de turnover massivo

### Raízes sistêmicas
Hipóteses do que está CAUSANDO (não sintoma). Ex: "estrutura organizacional sem clareza de papéis", "ciclo de hiper-cobrança trimestral", "cultura informal que penaliza pausas".

## OUTPUT (JSON apenas)
{
  "prioritized_dimensions": [
    {
      "dimension_id": "uuid",
      "dimension_name": "nome exato",
      "universal_category_code": "código (workload, leadership, burnout, etc.)",
      "score": número,
      "risk_level": "RED" | "YELLOW",
      "severity": "critica" | "alta" | "media",
      "trend": "improving" | "worsening" | "stable" | "first_measurement",
      "why_priority": "1-2 frases"
    }
  ],
  "cross_dimension_patterns": [
    { "pattern_label": "...", "involved_dimensions": ["..."], "explanation": "..." }
  ],
  "systemic_root_causes": ["...", "..."],
  "data_limitations": ["...", "..."]
}

Devolva APENAS o JSON.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Stage 1 (Analyst): resposta não contém texto.");
  }

  const report = extractJsonObject<AnalystReport>(textBlock.text);
  if (!report) {
    throw new Error("Stage 1 (Analyst): JSON inválido.");
  }
  return report;
}
