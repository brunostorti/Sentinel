import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel } from "ai";
import { createMauaModel } from "./maua-provider";

export type ProviderType = "openai" | "anthropic" | "google" | "maua";

export interface CompanyAiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
}

export function getProviderInfo(modelName: string): { provider: ProviderType; modelId: string } {
  if (modelName === "maua") {
    return { provider: "maua", modelId: process.env.MAUA_AI_MODEL || "google/gemma-3-27b" };
  }

  // Simple heuristic for generic models or known ones
  if (modelName.toLowerCase().startsWith("gpt-") || modelName.toLowerCase().startsWith("o1-") || modelName.toLowerCase().startsWith("o3-")) {
    return { provider: "openai", modelId: modelName };
  }
  if (modelName.toLowerCase().startsWith("gemini-")) {
    return { provider: "google", modelId: modelName };
  }
  if (modelName.toLowerCase().startsWith("claude-")) {
    return { provider: "anthropic", modelId: modelName };
  }
  
  // Custom case: fallback to OpenAI if it looks like an OpenAI compatible endpoint, 
  // or just default to Anthropic since it was the original default.
  // Actually, we'll try to guess based on a map or just fallback to Anthropic.
  return { provider: "anthropic", modelId: modelName };
}

export function createModel(
  modelName: string,
  keys: CompanyAiKeys
): LanguageModel {
  const { provider, modelId } = getProviderInfo(modelName);

  switch (provider) {
    case "maua": {
      return createMauaModel(modelId);
    }
    case "openai": {
      const apiKey = keys.openai || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("Chave de API da OpenAI não configurada.");
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case "google": {
      const apiKey = keys.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("Chave de API do Google Gemini não configurada.");
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    case "anthropic":
    default: {
      const apiKey = keys.anthropic || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Chave de API da Anthropic não configurada.");
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
  }
}
