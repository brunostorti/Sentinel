/**
 * Cálculo de setup_completeness (0-100).
 *
 * Conta campos obrigatórios preenchidos + flags de revisão (HR ativamente clicou
 * em "Salvar" mesmo se array ficou vazio).
 */

import type { CompanyProfile } from "./schema";

const REQUIRED_FIELDS: (keyof CompanyProfile)[] = [
  "annual_budget_brl",
  "budget_horizon",
  "has_dedicated_hr",
  "decision_speed",
  "culture_type",
  "predominant_role_type",
  "has_remote",
  "has_shift_workers",
];

const REVIEWED_FLAGS: (keyof CompanyProfile)[] = [
  "regions_reviewed_at",
  "constraints_reviewed_at",
  "preferred_modalities_reviewed_at",
  "workforce_composition_reviewed_at",
];

export function computeCompleteness(profile: CompanyProfile): number {
  const required = REQUIRED_FIELDS.map(
    (k) => profile[k] !== null && profile[k] !== undefined
  );
  const reviewed = REVIEWED_FLAGS.map((k) => profile[k] !== null);
  const all = [...required, ...reviewed];
  if (all.length === 0) return 0;
  return Math.round((all.filter(Boolean).length / all.length) * 100);
}
