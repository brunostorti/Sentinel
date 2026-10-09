import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { createMauaModel } from "./maua-provider";
import {
  DEFAULT_MODELS,
  MAUA_MODEL_ID,
  PROVIDER_LABELS,
  isAllowedFor,
  modelLabel,
  providerOf,
  type AiProvider,
  type AiPurpose,
  type KeyedProvider,
} from "./models";

export interface CompanyAiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
}

/** Configurações de IA da empresa, como gravadas em `companies`. */
export interface CompanyAiSettings {
  ai_plan_model?: string | null;
  ai_chat_model?: string | null;
  ai_api_keys?: CompanyAiKeys | null;
}

/** Modelo efetivo de uma chamada, já com a regra de queda do chat aplicada. */
export interface ResolvedAiConfig {
  /** ID efetivo ("maua" quando o chat caiu para a Mauá). */
  model: string;
  provider: AiProvider;
  /** Só no chat: o provedor escolhido não tinha chave e a Mauá assumiu. */
  fellBackToMaua: boolean;
  /**
   * Chave efetiva do provedor (da empresa ou, se permitido, da plataforma).
   * Nos planos pode faltar: quem gera confere com missingPlanKeyMessage().
   */
  apiKey?: string;
}

const PLATFORM_KEY_ENV: Record<KeyedProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

/**
 * Chaves da plataforma (.env) só podem ser usadas enquanto isto estiver ligado.
 * Fase de testes/banca: ligado. Produção: AI_ALLOW_PLATFORM_KEYS=false
 * (cada cliente traz a própria chave; sem chave, o chat usa a Mauá e os planos aguardam a chave).
 */
export function platformKeysAllowed(): boolean {
  return process.env.AI_ALLOW_PLATFORM_KEYS !== "false";
}

/** O provedor funciona sem chave própria da empresa (chave da plataforma liberada)? */
export function platformKeyAvailable(provider: KeyedProvider): boolean {
  return platformKeysAllowed() && Boolean(process.env[PLATFORM_KEY_ENV[provider]]);
}

/** Chave disponível para o provedor: a da empresa ou, se permitido, a da plataforma. */
export function availableKey(
  provider: KeyedProvider,
  companyKeys?: CompanyAiKeys | null
): string | undefined {
  const own = companyKeys?.[provider];
  if (own) return own;
  return platformKeysAllowed() ? process.env[PLATFORM_KEY_ENV[provider]] || undefined : undefined;
}

/**
 * Decide qual modelo usar.
 * - Chat: sem chave do provedor escolhido (ou com ID desconhecido), cai para a Mauá.
 * - Planos: sempre o provedor externo escolhido, mesmo sem chave — a geração
 *   recusa antes de começar (ver missingPlanKeyMessage).
 */
export function resolveAiConfig(
  company: CompanyAiSettings | null | undefined,
  purpose: AiPurpose
): ResolvedAiConfig {
  const chosen = purpose === "plan" ? company?.ai_plan_model : company?.ai_chat_model;
  const requested = chosen?.trim() || DEFAULT_MODELS[purpose];

  if (purpose === "plan") {
    const model = isAllowedFor("plan", requested) ? requested : DEFAULT_MODELS.plan;
    const provider = providerOf(model) as KeyedProvider;
    return { model, provider, fellBackToMaua: false, apiKey: availableKey(provider, company?.ai_api_keys) };
  }

  const provider = providerOf(requested);
  if (provider === "maua") {
    return { model: MAUA_MODEL_ID, provider, fellBackToMaua: false };
  }
  if (provider) {
    const apiKey = availableKey(provider, company?.ai_api_keys);
    if (apiKey) return { model: requested, provider, fellBackToMaua: false, apiKey };
  }
  return { model: MAUA_MODEL_ID, provider: "maua", fellBackToMaua: true };
}

/** Mensagem quando o modelo de planos não tem chave; null se está tudo certo. */
export function missingPlanKeyMessage(config: ResolvedAiConfig): string | null {
  if (config.provider === "maua" || config.apiKey) return null;
  return `Sem chave de API de ${PROVIDER_LABELS[config.provider]} para gerar planos com ${modelLabel(config.model)}. Cadastre a chave em "Modelos de IA" (no Assistente) ou escolha outro modelo.`;
}

/**
 * Limite de tamanho da resposta. Modelos com raciocínio (ex.: Opus 5.5) gastam parte
 * do limite pensando — um teto baixo cortaria o JSON dos planos no meio.
 */
export function maxOutputTokensFor(config: ResolvedAiConfig): number {
  return config.provider === "maua" ? 6000 : 32000;
}

export function createModel(config: ResolvedAiConfig): LanguageModel {
  switch (config.provider) {
    case "maua":
      return createMauaModel(process.env.MAUA_AI_MODEL || "google/gemma-3-27b");
    case "openai":
      return createOpenAI({ apiKey: requireKey(config) })(config.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: requireKey(config) })(config.model);
    case "anthropic":
      return createAnthropic({ apiKey: requireKey(config) })(config.model);
  }
}

function requireKey(config: ResolvedAiConfig): string {
  if (!config.apiKey) {
    throw new Error(`Chave de API não configurada para o modelo ${config.model}.`);
  }
  return config.apiKey;
}

/** Traduz erros comuns dos provedores para mensagens que o RH entende. */
export function describeAiError(err: unknown, config?: ResolvedAiConfig): string {
  const raw = err instanceof Error ? err.message : String(err);
  const status = (err as { statusCode?: number })?.statusCode;
  const modelName = config?.model ?? "escolhido";

  if (status === 401 || status === 403 || /invalid.*(api.?key|x-api-key)|unauthori[sz]ed|authentication/i.test(raw)) {
    return `A chave de API do modelo ${modelName} foi recusada pelo provedor. Confira a chave nas configurações de IA.`;
  }
  if (status === 404 || /model.*(not.?found|does not exist|deprecated|retired)|not_found_error/i.test(raw)) {
    return `O modelo ${modelName} não existe mais ou não está disponível para esta chave. Escolha outro modelo nas configurações de IA.`;
  }
  if (status === 429 || /rate.?limit|too many requests|limite/i.test(raw)) {
    return config?.provider === "maua"
      ? "A IA da Mauá atingiu o limite de uso no momento. Tente novamente em instantes."
      : "O provedor de IA atingiu o limite de uso. Tente novamente em instantes.";
  }
  if ((err as { name?: string })?.name === "TimeoutError" || /aborted due to timeout|timed? ?out/i.test(raw)) {
    return config?.provider === "maua"
      ? "A IA da Mauá demorou demais para responder. Tente novamente ou escolha outro modelo nas configurações de IA."
      : "O provedor de IA demorou demais para responder. Tente novamente em instantes.";
  }
  return raw;
}
