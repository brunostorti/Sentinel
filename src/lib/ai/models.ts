/**
 * Registro central dos modelos de IA do Sentinel.
 *
 * Para atualizar a lista de recomendados quando um provedor lançar modelos novos,
 * edite APENAS este arquivo (conferindo os IDs na página oficial do provedor).
 * Modelos fora desta lista continuam disponíveis na opção "outro modelo", que
 * consulta a API do provedor com a chave da empresa.
 *
 * Política de uso (decidida em 08/10/2026):
 * - Planos de ação: padrão Claude Opus 5.5 (qualidade importa, geração rara).
 * - Chat: padrão IA da Mauá (gratuita, infraestrutura acadêmica). Sem chave do
 *   provedor escolhido, o chat cai para a Mauá.
 * - Planos: SÓ provedores externos (Claude, GPT, Gemini). A Mauá (~28 tokens/s)
 *   não conclui o pipeline dentro do limite de 5 min da Vercel; sem a chave do
 *   provedor escolhido, a geração para antes de começar, com aviso.
 * - Chaves da plataforma (.env) só valem enquanto AI_ALLOW_PLATFORM_KEYS != "false";
 *   em produção cada cliente traz a própria chave.
 *
 * IDs conferidos nas páginas oficiais em 08/10/2026.
 */

export type AiProvider = "anthropic" | "openai" | "google" | "maua";
export type KeyedProvider = Exclude<AiProvider, "maua">;
export type AiPurpose = "plan" | "chat";
export type ModelTier = "qualidade" | "equilibrado" | "economico";

export interface ModelOption {
  id: string;
  provider: AiProvider;
  name: string;
  tier: ModelTier;
  description: string;
  /** Preço de referência em US$ por 1 milhão de tokens (entrada / saída). */
  priceUsdPerMTok: { input: number; output: number } | null;
  preview?: boolean;
}

/** ID usado no Sentinel para a IA da Mauá (o modelo real vem de MAUA_AI_MODEL). */
export const MAUA_MODEL_ID = "maua";

export const DEFAULT_MODELS: Record<AiPurpose, string> = {
  plan: "claude-opus-5-5",
  chat: MAUA_MODEL_ID,
};

export const KEYED_PROVIDERS: KeyedProvider[] = ["anthropic", "openai", "google"];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  google: "Google (Gemini)",
  maua: "Mauá (Barô)",
};

export const RECOMMENDED_MODELS: ModelOption[] = [
  {
    id: MAUA_MODEL_ID,
    provider: "maua",
    name: "IA da Mauá — Gemma 3 27B",
    tier: "equilibrado",
    description: "Gratuita, oferecida pelo Instituto Mauá (Barô). Usada só no chat; limite de uso compartilhado.",
    priceUsdPerMTok: null,
  },
  {
    id: "claude-opus-5-5",
    provider: "anthropic",
    name: "Claude Opus 5.5",
    tier: "qualidade",
    description: "O mais capaz da Anthropic. Recomendado para gerar planos de ação.",
    priceUsdPerMTok: { input: 4, output: 20 },
  },
  {
    id: "claude-sonnet-5-5",
    provider: "anthropic",
    name: "Claude Sonnet 5.5",
    tier: "equilibrado",
    description: "Ótimo equilíbrio entre qualidade, velocidade e custo.",
    priceUsdPerMTok: { input: 2, output: 10 },
  },
  {
    id: "claude-haiku-5-5",
    provider: "anthropic",
    name: "Claude Haiku 5.5",
    tier: "economico",
    description: "Rápido e barato; indicado para o chat do dia a dia.",
    priceUsdPerMTok: { input: 0.1, output: 0.5 },
  },
  {
    id: "gpt-6-astra",
    provider: "openai",
    name: "GPT-6 Astra",
    tier: "qualidade",
    description: "O modelo mais capaz da OpenAI; custo elevado.",
    priceUsdPerMTok: { input: 10, output: 50 },
  },
  {
    id: "gpt-6.1-sol",
    provider: "openai",
    name: "GPT-6.1 Sol",
    tier: "equilibrado",
    description: "Modelo intermediário da OpenAI, com bom custo-benefício.",
    priceUsdPerMTok: { input: 2, output: 10 },
  },
  {
    id: "gpt-6-luna",
    provider: "openai",
    name: "GPT-6 Luna",
    tier: "economico",
    description: "O mais barato da OpenAI; indicado para o chat.",
    priceUsdPerMTok: { input: 0.1, output: 0.5 },
  },
  {
    id: "gemini-3.1-pro-preview",
    provider: "google",
    name: "Gemini 3.1 Pro",
    tier: "qualidade",
    description: "O mais capaz do Google (versão preview, pode mudar).",
    priceUsdPerMTok: { input: 2, output: 12 },
    preview: true,
  },
  {
    id: "gemini-3.8-flash",
    provider: "google",
    name: "Gemini 3.8 Flash",
    tier: "equilibrado",
    description: "Recomendado pelo Google para uso geral; rápido e barato.",
    priceUsdPerMTok: { input: 0.75, output: 3.75 },
  },
  {
    id: "gemini-3.5-flash-lite",
    provider: "google",
    name: "Gemini 3.5 Flash-Lite",
    tier: "economico",
    description: "O mais econômico do Google.",
    priceUsdPerMTok: { input: 0.3, output: 2.5 },
  },
];

/** Descobre o provedor pelo ID do modelo. */
export function providerOf(modelId: string): AiProvider | null {
  const id = modelId.trim().toLowerCase();
  if (id === MAUA_MODEL_ID) return "maua";
  if (id.startsWith("claude-")) return "anthropic";
  if (id.startsWith("gemini-")) return "google";
  if (id.startsWith("gpt-") || /^o\d/.test(id) || id.startsWith("chatgpt-")) return "openai";
  return null;
}

/** A Mauá só atende o chat; planos exigem um provedor externo. */
export function isAllowedFor(purpose: AiPurpose, modelId: string): boolean {
  const provider = providerOf(modelId);
  return provider !== null && (purpose === "chat" || provider !== "maua");
}

export function findModel(modelId: string): ModelOption | null {
  return RECOMMENDED_MODELS.find((m) => m.id === modelId) ?? null;
}

/** Nome amigável para exibir (ex.: no plano: "Gerado por Claude Opus 5.5"). */
export function modelLabel(modelId: string): string {
  return findModel(modelId)?.name ?? modelId;
}
