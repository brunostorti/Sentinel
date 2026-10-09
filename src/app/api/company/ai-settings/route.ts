import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  KEYED_PROVIDERS,
  isAllowedFor,
  providerOf,
  PROVIDER_LABELS,
  type AiPurpose,
} from "@/lib/ai/models";
import {
  platformKeyAvailable,
  resolveAiConfig,
  type CompanyAiKeys,
  type CompanyAiSettings,
} from "@/lib/ai/provider-factory";
import { ProviderKeyError, testProviderKey } from "@/lib/ai/provider-models";

/**
 * Configurações de IA da empresa: modelo para planos, modelo para chat e chaves.
 *
 * As chaves NUNCA saem do servidor: o GET devolve só os 4 últimos caracteres,
 * e a coluna companies.ai_api_keys não é legível pelo navegador (migração 022).
 * Qualquer usuário da empresa vê a configuração; só RH/Admin alteram.
 */

const MODEL_PATTERN = /^[A-Za-z0-9._:/-]{1,100}$/;
const MAX_KEY_LENGTH = 300;
const PURPOSES: AiPurpose[] = ["plan", "chat"];

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

/** Resposta pública: nunca inclui chaves completas. */
function describeSettings(settings: CompanyAiSettings, canEdit: boolean) {
  const stored = (settings.ai_api_keys ?? {}) as CompanyAiKeys;
  return {
    planModel: settings.ai_plan_model ?? null,
    chatModel: settings.ai_chat_model ?? null,
    keys: Object.fromEntries(KEYED_PROVIDERS.map((p) => [p, maskKey(stored[p])])),
    /** Provedores que funcionam sem chave própria (chave da plataforma liberada). */
    platformKeys: Object.fromEntries(
      KEYED_PROVIDERS.map((p) => [p, platformKeyAvailable(p)])
    ),
    /**
     * O que vai rodar de fato em cada finalidade. Chat: já com a queda para a Mauá.
     * Planos: hasKey=false significa que a geração vai recusar até cadastrarem a chave.
     */
    effective: Object.fromEntries(
      PURPOSES.map((purpose) => {
        const r = resolveAiConfig(settings, purpose);
        return [
          purpose,
          { model: r.model, fellBackToMaua: r.fellBackToMaua, hasKey: r.provider === "maua" || Boolean(r.apiKey) },
        ];
      })
    ),
    canEdit,
  };
}

async function loadSettings(companyId: string): Promise<CompanyAiSettings> {
  const { data } = await createAdminClient()
    .from("companies")
    .select("ai_plan_model, ai_chat_model, ai_api_keys")
    .eq("id", companyId)
    .single();
  return (data ?? {}) as CompanyAiSettings;
}

export async function GET() {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json(describeSettings(await loadSettings(caller.companyId), caller.canEdit));
}

/**
 * Corpo: { planModel: string, chatModel: string, keys?: { [provider]: string | null } }
 * - chave string não vazia → é testada no provedor e gravada; null → removida;
 *   ausente ou "" → mantém a atual.
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
    planModel?: unknown;
    chatModel?: unknown;
    keys?: Record<string, unknown>;
  } | null;

  const models: Record<AiPurpose, string> = { plan: "", chat: "" };
  for (const [purpose, value] of [["plan", body?.planModel], ["chat", body?.chatModel]] as const) {
    const id = typeof value === "string" ? value.trim() : "";
    if (purpose === "plan" && providerOf(id) === "maua") {
      return NextResponse.json(
        { error: "A IA da Mauá é usada só no chat. Para gerar planos, escolha um modelo de Claude, GPT ou Gemini." },
        { status: 400 }
      );
    }
    if (!MODEL_PATTERN.test(id) || !isAllowedFor(purpose, id)) {
      return NextResponse.json(
        {
          error:
            purpose === "plan"
              ? "Modelo inválido para planos: use um ID de Claude, GPT ou Gemini."
              : "Modelo inválido para o chat: use um ID de Claude, GPT, Gemini ou a IA da Mauá.",
        },
        { status: 400 }
      );
    }
    models[purpose] = id;
  }

  const current = await loadSettings(caller.companyId);
  const nextKeys: CompanyAiKeys = { ...((current.ai_api_keys ?? {}) as CompanyAiKeys) };
  for (const provider of KEYED_PROVIDERS) {
    const value = body?.keys?.[provider];
    if (value === null) {
      delete nextKeys[provider];
    } else if (typeof value === "string" && value.trim()) {
      const key = value.trim();
      if (key.length > MAX_KEY_LENGTH) {
        return NextResponse.json({ error: "Chave de API inválida." }, { status: 400 });
      }
      try {
        await testProviderKey(provider, key);
      } catch (e) {
        const reason = e instanceof ProviderKeyError ? "foi recusada pelo provedor" : "não pôde ser testada agora";
        return NextResponse.json(
          { error: `A chave de ${PROVIDER_LABELS[provider]} ${reason}. Nada foi salvo.` },
          { status: 400 }
        );
      }
      nextKeys[provider] = key;
    }
  }

  const { error } = await createAdminClient()
    .from("companies")
    .update({
      ai_plan_model: models.plan,
      ai_chat_model: models.chat,
      ai_api_keys: nextKeys,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caller.companyId);

  if (error) {
    console.error("ai-settings update error:", error);
    return NextResponse.json({ error: "Erro ao salvar configurações." }, { status: 500 });
  }

  return NextResponse.json(
    describeSettings({ ai_plan_model: models.plan, ai_chat_model: models.chat, ai_api_keys: nextKeys }, true)
  );
}
