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
  /** Início da chamada (epoch ms): com chamadas em paralelo, o tempo da etapa não é a soma. */
  startedAt: number;
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
    startedAt,
    ms: Date.now() - startedAt,
    inputTokens: usage?.inputTokens ?? usage?.tokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
  });
}

export interface StageUsage {
  stage: string;
  model: string;
  calls: number;
  /** Do início da primeira chamada ao fim da última. */
  wallMs: number;
  inputTokens: number;
  outputTokens: number;
}

/** Agrupa as chamadas por etapa (na ordem em que cada etapa apareceu). */
export function usageByStage(entries: UsageEntry[]): StageUsage[] {
  const stages = new Map<string, UsageEntry[]>();
  for (const e of entries) stages.set(e.stage, [...(stages.get(e.stage) ?? []), e]);
  return [...stages.entries()].map(([stage, list]) => ({
    stage,
    model: list[0].model,
    calls: list.length,
    wallMs: Math.max(...list.map((e) => e.startedAt + e.ms)) - Math.min(...list.map((e) => e.startedAt)),
    inputTokens: list.reduce((a, e) => a + e.inputTokens, 0),
    outputTokens: list.reduce((a, e) => a + e.outputTokens, 0),
  }));
}

/** Resumo por etapa, para log. */
export function summarizeUsage(entries: UsageEntry[]): string {
  return usageByStage(entries)
    .map(
      (s) =>
        `${s.stage} ${(s.wallMs / 1000).toFixed(1)}s${s.calls > 1 ? ` (${s.calls} chamadas)` : ""} ${s.inputTokens}→${s.outputTokens} tok (${s.model})`
    )
    .join(" | ");
}
