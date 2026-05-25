import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCompleteness } from "@/lib/ai/profile/completeness";
import type { CompanyProfile } from "@/lib/ai/profile/schema";

/**
 * POST /api/profile/update
 *
 * Body: { profile: Partial<CompanyProfile>, touchedReviewFields?: ('regions' | 'constraints' | 'preferred_modalities' | 'workforce_composition')[] }
 *
 * Salva o perfil e:
 *  - Atualiza *_reviewed_at para campos em touchedReviewFields
 *  - Recalcula setup_completeness
 *  - Auto-rejeita profile_events pendentes para campos que foram alterados
 *    (event_type='ai_suggestion_superseded_by_manual_edit')
 */

type ReviewKey = "regions" | "constraints" | "preferred_modalities" | "workforce_composition";

const REVIEW_KEY_TO_COL: Record<ReviewKey, keyof CompanyProfile> = {
  regions: "regions_reviewed_at",
  constraints: "constraints_reviewed_at",
  preferred_modalities: "preferred_modalities_reviewed_at",
  workforce_composition: "workforce_composition_reviewed_at",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const body = (await req.json()) as {
    profile: Partial<CompanyProfile>;
    touchedReviewFields?: ReviewKey[];
    company?: {
      name?: string;
      industry?: string | null;
      employee_count?: number | null;
      work_regime?: string | null;
    };
  };

  // Carrega perfil atual (necessário pro completeness e pro diff)
  const { data: currentProfile, error: loadErr } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("company_id", userData.company_id!)
    .single();
  if (loadErr || !currentProfile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Merge: campos enviados sobrescrevem, demais ficam
  const merged: CompanyProfile = { ...(currentProfile as CompanyProfile), ...body.profile };

  // Aplica flags *_reviewed_at
  if (body.touchedReviewFields) {
    for (const key of body.touchedReviewFields) {
      const col = REVIEW_KEY_TO_COL[key];
      (merged as unknown as Record<string, unknown>)[col] = now;
    }
  }

  merged.setup_completeness = computeCompleteness(merged);
  merged.updated_at = now;

  // Detecta campos efetivamente alterados (para auto-rejeitar profile_events pendentes)
  const changedFields: string[] = [];
  for (const key of Object.keys(body.profile)) {
    if (key === "id" || key === "company_id" || key === "created_at") continue;
    const before = (currentProfile as unknown as Record<string, unknown>)[key];
    const after = (merged as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changedFields.push(key);
    }
  }

  // Persiste o perfil
  const { error: updErr } = await supabase
    .from("company_profiles")
    .update(merged)
    .eq("company_id", userData.company_id!);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Persiste dados básicos da empresa (aba "Empresa")
  if (body.company) {
    const companyPatch: Record<string, unknown> = {};
    if (typeof body.company.name === "string" && body.company.name.trim()) {
      companyPatch.name = body.company.name.trim();
    }
    if (body.company.industry !== undefined) {
      companyPatch.industry = body.company.industry;
    }
    if (body.company.employee_count !== undefined) {
      companyPatch.employee_count = body.company.employee_count;
    }
    if (body.company.work_regime !== undefined) {
      companyPatch.work_regime = body.company.work_regime;
    }
    if (Object.keys(companyPatch).length > 0) {
      companyPatch.updated_at = now;
      const { error: compErr } = await supabase
        .from("companies")
        .update(companyPatch)
        .eq("id", userData.company_id!);
      if (compErr) {
        return NextResponse.json(
          { error: `Perfil salvo, mas falha ao atualizar dados da empresa: ${compErr.message}` },
          { status: 500 }
        );
      }
    }
  }

  // Auto-rejeita profile_events pendentes em conflito (mesmo field_path)
  if (changedFields.length > 0) {
    await supabase
      .from("profile_events")
      .update({
        rejected_at: now,
        event_type: "ai_suggestion_superseded_by_manual_edit",
      })
      .eq("company_id", userData.company_id!)
      .in("field_path", changedFields)
      .is("confirmed_at", null)
      .is("rejected_at", null);
  }

  return NextResponse.json({
    success: true,
    setup_completeness: merged.setup_completeness,
  });
}
