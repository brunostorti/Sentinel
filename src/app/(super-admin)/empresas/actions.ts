"use server";

import { createClient } from "@/lib/supabase/server";

interface CreateCompanyPayload {
  name: string;
  cnpj: string | null;
  industry: string | null;
  employeeCount: number | null;
  workRegime: "presencial" | "remoto" | "hibrido" | null;
}

export async function createCompany(payload: CreateCompanyPayload) {
  if (!payload.name.trim()) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Não autenticado." };

  // Verify super admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", authData.user.id)
    .single();

  if (userData?.role !== "SUPER_ADMIN") {
    return { error: "Sem permissão." };
  }

  const { error } = await supabase.from("companies").insert({
    name: payload.name.trim(),
    cnpj: payload.cnpj,
    industry: payload.industry,
    employee_count: payload.employeeCount,
    work_regime: payload.workRegime,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "CNPJ já cadastrado." };
    }
    return { error: "Erro ao criar empresa. Tente novamente." };
  }

  return { success: true };
}
