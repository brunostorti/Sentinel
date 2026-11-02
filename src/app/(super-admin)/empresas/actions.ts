"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMasterAdmin, logAdminAction } from "@/lib/sentinel/server";
import { normalizeCommercial } from "@/lib/sentinel/onboarding";

interface CreateCompanyPayload {
  name: string;
  cnpj: string | null;
  industry: string | null;
  employeeCount: number | null;
  workRegime: "presencial" | "remoto" | "hibrido" | null;
  plan?: string | null;
  senderName?: string | null;
  replyToEmail?: string | null;
}

export async function createCompany(payload: CreateCompanyPayload) {
  if (!payload.name.trim()) {
    return { error: "Nome é obrigatório." };
  }

  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };

  const commercial = normalizeCommercial(payload);
  if (!commercial.ok) return { error: commercial.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: payload.name.trim(),
      cnpj: payload.cnpj,
      industry: payload.industry,
      employee_count: payload.employeeCount,
      work_regime: payload.workRegime,
      ...commercial.value,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "CNPJ já cadastrado." };
    }
    return { error: "Erro ao criar empresa. Tente novamente." };
  }

  await logAdminAction(admin.id, "company.create", data.id as string, {
    name: payload.name.trim(),
    plan: commercial.value.plan,
  });
  revalidatePath("/empresas");
  return { success: true, id: data.id as string };
}

/** Plano, nome exibido e e-mail de resposta da empresa. */
export async function updateCompanyCommercial(
  companyId: string,
  input: { plan: string; senderName: string; replyToEmail: string }
) {
  const admin = await getMasterAdmin();
  if (!admin) return { error: "Sem permissão." };

  const commercial = normalizeCommercial(input);
  if (!commercial.ok) return { error: commercial.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ ...commercial.value, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  await logAdminAction(admin.id, "company.update_commercial", companyId, commercial.value as unknown as Record<string, unknown>);
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/empresas");
  return { success: true };
}
