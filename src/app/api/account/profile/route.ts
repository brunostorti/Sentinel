import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfilePayload = {
  name?: unknown;
};

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ProfilePayload;
  const name = normalizeName(body.name);

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Informe um nome com pelo menos 2 caracteres." },
      { status: 400 }
    );
  }

  if (name.length > 120) {
    return NextResponse.json(
      { error: "O nome deve ter no máximo 120 caracteres." },
      { status: 400 }
    );
  }

  const { data: userData, error: loadError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  if (!userData) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { name },
  });

  if (authUpdateError) {
    return NextResponse.json(
      { error: "Não foi possível atualizar os metadados de autenticação." },
      { status: 500 }
    );
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ name })
    .eq("id", userData.id)
    .select("name, email, role")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: updatedUser,
  });
}
