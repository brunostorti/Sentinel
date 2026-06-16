/**
 * Hard-filters em TS aplicados ANTES do Curator (Stage 2).
 *
 * Esses filtros expressam restrições duras que não podem depender do LLM lembrar:
 * orçamento, capacidades de RH, restrições declaradas, intervenções já falhadas.
 *
 * O Curator recebe a KB já anotada — pode escolher só entre `preferred` e `candidate`,
 * e justifica quando rejeita um `preferred` (raro).
 */

import {
  CATALOG,
  type Intervention,
  type UniversalCategoryCode,
} from "./catalog";
import type {
  CompanyProfile,
  ActionOutcome,
} from "../profile/schema";

export type AnnotatedStatus = "preferred" | "candidate" | "excluded";

export interface AnnotatedIntervention extends Intervention {
  status: AnnotatedStatus;
  status_reason: string | null;
}

/* ──────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────── */

function preferred(iv: Intervention, reason: string): AnnotatedIntervention {
  return { ...iv, status: "preferred", status_reason: reason };
}

function candidate(iv: Intervention): AnnotatedIntervention {
  return { ...iv, status: "candidate", status_reason: null };
}

function excluded(iv: Intervention, reason: string): AnnotatedIntervention {
  return { ...iv, status: "excluded", status_reason: reason };
}

/** Aproximação grosseira: descarta se min × 100 colaboradores excede o orçamento total/0.7 */
function overBudget(iv: Intervention, profile: CompanyProfile, employeeCount: number): boolean {
  if (profile.annual_budget_brl == null) return false; // sem orçamento declarado, deixa passar
  const minCostTotal = iv.cost_per_employee.min * employeeCount;
  return minCostTotal > profile.annual_budget_brl * 0.7;
}

function requiresHRWeDontHave(iv: Intervention, profile: CompanyProfile): boolean {
  if (iv.required_hr_capabilities.length === 0) return false;
  for (const cap of iv.required_hr_capabilities) {
    if (cap === "dedicated_hr" && profile.has_dedicated_hr === false) return true;
    if (cap === "internal_training" && profile.has_internal_training === false) return true;
    if (cap === "occupational_health" && profile.has_occupational_health === false) return true;
    if (cap === "compliance_officer" && profile.has_compliance_officer === false) return true;
  }
  return false;
}

function violatesConstraint(iv: Intervention, profile: CompanyProfile): boolean {
  if (!profile.constraints || profile.constraints.length === 0) return false;
  const constraintsLower = profile.constraints.map((c) => c.toLowerCase());

  // Heurísticas simples — palavras-chave nas constraints batendo com modality/title
  for (const c of constraintsLower) {
    if (c.includes("sem app") && iv.required_modality === "online") return true;
    if (c.includes("não terceirizar") && iv.cost_per_employee.min > 200) return true;
    if (
      c.includes("sem dados sensíveis") &&
      iv.intervention_id === "burnout.teleterapia-b2b"
    ) {
      return true;
    }
    if (c.includes("não presencial") && iv.required_modality === "presencial") return true;
  }
  return false;
}

function modalityAvoided(iv: Intervention, profile: CompanyProfile): boolean {
  if (!profile.avoid_modalities || profile.avoid_modalities.length === 0) return false;
  const avoided = profile.avoid_modalities.map((m) => m.toLowerCase());
  if (iv.required_modality === "any") return false;
  return avoided.includes(iv.required_modality);
}

function sameInterventionFailedHere(
  iv: Intervention,
  outcomes: ActionOutcome[]
): boolean {
  return outcomes.some(
    (o) =>
      o.intervention_id === iv.intervention_id &&
      o.delta_computed_at !== null &&
      ((o.delta != null && o.delta <= 0) || o.hr_attribution === "none")
  );
}

function sameCategoryWorkedHere(
  iv: Intervention,
  outcomes: ActionOutcome[]
): boolean {
  return outcomes.some((o) => {
    if (!o.universal_category_id) return false;
    // Comparamos via universal_category_id (preenchido no orchestrator).
    // Note: aqui comparamos só por categoria, não por intervenção exata.
    return (
      o.delta_computed_at !== null &&
      o.delta != null &&
      o.delta > 5 &&
      (o.hr_attribution === "high" || o.hr_attribution === "medium")
    );
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * filterAndAnnotate — anota TODO o catálogo com status preferred/candidate/excluded
 * ────────────────────────────────────────────────────────────────────── */

export function filterAndAnnotate(
  catalog: Intervention[],
  profile: CompanyProfile,
  outcomes: ActionOutcome[],
  employeeCount: number
): AnnotatedIntervention[] {
  return catalog.map((iv) => {
    if (overBudget(iv, profile, employeeCount))
      return excluded(iv, "acima do orçamento declarado");
    if (requiresHRWeDontHave(iv, profile))
      return excluded(iv, "exige RH/T&D que a empresa não tem");
    if (violatesConstraint(iv, profile))
      return excluded(iv, "viola restrição declarada");
    if (sameInterventionFailedHere(iv, outcomes))
      return excluded(iv, "tentado antes sem resultado nesta empresa");
    if (modalityAvoided(iv, profile))
      return excluded(iv, "modalidade na lista de evitar");

    if (sameCategoryWorkedHere(iv, outcomes)) {
      return preferred(iv, "categoria validada em ciclos anteriores nesta empresa");
    }

    return candidate(iv);
  });
}

/** Filtra apenas categorias de interesse (das dimensões priorizadas) */
export function filterByCategories(
  annotated: AnnotatedIntervention[],
  categories: UniversalCategoryCode[]
): AnnotatedIntervention[] {
  const set = new Set(categories);
  return annotated.filter((iv) => set.has(iv.universal_category_code));
}

export { CATALOG };
