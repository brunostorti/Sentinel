import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Módulo isolado da LLM da Mauá (Barô — https://ia.maua.br).
 * Para remover do projeto no futuro, basta deletar este arquivo
 * e as referências a ele em `provider-factory.ts`.
 *
 * A Barô expõe a API no padrão OpenAI **Chat Completions** (`/chat/completions`);
 * a rota `/responses` não existe lá, por isso o modelo é criado com `.chat()`.
 * Limites (por pessoa, somando as chaves): 30 pedidos/min, 500/dia, 2 simultâneos.
 */

const REQUEST_TIMEOUT_MS = 120 * 1000;

export function createMauaModel(modelId: string): LanguageModel {
  const baseURL = process.env.MAUA_AI_BASE_URL;
  const apiKey = process.env.MAUA_AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error(
      "IA da Mauá não configurada: defina MAUA_AI_BASE_URL e MAUA_AI_API_KEY (gere a chave em https://ia.maua.br, em Chaves de API)."
    );
  }

  let extrasAceitos = true;

  const mauaProvider = createOpenAI({
    baseURL,
    apiKey,
    fetch: async (url, options) => {
      // Respeita o cancelamento pedido pelo SDK e impõe um teto de tempo.
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

      let currentOptions = { ...options };
      let injectedBody = false;

      // Injeta parâmetros extras solicitados pelo professor (se aceitos pelo servidor)
      if (extrasAceitos && typeof currentOptions.body === "string") {
        try {
          const bodyObj = JSON.parse(currentOptions.body);
          bodyObj.chat_template_kwargs = { enable_thinking: false };
          bodyObj.reasoning_effort = "low";
          currentOptions = { ...currentOptions, body: JSON.stringify(bodyObj) };
          injectedBody = true;
        } catch {
          // Corpo não é JSON: segue sem os extras
        }
      }

      let response = await fetch(url, { ...currentOptions, signal });

      // Se o servidor recusar os parâmetros extras (400 ou 422), tentamos sem eles
      if ((response.status === 400 || response.status === 422) && injectedBody) {
        extrasAceitos = false;
        response = await fetch(url, { ...options, signal });
      }

      return response;
    },
  });

  return mauaProvider.chat(modelId);
}
