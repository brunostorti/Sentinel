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
import { createAdminClient } from "@/lib/supabase/admin";
import { searchKnowledge, type RetrievedChunk } from "@/lib/rag/search";
import { PLAN_SOURCES_RULES, formatSourcesBlock, keepCitedSources, type StoredSource } from "@/lib/rag/prompt";
import { recordUsage } from "../usage";

interface CompanyInfo {
  name: string;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

type Candidate = CuratedSelection["candidates"][number];

export interface ConsultantPlanItem {
  dimension_id: string;
  intervention_id: string;
  universal_category_code: string;
  recommendation: AIRecommendation;
}

interface CandidateSources {
  block: string;
  sources: StoredSource[];
  /** Ids (F1, F2…) dos trechos buscados para o item, sem os gerais de plano de ação. */
  refs: string[];
}

const candidateKey = (c: { dimension_id: string; intervention_id: string }) => `${c.dimension_id}::${c.intervention_id}`;

/**
 * RAG: trechos de normas, guias e documentos da empresa para cada item (dimensão +
 * intervenção + pergunta da pesquisa que mais pesou), mais um conjunto sobre plano de
 * ação na NR-1, comum a todos. Cada item recebe o seu bloco, numerado F1, F2…
 */
async function retrieveSources(
  selection: CuratedSelection,
  prioritizedNames: Map<string, string>,
  grounding: Map<string, GroundedFacts>,
  companyId: string
): Promise<Map<string, CandidateSources>> {
  const admin = createAdminClient();
  const queries = selection.candidates.map((c) => {
    const iv = getInterventionById(c.intervention_id);
    const topQuestion = grounding.get(candidateKey(c))?.surveyEvidence[0]?.questionText;
    return [prioritizedNames.get(c.dimension_id), iv?.title, topQuestion].filter(Boolean).join(". ");
  });
  const [general, ...perCandidate] = await Promise.all([
    searchKnowledge(admin, {
      companyId,
      query: "plano de ação com medidas de prevenção para riscos psicossociais: cronograma, responsáveis, acompanhamento e aferição de resultados",
      matchCount: 3,
      sourceTypes: ["norma", "manual_tecnico", "guia_oficial"],
    }),
    // Por item, três buscas à parte para um tipo não tomar o lugar do outro: até 2 trechos
    // dos documentos da própria empresa (o que ela já tem, já tentou ou já decidiu), 3 de
    // normas/guias/referências e até 2 planos de exemplo de outras empresas (anonimizados).
    // O questionário (instrumento) fica de fora: a consulta leva a pergunta da pesquisa, e
    // o texto do questionário — que a IA já recebe — ocupava as 3 vagas (medido em 10/10).
    ...queries.map(async (query) => {
      const [company, references, examples] = await Promise.all([
        searchKnowledge(admin, { companyId, query, matchCount: 2, sourceTypes: ["documento_empresa"] }),
        searchKnowledge(admin, {
          companyId,
          query,
          matchCount: 3,
          sourceTypes: ["norma", "lei", "guia_oficial", "manual_tecnico", "referencia_cientifica"],
        }),
        searchKnowledge(admin, { companyId, query, matchCount: 2, sourceTypes: ["plano_exemplo"] }),
      ]);
      return [...company, ...references, ...examples];
    }),
  ]);

  return new Map(
    selection.candidates.map((c, i) => {
      const ordered: RetrievedChunk[] = [];
      const seen = new Set<string>();
      for (const chunk of [...perCandidate[i], ...general]) {
        if (!seen.has(chunk.chunkId)) {
          seen.add(chunk.chunkId);
          ordered.push(chunk);
        }
      }
      const { block, sources } = formatSourcesBlock(ordered, "F");
      const refOf = new Map(sources.map((s) => [s.chunkId, s.ref]));
      const refs = [...new Set(perCandidate[i].map((chunk) => refOf.get(chunk.chunkId)!))];
      return [candidateKey(c), { block, sources, refs }];
    })
  );
}

function buildSelectionBlock(
  selection: CuratedSelection,
  prioritizedNames: Map<string, string>,
  grounding: Map<string, GroundedFacts>,
  refsByCandidate: Map<string, string[]>
): string {
  return selection.candidates
    .map((c) => {
      const iv = getInterventionById(c.intervention_id);
      if (!iv) return `- [INTERVENÇÃO DESCONHECIDA: ${c.intervention_id}]`;
      const dimName = prioritizedNames.get(c.dimension_id) ?? c.dimension_id;
      const facts = grounding.get(candidateKey(c));

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
      const refs = refsByCandidate.get(candidateKey(c)) ?? [];
      const refsLine = refs.length
        ? `TRECHOS DE DOCUMENTOS PARA ESTE ITEM: ${refs.join(", ")} (texto na seção "Trechos de documentos de referência")`
        : "TRECHOS DE DOCUMENTOS PARA ESTE ITEM: nenhum relevante encontrado";

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
${finBlock}

${refsLine}`;
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
  companyId: string;
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

  const ragByCandidate = await retrieveSources(args.selection, prioritizedNames, args.grounding, args.companyId);
  const refsByIntervention = await getReferencesForInterventions(
    args.selection.candidates.map((c) => c.intervention_id)
  );

  // Um plano por chamada, todas em paralelo: a etapa leva o tempo do plano mais longo, não
  // a soma de todos (numa chamada única, ~18 mil tokens de saída levavam ~150 s), e um JSON
  // inválido afeta só aquele item. Cada chamada vê os outros itens para não repetir ações.
  // Sozinho, cada plano tendia a dobrar de tamanho (e de custo): a seção "Tamanho" do prompt
  // mantém o tamanho de quando os planos dividiam uma chamada (~600 palavras).
  const promptFor = (c: Candidate): { prompt: string; sources: StoredSource[] } => {
    const rag = ragByCandidate.get(candidateKey(c))!;
    const single = { ...args.selection, candidates: [c] };
    const selectionBlock = buildSelectionBlock(single, prioritizedNames, args.grounding, new Map([[candidateKey(c), rag.refs]]));
    const providersBlock = buildProvidersBlock(single);
    const referencesBlock = buildReferencesBlock(
      new Map([[c.intervention_id, refsByIntervention.get(c.intervention_id) ?? []]])
    );
    const otherItems = args.selection.candidates
      .filter((o) => o !== c)
      .map((o) => `- ${prioritizedNames.get(o.dimension_id) ?? o.dimension_id}: ${getInterventionById(o.intervention_id)?.title ?? o.intervention_id}`)
      .join("\n");

    const prompt = `Você é o consultor sênior que escreve UM dos planos do plano de ação para o RH executar. O plano deve ser PRAGMÁTICO, ESPECÍFICO e ANCORADO NOS DADOS REAIS fornecidos.

## Perfil narrativo da empresa
${perfilNarrativo}

## Item deste plano (selecionado pelo Curator)
O item traz o SETOR-ALVO REAL, as PERGUNTAS REAIS da pesquisa e a estimativa de investimento já calculada pelo sistema.
${selectionBlock}

## Outros itens do plano de ação
São escritos à parte. NÃO repita as ações deles; se houver sobreposição, concentre-se no que é próprio deste item.
${otherItems || "(nenhum)"}

## Fornecedores brasileiros disponíveis para esta intervenção
${providersBlock || "(nenhum fornecedor específico catalogado)"}

## Referências científicas curadas (verificáveis)
${referencesBlock || "(nenhuma referência curada)"}
${rag.block ? `\n${PLAN_SOURCES_RULES}\n\n${rag.block}\n` : ""}
## REGRAS CRÍTICAS

### Você NÃO escreve números
- NÃO produza investimento, ROI, retorno, payback, % de impacto, custos ou economia. A única cifra do plano é a estimativa de investimento, que o sistema anexa automaticamente.
- NÃO prometa efeitos quantitativos (ex.: "reduz o turnover em 30%"). Para falar de eficácia, use SOMENTE as ALEGAÇÕES das referências curadas, respeitando o nível de certeza informado (ex.: certeza muito baixa = "evidência limitada").
- Fornecedores: NÃO informe preço. Use sempre "Sob consulta" em price_range.

### Ancoragem nos dados reais (OBRIGATÓRIO)
- No "rationale", CITE LITERALMENTE ao menos uma das "PERGUNTAS REAIS DA PESQUISA" do item e mencione o SETOR-ALVO REAL. É isso que torna o plano específico desta empresa.
- Não escreva nada que serviria para qualquer empresa — conecte tudo ao que a pesquisa revelou.
- Se houver trechos com confiabilidade "documento da empresa", use-os para encaixar o plano no que a empresa já tem, já tentou ou já decidiu (ex.: pedidos da CIPA, políticas internas, contratos vigentes, restrições de orçamento) e informe-os em source_ids.

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
- **ACEITAR** — risco residual baixo, sob monitoramento, sem ação corretiva imediata custo-efetiva. Uso RARO e SOMENTE para dimensões YELLOW de baixa severidade. NUNCA use ACEITAR para uma dimensão RED — pela NR-1 (Portaria MTE 1.419/2024), riscos classificados como prioritários exigem medidas de prevenção no plano de ação (item 1.5.5.2). A Lei 14.831/2024 é um certificado voluntário: nunca a trate como obrigação.

### Compliance & Riscos
- nr1_compliance: em uma frase, qual exigência da NR-1 este plano ajuda a cumprir (ex.: "Medida de prevenção para o plano de ação do PGR — NR-1, item 1.5.5.2") ou null. Nunca afirme que o plano, sozinho, garante conformidade com a NR-1.
- compliance_extra: LGPD, NR-17, CLT quando aplicável.
- risk_if_not_acted: consequências de não agir, ancoradas no que a pesquisa revelou e nas referências (sem valores monetários).
- implementation_risks: 2-3 itens — o que dá errado AO EXECUTAR + mitigation.

### Tamanho (OBRIGATÓRIO)
O RH lê vários planos de uma vez: seja direto. O plano inteiro, somando todos os campos, tem no máximo ~600 palavras.
- description: 3-4 frases curtas. rationale: até 4 frases. quick_action: 1-2 frases.
- Cada etapa do roadmap, cada pré-requisito, cada KPI e cada risco de implementação: 1 frase.
- risk_if_not_acted, internal_alternative, internal_capacity_required e key_message: até 2 frases cada.

## OUTPUT — JSON array com UM item, o deste plano (NÃO inclua campos numéricos).

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
      "compliance_extra": ["..."],
      "source_ids": ["F1", "F3"]
    }
  }
]

Devolva APENAS o JSON array.`;
    return { prompt, sources: rag.sources };
  };

  const model = createModel(args.aiConfig);

  // Até 2 tentativas por item quando o JSON vem inválido; erros da API sobem como antes.
  const writePlan = async (c: Candidate): Promise<ConsultantPlanItem | null> => {
    const { prompt, sources } = promptFor(c);
    for (let attempt = 1; attempt <= 2; attempt++) {
      const startedAt = Date.now();
      const { text, finishReason, usage } = await generateText({
        model,
        prompt,
        maxOutputTokens: maxOutputTokensFor(args.aiConfig),
      });
      recordUsage("consultant", args.aiConfig.model, startedAt, usage);

      const plan = extractJsonArray<ConsultantPlanItem>(text).find((p) => p?.recommendation);
      if (plan) {
        // Fontes: só os identificadores que foram fornecidos viram fontes do plano,
        // renumerados 1, 2, 3… para a tela (os ids F* só existem dentro do prompt).
        const ids = Array.isArray(plan.recommendation.source_ids) ? plan.recommendation.source_ids : [];
        plan.recommendation.sources = keepCitedSources(sources, ids).map((s, i) => ({ ...s, ref: String(i + 1) }));
        delete plan.recommendation.source_ids;
        // Os ids vêm do sistema, não da IA.
        return {
          ...plan,
          dimension_id: c.dimension_id,
          intervention_id: c.intervention_id,
          universal_category_code: getInterventionById(c.intervention_id)?.universal_category_code ?? plan.universal_category_code,
        };
      }
      console.error(`[consultant] ${c.intervention_id}, tentativa ${attempt}: ${describeUnparsedOutput(text, finishReason)}`);
    }
    return null;
  };

  const plans = (await Promise.all(args.selection.candidates.map(writePlan))).filter(
    (p): p is ConsultantPlanItem => p !== null
  );
  if (plans.length === 0) throw new Error("Stage 3 (Consultant): JSON inválido ou vazio.");
  if (plans.length < args.selection.candidates.length) {
    console.error(`[consultant] ${args.selection.candidates.length - plans.length} item(ns) sem plano após 2 tentativas.`);
  }
  return plans;
}
