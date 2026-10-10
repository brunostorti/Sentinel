/**
 * Embeddings com o modelo fixo da plataforma (OpenAI text-embedding-3-large @1536).
 *
 * Usa sempre a chave da plataforma (OPENAI_API_KEY no servidor), nunca a chave
 * cadastrada pela empresa: o modelo de embeddings é o mesmo para todos, e os vetores
 * de documentos globais e da empresa precisam ser comparáveis.
 */

import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./config";
import { recordUsage } from "@/lib/ai/usage";

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function embeddingModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada: a busca em documentos está desativada.");
  return createOpenAI({ apiKey }).embeddingModel(EMBEDDING_MODEL);
}

const providerOptions = { openai: { dimensions: EMBEDDING_DIMENSIONS } };

export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const startedAt = Date.now();
  const { embeddings, usage } = await embedMany({
    model: embeddingModel(),
    values,
    maxParallelCalls: 2,
    providerOptions,
  });
  recordUsage("embedding", EMBEDDING_MODEL, startedAt, usage);
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const startedAt = Date.now();
  const { embedding, usage } = await embed({ model: embeddingModel(), value: text, providerOptions });
  recordUsage("embedding", EMBEDDING_MODEL, startedAt, usage);
  return embedding;
}
