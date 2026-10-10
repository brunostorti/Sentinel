/**
 * Medição de uso de IA (tempo e tokens) por chamada, sem mudar a assinatura das etapas.
 *
 * Quem quer medir abre um "registro" com `withUsageRecorder(fn)`; dentro dele, as etapas
 * chamam `recordUsage(...)`. Fora de um registro, `recordUsage` não faz nada. Usado pelo
 * pipeline (log no fim de cada geração) e pelos scripts de benchmark
 * (docs/avaliacao/).
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface UsageEntry {
  stage: string;
  model: string;
  ms: number;
  inputTokens: number;
  outputTokens: number;
}

const storage = new AsyncLocalStorage<UsageEntry[]>();

export async function withUsageRecorder<T>(fn: () => Promise<T>): Promise<{ result: T; usage: UsageEntry[] }> {
  const entries: UsageEntry[] = [];
  const result = await storage.run(entries, fn);
  return { result, usage: entries };
}

export function recordUsage(
  stage: string,
  model: string,
  startedAt: number,
  usage?: { inputTokens?: number | undefined; outputTokens?: number | undefined; tokens?: number }
) {
  const entries = storage.getStore();
  if (!entries) return;
  entries.push({
    stage,
    model,
    ms: Date.now() - startedAt,
    inputTokens: usage?.inputTokens ?? usage?.tokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
  });
}

/** Resumo por etapa, para log. */
export function summarizeUsage(entries: UsageEntry[]): string {
  return entries
    .map((e) => `${e.stage} ${(e.ms / 1000).toFixed(1)}s ${e.inputTokens}→${e.outputTokens} tok (${e.model})`)
    .join(" | ");
}
