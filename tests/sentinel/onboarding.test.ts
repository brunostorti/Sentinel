import { describe, expect, it } from "vitest";
import { normalizeCommercial, onboardingSteps, parseOverviewRow, responseRate } from "@/lib/sentinel/onboarding";

const row = {
  company_id: "c1", employees: "120", departments: 6, platform_users: 2, documents: 3, documents_ready: 2,
  last_document_at: "2026-10-30T12:00:00Z", surveys: 1, last_survey_title: "Ciclo 1", last_survey_status: "ACTIVE",
  last_survey_at: "2026-10-31T00:00:00Z", last_survey_participants: 120, last_survey_responses: 90,
  plans_approved: 0, plans_pending: 4, reports_open: 1, reports_total: 2, leave_cases_30d: 0, kanban_open: 3,
  ai_key_configured: true,
};

describe("painel sentinel", () => {
  it("converte contagens e calcula a taxa de resposta", () => {
    const o = parseOverviewRow(row);
    expect(o.employees).toBe(120);
    expect(responseRate(o)).toBe(75);
    expect(responseRate({ last_survey_participants: 0, last_survey_responses: 0 })).toBeNull();
  });

  it("checklist marca só o que foi feito", () => {
    const steps = onboardingSteps(parseOverviewRow(row));
    expect(steps.filter((s) => s.done).map((s) => s.key)).toEqual(["users", "employees", "documents", "ai", "survey"]);
    expect(steps.find((s) => s.key === "plan")?.done).toBe(false);
  });

  it("ai_key_configured só é verdadeiro com true explícito", () => {
    expect(parseOverviewRow({ ...row, ai_key_configured: "true" }).ai_key_configured).toBe(false);
  });

  it("valida plano e e-mail de resposta", () => {
    expect(normalizeCommercial({ plan: "  ", senderName: "", replyToEmail: "" })).toEqual({
      ok: true,
      value: { plan: "Piloto", sender_name: null, reply_to_email: null },
    });
    expect(normalizeCommercial({ plan: "Contratado", replyToEmail: "RH@Osborne.com.br" })).toEqual({
      ok: true,
      value: { plan: "Contratado", sender_name: null, reply_to_email: "rh@osborne.com.br" },
    });
    expect(normalizeCommercial({ replyToEmail: "rh@" }).ok).toBe(false);
  });
});
