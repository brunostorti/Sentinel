import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as PasswordPayload;
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json(
      { error: "Informe a senha atual." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "A nova senha precisa ser diferente da senha atual." },
      { status: 400 }
    );
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: currentPassword,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Senha atual incorreta." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { error: "Não foi possível atualizar a senha." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    updated_at: new Date().toISOString(),
  });
}
