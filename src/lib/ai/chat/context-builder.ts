/**
 * Constrói o system prompt do chat (kind='plan' ou 'company').
 *
 * - Para 'plan': perfil narrativo + plano específico + scores da survey origem
 * - Para 'company': perfil narrativo + planos ativos + outcomes históricos
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { buildPerfilNarrativo } from "../profile/narrative";
import type { CompanyProfile } from "../profile/schema";

interface CompanyInfo {
  name: string;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

const GUARDRAILS = `Você é o assistente de saúde ocupacional da empresa.

DIRETRIZES:
- Sempre em português brasileiro.
- Cite dados do contexto quando responder. Não invente números.
- Se o HR perguntar algo fora do contexto, peça a informação ou diga que não sabe.
- Não dê diagnósticos médicos individuais.
- Não emita parecer jurídico definitivo — sugira consultar advogado quando aplicável.
- Se o HR mencionar fato novo sobre a empresa (orçamento, estrutura, restrição),
  reconheça e responda — o sistema captura para revisão posterior.
- Tom: consultor sênior pragmático. Direto, sem floreio. Honesto sobre limitações.
- Quando citar uma intervenção do catálogo, mencione o fornecedor e o custo aproximado.`;

export async function buildChatSystemPrompt(
  companyId: string,
  kind: "plan" | "company",
  resourceId: string | null
): Promise<string> {
  const admin = createAdminClient();

  // Company
  const { data: companyRow } = await admin
    .from("companies")
    .select("name, industry, employee_count, work_regime")
    .eq("id", companyId)
    .single();
  const company = (companyRow as CompanyInfo) ?? {
    name: "Empresa",
    industry: null,
    employee_count: null,
    work_regime: null,
  };

  // Profile
  const { data: profileRow } = await admin
    .from("company_profiles")
    .select("*")
    .eq("company_id", companyId)
    .single();
  const profile = (profileRow as CompanyProfile) ?? null;

  // Histórico
  const { data: history } = await admin
    .from("company_actions_taken")
    .select("title, year_started, outcome")
    .eq("company_id", companyId)
    .order("year_started", { ascending: false, nullsFirst: false })
    .limit(10);

  const perfilNarrativo = profile
    ? buildPerfilNarrativo(
        company,
        profile,
        (history ?? []).map(
          (h: { title: string; year_started: number | null; outcome: string | null }) => ({
            title: h.title,
            year: h.year_started,
            outcome: h.outcome,
          })
        )
      )
    : "Perfil da empresa ainda não foi preenchido.";

  if (kind === "plan" && resourceId) {
    const { data: plan } = await admin
      .from("action_plans")
      .select(`
        risk_level, priority, effort, timeframe, target_department,
        ai_recommendation,
        surveys(title),
        questionnaire_scales(name)
      `)
      .eq("id", resourceId)
      .single();

    const planSummary = plan
      ? JSON.stringify(plan, null, 2).slice(0, 6000)
      : "(plano não encontrado)";

    return `${GUARDRAILS}

## Perfil narrativo da empresa "${company.name}"
${perfilNarrativo}

## Plano sob discussão
${planSummary}

Você é o CONSULTOR responsável por defender, refinar ou ajustar este plano. O HR está revisando antes de aprovar. Comporte-se como um consultor sênior em uma reunião de revisão.

VOCÊ PODE:
- Explicar POR QUE cada escolha foi feita (cite o perfil da empresa)
- Discutir tradeoffs ("se cortar X, perde Y, mas economiza Z")
- PROPOR ALTERAÇÕES quando o HR levantar objeção: sugerir trocar fornecedor, comprimir/expandir o roadmap, mudar RACI, ajustar leading_indicators
- Simular cenários ("e se o orçamento cair pela metade?")
- Validar com o HR antes de afirmar (perguntas tipo "você quer manter Zenklub ou prefere uma alternativa mais barata?")

NÃO PODE:
- Editar o plano no banco — só PROPOR. O HR aprova/rejeita o plano todo no botão dele.
- Inventar números — se não souber, peça mais info
- Fazer promessas absolutas — sempre fale em probabilidades/faixas

Tom: pragmático, direto, defenda decisões com base no perfil, mas concorde quando o HR tiver razão. Aceite divergência.`;
  }

  // kind === 'company' — assistente geral
  const { data: activePlans } = await admin
    .from("action_plans")
    .select(`
      id, status, priority, ai_recommendation,
      questionnaire_scales(name)
    `)
    .eq("company_id", companyId)
    .in("status", ["PENDING_REVIEW", "APPROVED"])
    .limit(20);

  const { data: outcomes } = await admin
    .from("action_outcomes")
    .select("intervention_id, score_before, score_after, delta, hr_attribution")
    .eq("company_id", companyId)
    .not("delta", "is", null)
    .limit(20);

  const plansSummary =
    activePlans && activePlans.length > 0
      ? activePlans
          .map((p) => {
            const rec = (p.ai_recommendation as { title?: string }) ?? {};
            const dim = (p.questionnaire_scales as { name?: string } | null)?.name;
            return `- [${p.status}] ${rec.title ?? "(sem título)"} • ${dim ?? "—"}`;
          })
          .join("\n")
      : "Nenhum plano ativo no momento.";

  const outcomesSummary =
    outcomes && outcomes.length > 0
      ? outcomes
          .map(
            (o) =>
              `- ${o.intervention_id}: ${o.score_before} → ${o.score_after} (Δ ${o.delta}, atribuição: ${o.hr_attribution ?? "pendente"})`
          )
          .join("\n")
      : "Nenhum outcome medido ainda.";

  return `${GUARDRAILS}

## Perfil narrativo da empresa "${company.name}"
${perfilNarrativo}

## Planos ativos da empresa
${plansSummary}

## Histórico de impacto medido
${outcomesSummary}

Você é o assistente GERAL da empresa. Responda sobre:
- visão estratégica e tendências
- comparação entre ações tomadas
- simulação de cenários (cortes/expansão de orçamento)
- resumos executivos para diretoria`;
}
