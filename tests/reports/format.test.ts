import { describe, it, expect } from "vitest";
import { formatReportDay, reportStatus } from "@/lib/reports/format";

describe("formatReportDay", () => {
  it("mostra o dia gravado pelo banco (meia-noite de Brasília) sem voltar um dia", () => {
    expect(formatReportDay("2026-10-22T03:00:00+00:00")).toBe("22 de outubro de 2026");
  });

  it("aceita o dia guardado no aparelho", () => {
    expect(formatReportDay("2026-01-01")).toBe("1 de janeiro de 2026");
  });

  it("devolve o texto original se não for data", () => {
    expect(formatReportDay("ontem")).toBe("ontem");
  });
});

describe("reportStatus", () => {
  it("traduz os status conhecidos e não quebra com outros", () => {
    expect(reportStatus("PENDING").label).toBe("Em análise");
    expect(reportStatus("RESOLVED").label).toBe("Finalizada");
    expect(reportStatus("OUTRO").label).toBe("OUTRO");
  });
});
