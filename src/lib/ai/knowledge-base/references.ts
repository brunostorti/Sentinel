/**
 * Helpers para carregar a base de evidências curada do banco
 * (tabelas kb_references + kb_intervention_references).
 *
 * Cada intervenção do catálogo (catalog.ts) tem 2-4 referências reais
 * verificáveis com DOI/URL e citação ABNT pré-formatada.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type EvidenceType =
  | "guideline"
  | "systematic_review"
  | "meta_analysis"
  | "rct"
  | "observational"
  | "government_data"
  | "theoretical"
  | "validation_study"
  | "book";

export type CertaintyLevel = "very_low" | "low" | "moderate" | "high";
export type Region = "global" | "brazil" | "europe" | "usa" | "latin_america";
export type Relevance = "primary" | "secondary" | "context";

export interface KbReference {
  id: string;
  citation_key: string;
  authors: string;
  year: number;
  title: string;
  publisher_or_journal: string | null;
  doi: string | null;
  url: string;
  evidence_type: EvidenceType;
  certainty_level: CertaintyLevel | null;
  region: Region | null;
  abnt_citation: string;
  notes: string | null;
}

export interface KbReferenceWithRelevance extends KbReference {
  relevance: Relevance;
  specific_claim: string | null;
}

/**
 * Lista todas as referências do banco.
 * Cache de 1h em memória (chamado por endpoint público de metodologia).
 */
let _refsCache: { data: KbReference[]; expires: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function listAllReferences(): Promise<KbReference[]> {
  const now = Date.now();
  if (_refsCache && _refsCache.expires > now) return _refsCache.data;

  const admin = createAdminClient();
  const { data } = await admin
    .from("kb_references")
    .select("*")
    .order("year", { ascending: false });

  const refs = (data ?? []) as KbReference[];
  _refsCache = { data: refs, expires: now + TTL_MS };
  return refs;
}

/**
 * Carrega referências de uma intervenção específica (com relevance + claim).
 * Usada pelo pipeline (Consultant) e pela UI do plano.
 */
export async function getReferencesForIntervention(
  interventionId: string
): Promise<KbReferenceWithRelevance[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("kb_intervention_references")
    .select(`
      relevance,
      specific_claim,
      kb_references(*)
    `)
    .eq("intervention_id", interventionId);

  if (!data) return [];

  return data
    .map((row) => {
      const ref = row.kb_references as unknown as KbReference | null;
      if (!ref) return null;
      return {
        ...ref,
        relevance: row.relevance as Relevance,
        specific_claim: row.specific_claim as string | null,
      } as KbReferenceWithRelevance;
    })
    .filter(Boolean) as KbReferenceWithRelevance[];
}

/**
 * Carrega referências de várias intervenções em uma chamada (batch).
 * Útil para o Consultant que processa vários candidatos juntos.
 */
export async function getReferencesForInterventions(
  interventionIds: string[]
): Promise<Map<string, KbReferenceWithRelevance[]>> {
  if (interventionIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data } = await admin
    .from("kb_intervention_references")
    .select(`
      intervention_id,
      relevance,
      specific_claim,
      kb_references(*)
    `)
    .in("intervention_id", interventionIds);

  const result = new Map<string, KbReferenceWithRelevance[]>();
  for (const id of interventionIds) result.set(id, []);

  for (const row of data ?? []) {
    const ref = row.kb_references as unknown as KbReference | null;
    if (!ref) continue;
    const list = result.get(row.intervention_id as string);
    if (!list) continue;
    list.push({
      ...ref,
      relevance: row.relevance as Relevance,
      specific_claim: row.specific_claim as string | null,
    });
  }

  return result;
}
