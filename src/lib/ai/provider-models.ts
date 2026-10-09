import type { KeyedProvider } from "./models";

/**
 * Consulta a API de cada provedor para listar os modelos de texto disponíveis
 * para uma chave. Usado para (1) a opção "outros modelos disponíveis na sua chave"
 * e (2) testar uma chave antes de salvá-la (a listagem é gratuita).
 */

export interface RemoteModel {
  id: string;
  name: string;
}

export class ProviderKeyError extends Error {}

const TIMEOUT_MS = 15_000;

/** Modelos que não servem para texto/chat (áudio, imagem, embeddings etc.). */
const NON_TEXT = /(audio|realtime|tts|transcribe|speech|image|embedding|moderation|search|instruct|live|omni|translate|computer)/i;

async function getJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 401 || res.status === 403) {
    throw new ProviderKeyError("Chave recusada pelo provedor.");
  }
  if (!res.ok) {
    throw new Error(`O provedor respondeu com erro ${res.status}.`);
  }
  return res.json();
}

export async function listProviderModels(
  provider: KeyedProvider,
  apiKey: string
): Promise<RemoteModel[]> {
  switch (provider) {
    case "anthropic": {
      const json = await getJson("https://api.anthropic.com/v1/models?limit=100", {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      });
      return (json.data ?? []).map((m: { id: string; display_name?: string }) => ({
        id: m.id,
        name: m.display_name ?? m.id,
      }));
    }
    case "openai": {
      const json = await getJson("https://api.openai.com/v1/models", {
        Authorization: `Bearer ${apiKey}`,
      });
      return (json.data ?? [])
        .map((m: { id: string }) => m.id)
        .filter((id: string) => /^(gpt-|o\d|chatgpt-)/.test(id) && !NON_TEXT.test(id))
        .sort()
        .map((id: string) => ({ id, name: id }));
    }
    case "google": {
      const json = await getJson(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
        { "x-goog-api-key": apiKey }
      );
      return (json.models ?? [])
        .filter(
          (m: { name: string; supportedGenerationMethods?: string[] }) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            m.name.startsWith("models/gemini-") &&
            !NON_TEXT.test(m.name)
        )
        .map((m: { name: string; displayName?: string }) => ({
          id: m.name.replace(/^models\//, ""),
          name: m.displayName ?? m.name,
        }));
    }
  }
}

/** Testa a chave consultando a listagem (gratuita). Lança ProviderKeyError se recusada. */
export async function testProviderKey(provider: KeyedProvider, apiKey: string): Promise<void> {
  await listProviderModels(provider, apiKey);
}
