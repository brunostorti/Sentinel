/**
 * Planos de exemplo entre empresas (docs/rag/2026-10-09-design-rag.md, seção 3).
 *
 * Um plano aprovado de uma empresa que autorizou o compartilhamento vira um texto
 * ANONIMIZADO para a base global: sem nome da empresa, sem nomes de setores, sem
 * contagens de pessoas e sem a justificativa (que cita perguntas e setores reais).
 * Fica: setor econômico, porte em faixa, dimensão e nível, a intervenção, as etapas,
 * os indicadores, a situação e o resultado medido.
 *
 * Funções puras: testadas em tests/rag/example-plans.test.ts.
 */

import type { AIRecommendation } from "@/lib/ai/pipeline/types";

export interface ExamplePlanInput {
  title: string;
  dimension: string | null;
  riskLevel: "RED" | "YELLOW";
  status: "APPROVED" | "COMPLETED";
  recommendation: Partial<AIRecommendation>;
  /** Delta normalizado do resultado (positivo = melhora), se já medido. */
  outcomeDelta: number | null;
}

export interface ExampleCompanyInput {
  name: string;
  industry: string | null;
  employeeCount: number | null;
  workRegime: string | null;
  departmentNames: string[];
}

export function sizeBand(employees: number | null): string {
  if (!employees) return "porte não informado";
  if (employees < 50) return "até 49 trabalhadores";
  if (employees < 250) return "50 a 249 trabalhadores";
  if (employees < 1000) return "250 a 999 trabalhadores";
  return "1.000 ou mais trabalhadores";
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Variações do nome da empresa: completo, sem sufixo societário e o primeiro nome. */
export function companyNameVariants(name: string): string[] {
  const noSuffix = name.replace(/\s*(Ltda\.?|S\.?\/?A\.?|ME|EPP|EIRELI|Inc\.?)\s*$/i, "").trim();
  const first = noSuffix.split(/\s+/)[0];
  return [...new Set([name, noSuffix, first.length >= 4 ? first : ""].filter(Boolean))].sort((a, b) => b.length - a.length);
}

export function anonymize(text: string, company: ExampleCompanyInput): string {
  let out = text;
  for (const variant of companyNameVariants(company.name)) {
    out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRe(variant)}(?![\\p{L}])`, "giu"), "a empresa");
  }
  for (const dept of [...company.departmentNames].sort((a, b) => b.length - a.length)) {
    if (dept.trim().length < 3) continue;
    out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRe(dept)}(?![\\p{L}])`, "giu"), "o setor");
  }
  // Contagens de pessoas ajudariam a reidentificar a empresa.
  out = out.replace(/\b\d[\d.]*\s+(colaboradores|pessoas|funcionários|trabalhadores|empregados|gestores)\b/giu, "$1 do grupo-alvo");
  // Contrações: "do o setor" → "do setor", "da a empresa" → "da empresa".
  out = out
    .replace(/\b(d|n|pel)o o setor\b/giu, "$1o setor")
    .replace(/\b(d|n|pel)a o setor\b/giu, "$1o setor")
    .replace(/\bao o setor\b/giu, "ao setor")
    .replace(/\bde o setor\b/giu, "do setor")
    .replace(/\bem o setor\b/giu, "no setor")
    .replace(/\bpor o setor\b/giu, "pelo setor")
    .replace(/\bde a empresa\b/giu, "da empresa")
    .replace(/\bem a empresa\b/giu, "na empresa")
    .replace(/\bpor a empresa\b/giu, "pela empresa")
    .replace(/\b(d|n|pel)a a empresa\b/giu, "$1a empresa")
    .replace(/\b(d|n|pel)o a empresa\b/giu, "$1a empresa")
    .replace(/(^|[^\p{L}])(a|à) a empresa\b/giu, "$1$2 empresa");
  return out;
}

const NEWLINE = "\n";
const STATUS_LABEL ={ APPROVED: "aprovado, em execução", COMPLETED: "concluído" } as const;
const LEVEL_LABEL = { RED: "Risco", YELLOW: "Intermédio" } as const;

export function buildExamplePlanText(plan: ExamplePlanInput, company: ExampleCompanyInput): string {
  const r = plan.recommendation;
  // Só o que vem do plano passa pela anonimização; as linhas montadas aqui (contexto,
  // porte em faixa, situação) já são seguras.
  const a = (text: string) => anonymize(text, company);
  // Situação e resultado vêm logo no começo, para estarem no primeiro trecho indexado:
  // é a informação mais importante de um exemplo ("funcionou?").
  const result =
    plan.outcomeDelta === null
      ? "Resultado: ainda não medido por nova pesquisa."
      : plan.outcomeDelta > 0
        ? `Resultado: na reavaliação, a dimensão melhorou ${Math.round(plan.outcomeDelta)} pontos.`
        : "Resultado: na reavaliação, a dimensão NÃO melhorou.";
  const lines: (string | null)[] = [
    "Plano de ação de outra empresa (exemplo anonimizado).",
    `Contexto: ${company.industry ? a(company.industry) : "setor não informado"}; ${sizeBand(company.employeeCount)}${company.workRegime ? `; regime ${company.workRegime}` : ""}.`,
    `Problema: dimensão "${plan.dimension ?? "não informada"}" em nível ${LEVEL_LABEL[plan.riskLevel]} na pesquisa.`,
    `Ação: ${exampleTitle(plan.title, company)}.`,
    `Situação: ${STATUS_LABEL[plan.status]}. ${result}`,
    r.recommendation_status ? `Estratégia: ${r.recommendation_status}.` : null,
    r.description ? a(r.description) : null,
    r.quick_action ? `Primeiros 30 dias: ${a(r.quick_action)}` : null,
    r.roadmap?.length
      ? ["Etapas:", ...r.roadmap.map((s) => a(`- ${s.phase}: ${s.deliverable}${s.owner_role ? ` (${s.owner_role})` : ""}`))].join(NEWLINE)
      : null,
    r.leading_indicators?.length
      ? ["Indicadores de acompanhamento:", ...r.leading_indicators.map((i) => a(`- ${i.metric}: ${i.target}`))].join(NEWLINE)
      : null,
  ];
  return lines.filter(Boolean).join(NEWLINE);
}

/** Título anonimizado, sem o "— o setor" que sobra de títulos como "Treinamento — Financeiro". */
export function exampleTitle(title: string, company: ExampleCompanyInput): string {
  return anonymize(title, company)
    .replace(/\s*[—–-]\s*(o setor|a empresa)\s*$/i, "")
    .replace(/\s+(no|do|para o) setor\s*$/i, "")
    .trim();
}
