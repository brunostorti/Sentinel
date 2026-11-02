/* Painel Sentinel: tipos e checklist de implantação. Seguro para o navegador. */

export interface CompanyOverview {
  company_id: string;
  employees: number;
  departments: number;
  platform_users: number;
  documents: number;
  documents_ready: number;
  last_document_at: string | null;
  surveys: number;
  last_survey_title: string | null;
  last_survey_status: string | null;
  last_survey_at: string | null;
  last_survey_participants: number;
  last_survey_responses: number;
  plans_approved: number;
  plans_pending: number;
  reports_open: number;
  reports_total: number;
  leave_cases_30d: number;
  kanban_open: number;
  ai_key_configured: boolean;
}

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
}

/** Checklist calculado a partir dos agregados (nunca do conteúdo). */
export function onboardingSteps(o: CompanyOverview): OnboardingStep[] {
  return [
    { key: "users", label: "RH ou administrador cadastrado", done: o.platform_users > 0 },
    { key: "employees", label: "Colaboradores importados", done: o.employees > 0 },
    { key: "documents", label: "Documentos da empresa enviados", done: o.documents_ready > 0 },
    { key: "ai", label: "Chave de IA cadastrada", done: o.ai_key_configured },
    { key: "survey", label: "Pesquisa aberta", done: o.surveys > 0 },
    { key: "plan", label: "Plano de ação aprovado", done: o.plans_approved > 0 },
  ];
}

/** Taxa de resposta da última pesquisa, em %, ou null sem participantes. */
export function responseRate(o: Pick<CompanyOverview, "last_survey_participants" | "last_survey_responses">): number | null {
  if (!o.last_survey_participants) return null;
  return Math.min(100, Math.round((o.last_survey_responses / o.last_survey_participants) * 100));
}

/** Converte a linha do banco (contagens podem vir como string) para números. */
export function parseOverviewRow(row: Record<string, unknown>): CompanyOverview {
  const n = (v: unknown) => Number(v ?? 0) || 0;
  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    company_id: String(row.company_id),
    employees: n(row.employees),
    departments: n(row.departments),
    platform_users: n(row.platform_users),
    documents: n(row.documents),
    documents_ready: n(row.documents_ready),
    last_document_at: s(row.last_document_at),
    surveys: n(row.surveys),
    last_survey_title: s(row.last_survey_title),
    last_survey_status: s(row.last_survey_status),
    last_survey_at: s(row.last_survey_at),
    last_survey_participants: n(row.last_survey_participants),
    last_survey_responses: n(row.last_survey_responses),
    plans_approved: n(row.plans_approved),
    plans_pending: n(row.plans_pending),
    reports_open: n(row.reports_open),
    reports_total: n(row.reports_total),
    leave_cases_30d: n(row.leave_cases_30d),
    kanban_open: n(row.kanban_open),
    ai_key_configured: row.ai_key_configured === true,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CompanyCommercial {
  plan: string;
  sender_name: string | null;
  reply_to_email: string | null;
}

/** Valida plano, nome exibido e e-mail de resposta. */
export function normalizeCommercial(input: {
  plan?: string | null;
  senderName?: string | null;
  replyToEmail?: string | null;
}): { ok: true; value: CompanyCommercial } | { ok: false; error: string } {
  const plan = (input.plan ?? "").replace(/\s+/g, " ").trim().slice(0, 40) || "Piloto";
  const sender = (input.senderName ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || null;
  const reply = (input.replyToEmail ?? "").trim().toLowerCase().slice(0, 200) || null;
  if (reply && !EMAIL.test(reply)) return { ok: false, error: "E-mail de resposta inválido." };
  return { ok: true, value: { plan, sender_name: sender, reply_to_email: reply } };
}
