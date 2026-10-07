import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

/**
 * Módulo isolado da LLM da Mauá.
 * Para remover do projeto no futuro, basta deletar este arquivo
 * e as referências a ele em `provider-factory.ts`.
 */
export function createMauaModel(modelId: string): LanguageModel {
  const baseURL = process.env.MAUA_AI_BASE_URL || "http://3.231.42.47/v1";
  const apiKey = process.env.MAUA_AI_API_KEY || "maua";
  
  let extrasAceitos = true;

  const mauaProvider = createOpenAI({
    baseURL,
    apiKey,
    fetch: async (url, options) => {
      let currentOptions = { ...options };
      let injectedBody = false;

      // Injeta parâmetros extras solicitados pelo professor (se aceitos pelo servidor)
      if (extrasAceitos && currentOptions.body && typeof currentOptions.body === 'string') {
        try {
          const bodyObj = JSON.parse(currentOptions.body);
          bodyObj.chat_template_kwargs = { enable_thinking: false };
          bodyObj.reasoning_effort = "low";
          currentOptions.body = JSON.stringify(bodyObj);
          injectedBody = true;
        } catch (e) {
          // Ignora erro de parsing
        }
      }

      let response = await fetch(url, {
        ...currentOptions,
        signal: AbortSignal.timeout(120 * 1000)
      });

      // Se o servidor recusar os parâmetros extras (400 ou 422), tentamos sem eles
      if ((response.status === 400 || response.status === 422) && injectedBody) {
        extrasAceitos = false;
        
        response = await fetch(url, {
          ...options, // usa as options originais
          signal: AbortSignal.timeout(120 * 1000)
        });
      }

      return response;
    }
  });

  return mauaProvider(modelId);
}
