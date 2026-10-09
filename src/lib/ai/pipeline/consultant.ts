/**
 * Stage 3 — Consultant
 *
 * Recebe CuratedSelection + perfil + vendors-BR + referências verificadas e escreve o
 * plano final completo no shape AIRecommendation v2 (roadmap, vendors, RACI, KPIs leading, etc.).
 */

import { generateText } from "ai";
import { createModel, maxOutputTokensFor, type ResolvedAiConfig } from "../provider-factory";
import type {
  AIRecommendation,
  CuratedSelection,
  AnalystReport,
} from "./types";
import type { CompanyProfile, CompanyActionTaken } from "../profile/schema";
import { buildPerfilNarrativo } from "../profile/narrative";
import { getInterventionById } from "../knowledge-base/catalog";
import { getProvidersForIntervention } from "../knowledge-base/providers-br";
import { getReferencesForInterventions, type KbReferenceWithRelevance } from "../knowledge-base/references";
import type { GroundedFacts } from "./grounding";
import { describeUnparsedOutput, extractJsonArray } from "./json-utils";

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
  prioritizedNames: Map<string, string>,
  grounding: Map<string, GroundedFacts>
): string {
  return selection.candidates
    .map((c) => {
      const iv = getInterventionById(c.intervention_id);
      if (!iv) return `- [INTERVENÇÃO DESCONHECIDA: ${c.intervention_id}]`;
      const dimName = prioritizedNames.get(c.dimension_id) ?? c.dimension_id;
      const facts = grounding.get(`${c.dimension_id}::${c.intervention_id}`);

      const setorAlvo =
        facts?.department && facts.department !== "all"
          ? `${facts.department} (${facts.headcount} pessoas)`
          : `toda a empresa (${facts?.headcount ?? "?"} pessoas)`;

      const evidenceLines =
        facts?.surveyEvidence && facts.surveyEvidence.length > 0
          ? facts.surveyEvidence
              .map(
                (e) =>
                  `    • "${e.questionText}" — ${e.criticalPercent}% no nível crítico (n=${e.respondents})`
              )
              .join("\n")
          : "    (sem evidência por pergunta — Regra de 5; foque no diagnóstico da dimensão)";

      const fin = facts?.financials;
      const finBlock = fin
        ? `Investimento ESTIMADO (JÁ CALCULADO): ${fin.investment.value}  [${fin.investment.formula}; ${fin.investment.source}]`
        : "(sem estimativa de investimento para este item)";

      return `### ${dimName}
dimension_id="${c.dimension_id}"  (USE EXATAMENTE este uuid no output — NÃO invente)
intervention_id="${iv.intervention_id}"  (USE EXATAMENTE este slug)
universal_category_code="${iv.universal_category_code}"
SETOR-ALVO REAL: ${setorAlvo}
Título base: ${iv.title}
Descrição base: ${iv.description}
Esforço: ${iv.effort} | Timeframe base: ${iv.timeframe}
Justificativa do Curator: ${c.personalization_rationale}

PERGUNTAS REAIS DA PESQUISA QUE PUXARAM O SCORE (cite ao menos uma, literal, no rationale):
${evidenceLines}

NÚMEROS JÁ CALCULADOS PELO SISTEMA (NÃO recalcule, NÃO invente — apenas referencie em texto quando útil):
${finBlock}`;
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
          `  - ${p.name}: ${p.modality} — ${p.contact_url}\n    ${p.description}`
      )
      .join("\n");
    blocks.push(`### Para ${c.intervention_id}:\n${list}`);
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
  grounding: Map<string, GroundedFacts>;
  aiConfig: ResolvedAiConfig;
}): Promise<ConsultantPlanItem[]> {

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

  const selectionBlock = buildSelectionBlock(
    args.selection,
    prioritizedNames,
    args.grounding
  );
  const providersBlock = buildProvidersBlock(args.selection);
  const interventionIds = args.selection.candidates.map((c) => c.intervention_id);
  const refsByIntervention = await getReferencesForInterventions(interventionIds);
  const referencesBlock = buildReferencesBlock(refsByIntervention);

  const prompt = `Você é o consultor sênior que escreve o PLANO FINAL para o RH executar. Cada plano deve ser PRAGMÁTICO, ESPECÍFICO e ANCORADO NOS DADOS REAIS fornecidos.

## Perfil narrativo da empresa
${perfilNarrativo}

## Seleção do Curator (escreva um plano para CADA item)
Cada item traz o SETOR-ALVO REAL, as PERGUNTAS REAIS da pesquisa e a estimativa de investimento já calculada pelo sistema.
${selectionBlock}

## Fornecedores brasileiros disponíveis para essas intervenções
${providersBlock || "(nenhum fornecedor específico catalogado)"}

## Referências científicas curadas (verificáveis)
${referencesBlock || "(nenhuma referência curada)"}

## REGRAS CRÍTICAS

### Você NÃO escreve números
- NÃO produza investimento, ROI, retorno, payback, % de impacto, custos ou economia. A única cifra do plano é a estimativa de investimento, que o sistema anexa automaticamente.
- NÃO prometa efeitos quantitativos (ex.: "reduz o turnover em 30%"). Para falar de eficácia, use SOMENTE as ALEGAÇÕES das referências curadas, respeitando o nível de certeza informado (ex.: certeza muito baixa = "evidência limitada").
- Fornecedores: NÃO informe preço. Use sempre "Sob consulta" em price_range.

### Ancoragem nos dados reais (OBRIGATÓRIO)
- No "rationale", CITE LITERALMENTE ao menos uma das "PERGUNTAS REAIS DA PESQUISA" do item e mencione o SETOR-ALVO REAL. É isso que torna o plano específico desta empresa.
- Não escreva nada que serviria para qualquer empresa — conecte tudo ao que a pesquisa revelou.

### Aplicabilidade
- roadmap: 3-5 etapas com fase (semana/mês), entregável claro e owner_role.
- prerequisites: o que precisa estar pronto ANTES.
- vendors: 2-3 dos fornecedores acima, com why_fit citando o perfil/setor.
- leading_indicators: 2-3 KPIs intermediários (adesão, NPS interno, n° sessões, etc.).
- communication_plan: como anunciar aos colaboradores do setor-alvo.

### Classificação da estratégia (recommendation_status — OBRIGATÓRIO escolher por critério, não por intuição)
Escolha UMA estratégia por plano, aplicando a hierarquia de controle de riscos da NR-1. A estratégia DEVE ser coerente com o conteúdo do plano:
- **RESOLVER** — elimina a causa-raiz organizacional do risco (mudança em processo, carga, jornada, gestão, estrutura). Use quando a intervenção ataca a fonte e o risco é alto/crítico (RED) e endereçável internamente. É a estratégia preferencial sempre que viável (eliminação na fonte). Coerente com roadmap que muda processo/jornada.
- **MITIGAR** — reduz a probabilidade ou o impacto sem eliminar a causa (treinamentos, apoio, ajustes parciais, controles administrativos). Use para riscos YELLOW, ou RED quando a causa-raiz não pode ser removida no ciclo atual. É o PADRÃO quando em dúvida entre MITIGAR e RESOLVER e a ação não elimina a fonte.
- **TRANSFERIR** — delega a execução/responsabilidade clínica a terceiro especializado (EAP/PAE, clínica de saúde mental, consultoria externa, seguro). Use quando a competência exigida é externa à empresa (ex.: atendimento psicológico) — coerente com 'vendors' como núcleo da solução e 'internal_alternative' fraca/nula.
- **ACEITAR** — risco residual baixo, sob monitoramento, sem ação corretiva imediata custo-efetiva. Uso RARO e SOMENTE para dimensões YELLOW de baixa severidade. NUNCA use ACEITAR para uma dimensão RED — sob a NR-1/Portaria MTE 1.419/2024 e a Lei 14.831 o empregador é LEGALMENTE OBRIGADO a agir sobre riscos identificados.

### Compliance & Riscos
- nr1_compliance: "Atende NR-1, Portaria MTE 1.419/2024 — gestão de riscos psicossociais" ou null.
- compliance_extra: LGPD, NR-17, CLT quando aplicável.
- risk_if_not_acted: consequências de não agir, ancoradas no que a pesquisa revelou e nas referências (sem valores monetários).
- implementation_risks: 2-3 itens — o que dá errado AO EXECUTAR + mitigation.

## OUTPUT — JSON array, um item por candidato (não invente itens extras, NÃO inclua campos numéricos).

[
  {
    "dimension_id": "uuid (exato do item)",
    "intervention_id": "slug (exato do item)",
    "universal_category_code": "código",
    "recommendation": {
      "title": "≤80 chars",
      "description": "3-4 frases",
      "quick_action": "primeiros 30 dias, 1-2 frases",
      "rationale": "por que ISSO para ESTE setor — CITE uma pergunta real da pesquisa",
      "recommendation_status": "MITIGAR | RESOLVER | TRANSFERIR | ACEITAR (siga os critérios da seção 'Classificação da estratégia'; jamais ACEITAR em dimensão RED)",
      "roadmap": [ { "phase": "Semana 1-2", "deliverable": "...", "owner_role": "..." } ],
      "prerequisites": ["..."],
      "time_to_first_value": "...",
      "internal_capacity_required": "...",
      "stakeholders": { "accountable": "cargo (1)", "responsible": ["..."], "consulted": ["..."], "informed": ["..."] },
      "vendors": [ { "name": "...", "modality": "...", "price_range": "Sob consulta", "contact_url": "https://...", "why_fit": "por que cabe NESTE setor" } ],
      "internal_alternative": "variante sem fornecedor externo" ou null,
      "leading_indicators": [ { "metric": "...", "target": "...", "measurement": "..." } ],
      "monitoring_cadence": "...",
      "communication_plan": { "channels": ["..."], "key_message": "...", "timing": "..." },
      "risk_if_not_acted": "consequências de não agir (sem valores monetários)",
      "implementation_risks": [ { "risk": "...", "mitigation": "..." } ],
      "nr1_compliance": "..." ou null,
      "compliance_extra": ["..."]
    }
  }
]

Devolva APENAS o JSON array.`;

  const model = createModel(args.aiConfig);
  
  const { text, finishReason } = await generateText({
    model: model,
    prompt: prompt,
    maxOutputTokens: maxOutputTokensFor(args.aiConfig),
  });

  const plans = extractJsonArray<ConsultantPlanItem>(text);
  if (plans.length === 0) {
    console.error(`[consultant] ${describeUnparsedOutput(text, finishReason)}`);
    throw new Error("Stage 3 (Consultant): JSON inválido ou vazio.");
  }
  return plans;
}
