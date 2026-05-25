import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/profile/historico
 *   → lista paginada de company_actions_taken
 *
 * POST /api/profile/historico
 *   Body: { id?, title, description?, universal_category_id?, year_started?, year_ended?, outcome?, outcome_notes? }
 *   - se body.id presente: UPDATE
 *   - senão: INSERT (source='manual_entry')
 *
 * DELETE /api/profile/historico?id=...
 *   apaga (apenas se source='manual_entry')
 */

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData)
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { data, error } = await supabase
    .from("company_actions_taken")
    .select("*, universal_categories(name, code)")
    .eq("company_id", userData.company_id!)
    .order("year_started", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ actions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    title: string;
    description?: string;
    universal_category_id?: string;
    year_started?: number;
    year_ended?: number;
    outcome?: string;
    outcome_notes?: string;
  };

  if (!body.title) {
    return NextResponse.json({ error: "title é obrigatório." }, { status: 400 });
  }

  if (body.id) {
    // UPDATE — só permite editar manual_entry e sentinel_*'s outcome_notes
    const { data: existing } = await supabase
      .from("company_actions_taken")
      .select("source")
      .eq("id", body.id)
      .eq("company_id", userData.company_id!)
      .single();
    if (!existing)
      return NextResponse.json(
        { error: "Ação não encontrada." },
        { status: 404 }
      );

    const patch: Record<string, unknown> = { outcome_notes: body.outcome_notes };
    if (existing.source === "manual_entry") {
      patch.title = body.title;
      patch.description = body.description;
      patch.universal_category_id = body.universal_category_id;
      patch.year_started = body.year_started;
      patch.year_ended = body.year_ended;
      patch.outcome = body.outcome;
    }

    const { error } = await supabase
      .from("company_actions_taken")
      .update(patch)
      .eq("id", body.id)
      .eq("company_id", userData.company_id!);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "updated" });
  }

  // INSERT
  const { data, error } = await supabase
    .from("company_actions_taken")
    .insert({
      company_id: userData.company_id!,
      title: body.title,
      description: body.description ?? null,
      universal_category_id: body.universal_category_id ?? null,
      year_started: body.year_started ?? null,
      year_ended: body.year_ended ?? null,
      outcome: body.outcome ?? "unknown",
      outcome_notes: body.outcome_notes ?? null,
      source: "manual_entry",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "created", id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

  const { error } = await supabase
    .from("company_actions_taken")
    .delete()
    .eq("id", id)
    .eq("company_id", userData.company_id!)
    .eq("source", "manual_entry");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "deleted" });
}
