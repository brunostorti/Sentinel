import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/account/delete
 * Body: { confirm: "EXCLUIR MEUS DADOS" }
 *
 * Direito do titular à eliminação (Art. 18, VI LGPD).
 *
 * O que faz:
 *  1. Anonimiza chat_messages do usuário (mantém threads vazias para integridade
 *     mas remove o conteúdo das mensagens dele).
 *  2. Marca profile_events confirmados pelo usuário como "actor_deleted".
 *  3. Marca outcome attributions como "actor_deleted".
 *  4. Apaga o registro em `users` (CASCADE limpa relacionamentos diretos).
 *  5. Apaga o auth user no Supabase Auth (via Admin API).
 *
 * O que NÃO é apagado (ressalvas Art. 16 LGPD):
 *  - Survey responses (já anônimas — não há vínculo com o usuário).
 *  - Action plans aprovados (registro de cumprimento de obrigação NR-1).
 *  - Company actions taken (histórico organizacional anonimizado).
 *
 * Self-delete: usuário só pode apagar a si mesmo. SUPER_ADMIN pode apagar
 * qualquer usuário (não implementado aqui — fluxo admin separado).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "EXCLUIR MEUS DADOS") {
    return NextResponse.json(
      {
        error:
          'Confirmação inválida. Envie { "confirm": "EXCLUIR MEUS DADOS" } no body.',
      },
      { status: 400 }
    );
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, auth_id, email, role")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!userData) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  // Use admin client para bypassar RLS no anonymization + delete do auth
  const admin = createAdminClient();

  // 1. Anonimiza chat_messages: substitui content do usuário por placeholder
  //    (mantém timestamp para integridade da thread)
  const { data: threadsToScrub } = await admin
    .from("chat_threads")
    .select("id")
    .eq("created_by_user_id", userData.id);
  const threadIds = (threadsToScrub ?? []).map((t) => t.id);
  if (threadIds.length > 0) {
    await admin
      .from("chat_messages")
      .update({
        content: "[mensagem removida a pedido do titular - LGPD Art. 18, VI]",
        metadata: null,
      })
      .in("thread_id", threadIds)
      .eq("role", "user");
  }

  // 2. Anonimiza profile_events
  await admin
    .from("profile_events")
    .update({
      confirmed_by_user_id: null,
      source_context: "[autor removido - LGPD]",
    })
    .eq("confirmed_by_user_id", userData.id);

  // 3. Anonimiza outcomes
  await admin
    .from("action_outcomes")
    .update({
      attribution_user_id: null,
      hr_notes: null,
    })
    .eq("attribution_user_id", userData.id);

  // 4. Apaga registro em `users`
  const { error: delErr } = await admin
    .from("users")
    .delete()
    .eq("id", userData.id);

  if (delErr) {
    return NextResponse.json(
      { error: `Falha na exclusão: ${delErr.message}` },
      { status: 500 }
    );
  }

  // 5. Apaga auth user (Supabase Auth)
  if (userData.auth_id) {
    try {
      await admin.auth.admin.deleteUser(userData.auth_id);
    } catch (err) {
      // Não é fatal — logamos mas seguimos. O user perde acesso de qualquer forma.
      console.error("Falha ao deletar auth user:", err);
    }
  }

  return NextResponse.json({
    status: "deleted",
    deleted_at: new Date().toISOString(),
    notes: [
      "Sua conta foi removida.",
      "Mensagens individuais de chat foram anonimizadas.",
      "Registros agregados (planos aprovados, ações tomadas, scores anônimos de pesquisa) foram mantidos para cumprir obrigações regulatórias (NR-1 / Lei 14.831).",
      "Faça logout e feche a sessão.",
    ],
  });
}
