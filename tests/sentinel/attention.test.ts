import { describe, expect, it } from "vitest";
import { companyAlerts, formatTokens, summarizeAiUsage } from "@/lib/sentinel/attention";
import { parseOverviewRow } from "@/lib/sentinel/onboarding";

const now = new Date("2026-11-20T12:00:00Z");
const overview = parseOverviewRow({
  company_id: "c1", employees: 100, departments: 5, platform_users: 2, documents: 2, documents_ready: 2,
  last_document_at: null, surveys: 1, last_survey_title: "Ciclo 1", last_survey_status: "ACTIVE",
  last_survey_at: "2026-11-05T12:00:00Z", last_survey_participants: 100, last_survey_responses: 10,
  plans_approved: 0, plans_pending: 1, reports_open: 1, reports_total: 1, leave_cases_30d: 0, kanban_open: 0,
  ai_key_configured: false,
});
const attention = {
  company_id: "c1",
  reports_stale: 2,
  plans_pending_oldest_at: "2026-10-30T12:00:00Z",
  documents_error: 1,
  tasks_overdue: 3,
};

describe("alertas do painel master", () => {
  it("lista o que pede ação, urgentes primeiro", () => {
    const alerts = companyAlerts(overview, attention, now);
    expect(alerts.map((a) => a.key)).toEqual([
      "reports_stale",
      "no_ai_key",
      "low_response",
      "plans_pending",
      "documents_error",
      "tasks_overdue",
    ]);
    expect(alerts[0].text).toBe("2 denúncias paradas há mais de 7 dias");
    expect(alerts[2].text).toBe("Pesquisa aberta há 15 dias com 10% de resposta");
    expect(alerts[3].text).toBe("Plano aguardando revisão há 21 dias");
  });

  it("empresa em dia não gera alerta", () => {
    const ok = { ...overview, ai_key_configured: true, last_survey_responses: 80 };
    const calm = { ...attention, reports_stale: 0, plans_pending_oldest_at: null, documents_error: 0, tasks_overdue: 0 };
    expect(companyAlerts(ok, calm, now)).toEqual([]);
  });

  it("pesquisa recém-aberta ainda não alerta adesão baixa", () => {
    const fresh = { ...overview, ai_key_configured: true, last_survey_at: "2026-11-18T12:00:00Z" };
    expect(companyAlerts(fresh, null, now).map((a) => a.key)).toEqual([]);
  });
});

describe("custo de IA", () => {
  it("estima pelo preço de referência e trata a Mauá como gratuita", () => {
    const s = summarizeAiUsage([
      { company_id: "c1", model: "claude-opus-5-5", calls: 2, input_tokens: 1_000_000, output_tokens: 100_000 },
      { company_id: "c1", model: "maua", calls: 10, input_tokens: 50_000, output_tokens: 5_000 },
    ]);
    expect(s.calls).toBe(12);
    expect(s.costUsd).toBeGreaterThan(0);
    expect(s.partial).toBe(false);
  });

  it("modelo sem preço marca a estimativa como parcial", () => {
    const s = summarizeAiUsage([{ company_id: "c1", model: "modelo-x", calls: 1, input_tokens: 10, output_tokens: 10 }]);
    expect(s.costUsd).toBeNull();
    expect(s.partial).toBe(true);
  });

  it("formata tokens", () => {
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(12_400)).toBe("12 mil");
    expect(formatTokens(2_500_000)).toBe("2,5 mi");
  });
});
