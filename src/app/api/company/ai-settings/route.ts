import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Configurações de IA da empresa (modelo + chaves de API dos provedores).
 *
 * As chaves NUNCA saem do servidor: o GET devolve só os 4 últimos caracteres,
 * e a coluna companies.ai_api_keys não é legível pelo navegador (migração 022).
 * Qualquer usuário da empresa vê o modelo; só RH/Admin alteram.
 */

const PROVIDERS = ["anthropic", "openai", "google"] as const;
type Provider = (typeof PROVIDERS)[number];
type StoredKeys = Partial<Record<Provider, string>>;

const MODEL_PATTERN = /^[A-Za-z0-9._:/-]{1,100}$/;
const MAX_KEY_LENGTH = 300;

function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  return key.length > 8 ? `••••${key.slice(-4)}` : "••••";
}

async function getCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData?.company_id) return null;

  return {
    companyId: userData.company_id as string,
    canEdit: userData.role === "HR" || userData.role === "ADMIN",
  };
}

export async function GET() {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: company } = await createAdminClient()
    .from("companies")
    .select("ai_model, ai_api_keys")
    .eq("id", caller.companyId)
    .single();

  const stored = (company?.ai_api_keys ?? {}) as StoredKeys;
  return NextResponse.json({
    model: company?.ai_model ?? null,
    keys: Object.fromEntries(PROVIDERS.map((p) => [p, maskKey(stored[p])])),
    canEdit: caller.canEdit,
  });
}

/**
 * Corpo: { model: string, keys?: { [provider]: string | null } }
 * - string não vazia → grava a chave; null → remove; ausente ou "" → mantém a atual.
 */
export async function PUT(req: NextRequest) {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!caller.canEdit) {
    return NextResponse.json(
      { error: "Apenas RH e Admin podem alterar as configurações de IA." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    model?: unknown;
    keys?: Record<string, unknown>;
  } | null;

  const model = typeof body?.model === "string" ? body.model.trim() : "";
  if (!MODEL_PATTERN.test(model)) {
    return NextResponse.json({ error: "Nome do modelo inválido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("ai_api_keys")
    .eq("id", caller.companyId)
    .single();

  const nextKeys: StoredKeys = { ...((company?.ai_api_keys ?? {}) as StoredKeys) };
  for (const provider of PROVIDERS) {
    const value = body?.keys?.[provider];
    if (value === null) {
      delete nextKeys[provider];
    } else if (typeof value === "string" && value.trim()) {
      const key = value.trim();
      if (key.length > MAX_KEY_LENGTH) {
        return NextResponse.json({ error: "Chave de API inválida." }, { status: 400 });
      }
      nextKeys[provider] = key;
    }
  }

  const { error } = await admin
    .from("companies")
    .update({
      ai_model: model,
      ai_api_keys: nextKeys,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caller.companyId);

  if (error) {
    console.error("ai-settings update error:", error);
    return NextResponse.json({ error: "Erro ao salvar configurações." }, { status: 500 });
  }

  return NextResponse.json({
    model,
    keys: Object.fromEntries(PROVIDERS.map((p) => [p, maskKey(nextKeys[p])])),
    canEdit: true,
  });
}
