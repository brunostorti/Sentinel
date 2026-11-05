import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement("span", null, children),
}));
vi.mock("@/app/(dashboard)/configuracoes/perfil/profile-form", () => ({
  ProfileForm: ({ initialProfile, initialCompany }: {
    initialProfile: { annual_budget_brl: number };
    initialCompany: { name: string };
  }) => React.createElement("div", null, `${initialCompany.name}: orçamento ${initialProfile.annual_budget_brl}`),
}));
vi.mock("@/app/(dashboard)/configuracoes/perfil/alert-settings", () => ({
  AlertSettings: ({ initialThreshold, initialWindowDays }: {
    initialThreshold: number;
    initialWindowDays: number;
  }) => React.createElement("div", null, `Alertas: ${initialThreshold} em ${initialWindowDays}`),
}));

import ProfilePage from "@/app/(dashboard)/configuracoes/perfil/page";

const permissionError = { code: "42501", message: "permission denied for table companies" };

function mockSettings({ alertError = null, profileError = null, missingProfile = false }: {
  alertError?: typeof permissionError | null;
  profileError?: typeof permissionError | null;
  missingProfile?: boolean;
} = {}) {
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "rh-1" } } }) },
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string) => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { company_id: "company-1", role: "HR" } }),
          maybeSingle: vi.fn().mockResolvedValue(
            table === "company_profiles"
              ? { data: profileError || missingProfile ? null : { annual_budget_brl: 180000 }, error: profileError }
              : columns === "report_alert_threshold, report_alert_window_days"
                ? { data: alertError ? null : { report_alert_threshold: 4, report_alert_window_days: 120 }, error: alertError }
                : { data: { id: "company-1", name: "Vértice", cnpj: null, industry: null, employee_count: 59, work_regime: null }, error: null }
          ),
        })),
      })),
    })),
  });
}

describe("carregamento das configurações da empresa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
  });
  afterEach(() => vi.restoreAllMocks());

  it("preserva o perfil e o orçamento quando os ajustes de alerta não têm permissão", async () => {
    mockSettings({ alertError: permissionError });
    const html = renderToStaticMarkup(await ProfilePage());
    expect(html).toContain("Vértice: orçamento 180000");
    expect(html).toContain("As demais configurações da empresa continuam disponíveis");
    expect(html).not.toContain("Perfil da empresa não encontrado");
    expect(html).not.toContain("Alertas:");
  });

  it("carrega os valores reais do alerta quando há permissão", async () => {
    mockSettings();
    const html = renderToStaticMarkup(await ProfilePage());
    expect(html).toContain("Vértice: orçamento 180000");
    expect(html).toContain("Alertas: 4 em 120");
  });

  it("diferencia falha de consulta de um perfil inexistente", async () => {
    mockSettings({ profileError: permissionError });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToStaticMarkup(await ProfilePage());
    expect(html).toContain("Não foi possível carregar as configurações da empresa");
    expect(html).not.toContain("Perfil da empresa não encontrado");
    expect(html).not.toContain("orçamento");
  });

  it("continua informando quando o perfil realmente não existe", async () => {
    mockSettings({ missingProfile: true });
    const html = renderToStaticMarkup(await ProfilePage());
    expect(html).toContain("Perfil da empresa não encontrado");
    expect(html).not.toContain("orçamento");
  });
});
