/**
 * Stage 3 — Consultant
 *
 * Recebe CuratedSelection + perfil + vendors-BR + casos setoriais e escreve o plano
 * final completo no shape AIRecommendation v2 (roadmap, vendors, RACI, KPIs leading, etc.).
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AIRecommendation,
  CuratedSelection,
  AnalystReport,
} from "./types";
import type { CompanyProfile, CompanyActionTaken } from "../profile/schema";
import { buildPerfilNarrativo } from "../profile/narrative";
import { getInterventionById } from "../knowledge-base/catalog";
import { getProvidersForIntervention } from "../knowledge-base/providers-br";
import { getCasesByIntervention } from "../knowledge-base/cases";
import { INACTION_COSTS } from "../knowledge-base/catalog";
import { getReferencesForInterventions, type KbReferenceWithRelevance } from "../knowledge-base/references";
import { extractJsonArray } from "./json-utils";

interface CompanyInfo {
  name: string;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

export interface ConsultantPlanItem {
  dimension_id: string;
  intervention_id: string;
  universal_category_code: string;
  recommendation: AIRecommendation;
}

function buildSelectionBlock(
  selection: CuratedSelection,
  prioritizedNames: Map<string, string>
): string {
  return selection.candidates
    .map((c) => {
      const iv = getInterventionById(c.intervention_id);
      if (!iv) return `- [INTERVENÇÃO DESCONHECIDA: ${c.intervention_id}]`;
      const dimName = prioritizedNames.get(c.dimension_id) ?? c.dimension_id;
      return `### ${dimName}
dimension_id="${c.dimension_id}"  (USE EXATAMENTE este uuid no output — NÃO invente)
intervention_id="${iv.intervention_id}"  (USE EXATAMENTE este slug)
universal_category_code="${iv.universal_category_code}"
Título base: ${iv.title}
Descrição base: ${iv.description}
Categoria: ${iv.universal_category_code}
Esforço: ${iv.effort} | Timeframe base: ${iv.timeframe}
Custo/colab/ano: R$${iv.cost_per_employee.min}-${iv.cost_per_employee.max}
Justificativa do Curator: ${c.personalization_rationale}
Impactos esperados (catálogo): ${iv.expected_impact.map((e) => `${e.metric} ${e.change_percent > 0 ? "+" : ""}${e.change_percent}% (${e.evidence_source})`).join("; ")}`;
    })
    .join("\n\n");
}

function buildProvidersBlock(selection: CuratedSelection): string {
  const blocks: string[] = [];
  for (const c of selection.candidates) {
    const providers = getProvidersForIntervention(c.intervention_id);
    if (providers.length === 0) continue;
    const list = providers
      .map(
        (p) =>
          `  - ${p.name}: ${p.modality} (${p.price_range}) — ${p.contact_url}\n    ${p.description}`
      )
      .join("\n");
    blocks.push(`### Para ${c.intervention_id}:\n${list}`);
  }
  return blocks.join("\n\n");
}

function buildCasesBlock(selection: CuratedSelection): string {
  const blocks: string[] = [];
  for (const c of selection.candidates) {
    const cases = getCasesByIntervention(c.intervention_id);
    if (cases.length === 0) continue;
    const list = cases
      .map(
        (cs) =>
          `  - ${cs.sector} (${cs.company_size_range}): ${cs.outcome_summary} — fonte: ${cs.source} ${cs.year}`
      )
      .join("\n");
    blocks.push(`### ${c.intervention_id}:\n${list}`);
  }
  return blocks.join("\n\n");
}

function buildReferencesBlock(
  refsByIntervention: Map<string, KbReferenceWithRelevance[]>
): string {
  const blocks: string[] = [];
  for (const [interventionId, refs] of refsByIntervention.entries()) {
    if (refs.length === 0) continue;
    const lines = refs.map(
      (r) =>
        `  • [${r.citation_key}] (${r.relevance}, ${r.evidence_type}${r.certainty_level ? ", certeza " + r.certainty_level : ""}): ${r.authors} ${r.year}. ${r.title}.${r.specific_claim ? "\n    → ALEGAÇÃO: " + r.specific_claim : ""}`
    );
    blocks.push(`### ${interventionId}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

export async function runConsultant(args: {
  selection: CuratedSelection;
  report: AnalystReport;
  profile: CompanyProfile;
  company: CompanyInfo;
  history?: CompanyActionTaken[];
}): Promise<ConsultantPlanItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const historyMapped = args.history?.map((h) => ({
    title: h.title,
    year: h.year_started,
    outcome: h.outcome,
    notes: h.outcome_notes,
  })) ?? [];

  const perfilNarrativo = buildPerfilNarrativo(args.company, args.profile, historyMapped);
  const prioritizedNames = new Map(
    args.report.prioritized_dimensions.map((d) => [d.dimension_id, d.dimension_name])
  );

  const selectionBlock = buildSelectionBlock(args.selection, prioritizedNames);
  const providersBlock = buildProvidersBlock(args.selection);
  const casesBlock = buildCasesBlock(args.selection);
  const interventionIds = args.selection.candidates.map((c) => c.intervention_id);
  const refsByIntervention = await getReferencesForInterventions(interventionIds);
  const referencesBlock = buildReferencesBlock(refsByIntervention);
  const employeeCount = args.company.employee_count ?? 100;

  const prompt = `Você é o consultor sênior que escreve o PLANO FINAL para o HR executar. Cada plano deve ser PRAGMÁTICO, ESPECÍFICO e CONFIÁVEL.

## Perfil narrativo da empresa
${perfilNarrativo}

## Seleção do Curator (você DEVE escrever um plano para cada item abaixo)
${selectionBlock}

## Fornecedores brasileiros disponíveis para essas intervenções
${providersBlock || "(nenhum fornecedor específico catalogado)"}

## Casos setoriais relevantes (use para impact_metrics quando aplicável)
${casesBlock || "(nenhum caso setorial específico)"}

## ⭐ REFERÊNCIAS CIENTÍFICAS CURADAS POR INTERVENÇÃO
USE EXCLUSIVAMENTE estas referências em impact_metrics[].evidence.study_or_case.
Os campos abaixo (citation_key, alegação) são VERIFICÁVEIS — não invente fontes.

${referencesBlock || "(nenhuma referência curada)"}

## Custos de inação (para risk_if_not_acted)
- Turnover: R$${INACTION_COSTS.turnover.cost_per_employee}/substituição (${INACTION_COSTS.turnover.source})
- Absenteísmo: R$${INACTION_COSTS.absenteeism.cost_per_day}/dia × ${INACTION_COSTS.absenteeism.avg_days_per_year} dias/ano (${INACTION_COSTS.absenteeism.source})
- Presenteísmo: R$${INACTION_COSTS.presenteeism.annual_cost_per_employee}/colab/ano (${INACTION_COSTS.presenteeism.source})
- Processo trabalhista: R$${INACTION_COSTS.lawsuits.avg_cost}/processo (${INACTION_COSTS.lawsuits.source})
- Multa NR-1: R$${INACTION_COSTS.nr1_penalty.min_fine}-${INACTION_COSTS.nr1_penalty.max_fine}/infração

## REGRAS

### Realismo
- ROI máximo: 5x em 12 meses. NUNCA acima.
- Efetividade assumida: 30-50% do impacto teórico (não 100%).
- Se investimento < R$5.000/ano, NÃO calcule ROI — é ação administrativa.
- Mostre o cálculo no breakdown para ser transparente.

### Aplicabilidade
- roadmap: 3-5 etapas com fase (semana/mês), entregável claro e owner_role.
- prerequisites: o que precisa estar pronto ANTES.
- vendors: liste 2-3 dos fornecedores acima, com why_fit explicando porque ESTA empresa (cite perfil).
- leading_indicators: 2-3 KPIs intermediários ANTES da próxima pesquisa (adesão, NPS interno, n° sessões, etc.).
- communication_plan: como anunciar aos colaboradores.

### Compliance
- nr1_compliance: use só refs verificáveis ("Atende NR-1, Portaria MTE 1.419/2024 — gestão de riscos psicossociais" ou null).
- compliance_extra: liste se aplicável LGPD (se trata dado de saúde), NR-17 (ergonomia), CLT (jornada).

### Riscos
- risk_if_not_acted: custo de NÃO fazer, com valores estimados.
- implementation_risks: 2-3 itens — o que dá errado AO EXECUTAR + mitigation.

### Evidência (OBRIGATÓRIO)
- impact_metrics[].evidence.study_or_case = citation_key EXATA do bloco "REFERÊNCIAS CIENTÍFICAS CURADAS" acima (ex: "WHO2022_Guidelines", "Cochrane2024_OrgHealthcare", "INSS2026").
- evidence.year = ano da referência (ver lista acima).
- evidence.url_or_doi = NULL (o frontend resolve via lookup da citation_key).
- evidence.br_context = só se houver caso setorial brasileiro acima OU se a referência for BR (ex: INSS2026, NR1_2024, Lei14831_2024).
- NUNCA invente citation_keys. Se não tiver referência adequada na lista, omita a métrica.

## OUTPUT — JSON array, um item por candidato do Curator (não invente itens extras).

[
  {
    "dimension_id": "uuid",
    "intervention_id": "slug do catálogo",
    "universal_category_code": "código",
    "recommendation": {
      "title": "≤80 chars",
      "description": "3-4 frases",
      "quick_action": "primeiros 30 dias, 1-2 frases",
      "rationale": "por que ISSO para ESTA empresa (cite perfil)",
      "recommendation_status": "Escolha exatamente um: MITIGAR, RESOLVER, TRANSFERIR ou ACEITAR",
      "roadmap": [
        { "phase": "Semana 1-2", "deliverable": "...", "owner_role": "..." }
      ],
      "prerequisites": ["..."],
      "time_to_first_value": "...",
      "internal_capacity_required": "...",
      "stakeholders": {
        "accountable": "cargo (1)",
        "responsible": ["..."],
        "consulted": ["..."],
        "informed": ["..."]
      },
      "vendors": [
        {
          "name": "...",
          "modality": "...",
          "price_range": "R$X-Y/colab/mês",
          "contact_url": "https://...",
          "why_fit": "por que cabe NESSA empresa"
        }
      ],
      "internal_alternative": "variante sem fornecedor externo" ou null,
      "leading_indicators": [
        { "metric": "...", "target": "...", "measurement": "..." }
      ],
      "monitoring_cadence": "...",
      "communication_plan": {
        "channels": ["..."],
        "key_message": "...",
        "timing": "..."
      },
      "investment": {
        "total_annual": "R$ X — R$ Y/ano",
        "per_employee_month": "R$ X-Y",
        "breakdown": "cálculo: ${employeeCount} colab × R$X/mês = ..."
      },
      "expected_return": {
        "conservative": "R$ X/ano (30% efetiv.) — cálculo",
        "optimistic": "R$ Y/ano (50% efetiv.) — cálculo",
        "payback_period": "X-Y meses"
      },
      "impact_metrics": [
        {
          "metric": "...",
          "change": "-X a -Y%",
          "evidence": {
            "study_or_case": "...",
            "year": 2024,
            "url_or_doi": null,
            "br_context": "contexto BR ou null"
          }
        }
      ],
      "risk_if_not_acted": "consequências com valores",
      "implementation_risks": [
        { "risk": "...", "mitigation": "..." }
      ],
      "nr1_compliance": "..." ou null,
      "compliance_extra": ["..."]
    }
  }
]

Devolva APENAS o JSON array.`;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Stage 3 (Consultant): resposta não contém texto.");
  }

  const plans = extractJsonArray<ConsultantPlanItem>(textBlock.text);
  if (plans.length === 0) {
    throw new Error("Stage 3 (Consultant): JSON inválido ou vazio.");
  }
  return plans;
}
