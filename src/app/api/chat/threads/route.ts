import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateThread, loadHistory } from "@/lib/ai/chat/thread";

/**
 * GET /api/chat/threads?kind=plan|company&resource_id=...
 * Retorna a thread (criando se não existir) + histórico de mensagens.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData || !userData.company_id)
    return NextResponse.json({ error: "Sem empresa." }, { status: 403 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as "plan" | "company" | null;
  const resource_id = url.searchParams.get("resource_id");
  if (!kind || (kind !== "plan" && kind !== "company")) {
    return NextResponse.json({ error: "kind inválido." }, { status: 400 });
  }

  const thread = await getOrCreateThread(supabase, {
    companyId: userData.company_id,
    userId: userData.id,
    kind,
    resourceId: kind === "plan" ? resource_id : null,
  });

  const messages = await loadHistory(supabase, thread.id);
  return NextResponse.json({ thread, messages });
}
