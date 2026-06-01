"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendMagicLink(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Insira um email válido." };
  }

  // Use admin client to bypass RLS (user isn't authenticated yet)
  const admin = createAdminClient();

  // Check if this email is registered as an employee or survey participant
  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (!employee) {
    // Fallback: also check survey_participants (for legacy data)
    const { data: participant } = await admin
      .from("survey_participants")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (!participant) {
      // Antes de dizer "não cadastrado", checa se é uma conta administrativa
      // (HR/ADMIN/SUPER_ADMIN/MANAGER em users) — esses usam senha, não magic link.
      const { data: adminUser } = await admin
        .from("users")
        .select("role")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (adminUser) {
        const roleLabel: Record<string, string> = {
          SUPER_ADMIN: "Super Administrador",
          ADMIN: "Administrador",
          HR: "RH",
          MANAGER: "Gestor",
        };
        const label = roleLabel[adminUser.role] ?? adminUser.role;
        return {
          error: `Este e-mail é uma conta de ${label}. Use a aba "Administração" no topo da página e entre com sua senha.`,
        };
      }

      return { error: "Email não cadastrado na plataforma." };
    }
  }

  // Resolve the app origin for the redirect URL
  const headersList = await headers();
  const origin =
    headersList.get("x-forwarded-host")
      ? `${headersList.get("x-forwarded-proto") ?? "https"}://${headersList.get("x-forwarded-host")}`
      : headersList.get("origin") ?? "http://localhost:3000";

  // Send magic link via Supabase Auth
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/api/auth/callback?next=/pesquisas`,
    },
  });

  if (error) {
    return { error: "Erro ao enviar link. Tente novamente." };
  }

  return { success: true };
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Insira um email válido." };
  }
  if (!password) {
    return { error: "Insira sua senha." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { error: "Email ou senha incorretos." };
  }

  // Check user role to redirect appropriately
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Erro de autenticação." };

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) {
    return { error: "Conta não possui acesso administrativo." };
  }

  const redirect =
    userData.role === "SUPER_ADMIN" ? "/empresas" : "/inicio";

  return { success: true, redirect };
}
