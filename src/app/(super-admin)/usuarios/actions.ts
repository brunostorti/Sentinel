"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Endereço público do app para o link do convite. VERCEL_URL não serve: é o endereço
 * daquele deploy específico, que fica atrás do login da Vercel (proteção de deploys).
 */
function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

interface CreateUserPayload {
  name: string;
  email: string;
  role: "ADMIN" | "HR" | "MANAGER";
  companyId: string;
}

export async function createUser(payload: CreateUserPayload) {
  if (!payload.name.trim()) return { error: "Nome é obrigatório." };
  if (!payload.email.includes("@")) return { error: "Email inválido." };
  if (!payload.companyId) return { error: "Selecione uma empresa." };

  const supabase = await createClient();

  // Verify super admin
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  const { data: callerData } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", authData.user.id)
    .single();

  if (callerData?.role !== "SUPER_ADMIN") {
    return { error: "Sem permissão." };
  }

  const admin = createAdminClient();

  // Create auth user with magic link (they set password on first access)
  const { data: authUser, error: authError } =
    await admin.auth.admin.inviteUserByEmail(payload.email, {
      data: { name: payload.name, role: payload.role },
      redirectTo: `${appUrl()}/api/auth/callback?next=/definir-senha`,
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return { error: "Este email já possui uma conta." };
    }
    return { error: "Erro ao criar usuário. Tente novamente." };
  }

  if (!authUser.user) {
    return { error: "Erro ao criar usuário." };
  }

  // Create platform user record
  const { error: insertError } = await admin.from("users").insert({
    auth_id: authUser.user.id,
    company_id: payload.companyId,
    role: payload.role,
    email: payload.email,
    name: payload.name.trim(),
  });

  if (insertError) {
    // Cleanup: delete auth user if platform record fails
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: "Erro ao criar registro do usuário." };
  }

  return { success: true };
}
