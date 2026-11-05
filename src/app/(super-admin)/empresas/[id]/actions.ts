"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterAdmin, logAdminAction } from "@/lib/sentinel/server";
import { KEYED_PROVIDERS, PROVIDER_LABELS, type KeyedProvider } from "@/lib/ai/models";
import { ProviderKeyError, testProviderKey } from "@/lib/ai/provider-models";

export interface KeyTestResult {
  provider: KeyedProvider;
  label: string;
  ok: boolean;
  message: string;
}

/**
 * Testa as chaves de IA da empresa consultando a lista de modelos do provedor (chamada
 * gratuita). Confirma que a chave é aceita; não confere saldo/créditos. A chave nunca
 * sai do servidor.
 */
export async function testCompanyAiKeys(companyId: string): Promise<{ error?: string; results?: KeyTestResult[] }> {
  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };

  const { data: company } = await createAdminClient()
    .from("companies")
    .select("ai_api_keys")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return { error: "Empresa não encontrada." };

  const keys = (company.ai_api_keys ?? {}) as Partial<Record<KeyedProvider, string>>;
  const results: KeyTestResult[] = [];
  for (const provider of KEYED_PROVIDERS) {
    const key = keys[provider]?.trim();
    if (!key) continue;
    try {
      await testProviderKey(provider, key);
      results.push({ provider, label: PROVIDER_LABELS[provider], ok: true, message: "Chave aceita pelo provedor." });
    } catch (e) {
      results.push({
        provider,
        label: PROVIDER_LABELS[provider],
        ok: false,
        message:
          e instanceof ProviderKeyError
            ? "Chave recusada pelo provedor (inválida, revogada ou sem permissão)."
            : "Não foi possível testar agora (provedor fora do ar ou sem resposta).",
      });
    }
  }

  await logAdminAction(admin.id, "company.test_ai_key", companyId, {
    results: results.map((r) => ({ provider: r.provider, ok: r.ok })),
  });
  return { results };
}

const MAX_NOTE = 2000;

export async function addCompanyNote(companyId: string, body: string) {
  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };
  const text = body.trim();
  if (!text) return { error: "Escreva a nota." };
  if (text.length > MAX_NOTE) return { error: `A nota pode ter até ${MAX_NOTE} caracteres.` };

  const { error } = await createAdminClient()
    .from("company_notes")
    .insert({ company_id: companyId, author_user_id: admin.id, body: text });
  if (error) return { error: "Não foi possível salvar a nota." };

  await logAdminAction(admin.id, "company.note_add", companyId, {});
  revalidatePath(`/empresas/${companyId}`);
  return { success: true };
}

export async function deleteCompanyNote(companyId: string, noteId: string) {
  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };

  const { error } = await createAdminClient()
    .from("company_notes")
    .delete()
    .eq("id", noteId)
    .eq("company_id", companyId);
  if (error) return { error: "Não foi possível apagar a nota." };

  await logAdminAction(admin.id, "company.note_delete", companyId, {});
  revalidatePath(`/empresas/${companyId}`);
  return { success: true };
}
