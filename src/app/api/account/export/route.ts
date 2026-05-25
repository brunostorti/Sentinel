import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/account/export
 *
 * Direito do titular ao acesso (Art. 18, II LGPD): retorna em formato
 * estruturado (JSON) todos os dados que o sistema mantém sobre o usuário
 * logado.
 *
 * Saída inclui: registro do user (sem credenciais), threads de chat criadas
 * por ele, eventos de perfil que ele confirmou, atribuições de outcome que
 * ele fez, ações históricas que ele registrou.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, created_at, updated_at, lgpd_consent_at, lgpd_consent_version")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!userData) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  // Threads + mensagens criadas pelo usuário
  const { data: threads } = await supabase
    .from("chat_threads")
    .select(`
      id, kind, resource_id, title, summary, message_count, last_message_at, created_at,
      chat_messages(id, role, content, metadata, created_at)
    `)
    .eq("created_by_user_id", userData.id);

  // Eventos de perfil que o usuário confirmou
  const { data: profileEvents } = await supabase
    .from("profile_events")
    .select("id, event_type, field_path, old_value, new_value, source_context, confidence, confirmed_at, rejected_at, created_at")
    .eq("confirmed_by_user_id", userData.id);

  // Atribuições de outcome feitas pelo usuário
  const { data: outcomes } = await supabase
    .from("action_outcomes")
    .select("id, intervention_id, dimension_id, score_before, score_after, delta, hr_attribution, hr_notes, attribution_collected_at")
    .eq("attribution_user_id", userData.id);

  const exportPayload = {
    export_generated_at: new Date().toISOString(),
    legal_basis: "Art. 18, II LGPD - Direito de acesso do titular",
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      company_id: userData.company_id,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      lgpd_consent_at: userData.lgpd_consent_at,
      lgpd_consent_version: userData.lgpd_consent_version,
    },
    chat_threads: threads ?? [],
    profile_events_confirmed: profileEvents ?? [],
    outcome_attributions: outcomes ?? [],
    notes: [
      "Survey responses are stored anonymously (no email/IP/session) and cannot be linked back to you. They are NOT included in this export.",
      "Auth credentials (password hash, etc.) are managed by Supabase Auth and not exposed here.",
    ],
  };

  const filename = `sentinel-export-${userData.email.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
