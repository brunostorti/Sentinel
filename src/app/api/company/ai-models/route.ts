import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEYED_PROVIDERS, PROVIDER_LABELS, type KeyedProvider } from "@/lib/ai/models";
import { availableKey, type CompanyAiKeys } from "@/lib/ai/provider-factory";
import { ProviderKeyError, listProviderModels } from "@/lib/ai/provider-models";

/**
 * GET /api/company/ai-models?provider=openai
 * Lista os modelos de texto que a chave disponível (da empresa ou, se liberada, da
 * plataforma) consegue usar — a opção "outros modelos" do seletor. Só RH/Admin.
 */
export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") as KeyedProvider | null;
  if (!provider || !KEYED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Provedor inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData?.company_id || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const { data: company } = await createAdminClient()
    .from("companies")
    .select("ai_api_keys")
    .eq("id", userData.company_id)
    .single();

  const apiKey = availableKey(provider, company?.ai_api_keys as CompanyAiKeys | null);
  if (!apiKey) {
    return NextResponse.json(
      { error: `Cadastre uma chave de ${PROVIDER_LABELS[provider]} para ver os modelos disponíveis.` },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ models: await listProviderModels(provider, apiKey) });
  } catch (e) {
    const message =
      e instanceof ProviderKeyError
        ? `A chave de ${PROVIDER_LABELS[provider]} foi recusada pelo provedor.`
        : `Não foi possível consultar ${PROVIDER_LABELS[provider]} agora.`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
