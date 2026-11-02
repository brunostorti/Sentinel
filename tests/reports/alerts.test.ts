import { describe, expect, it } from "vitest";
import {
  computeSectorAlerts,
  normalizeAlertSettings,
  windowStart,
  todayInBrazil,
} from "@/lib/reports/alerts";

const s = { threshold: 3, windowDays: 90 };
const today = "2026-11-02";

describe("computeSectorAlerts", () => {
  it("2 casos não geram alerta; 3 geram", () => {
    const two = [
      { departmentId: "vendas", category: "Assédio moral", date: "2026-10-01" },
      { departmentId: "vendas", category: "Assédio moral", date: "2026-10-15" },
    ];
    expect(computeSectorAlerts(two, s, today)).toEqual([]);
    const three = [...two, { departmentId: "vendas", category: "Assédio moral", date: "2026-11-02T00:00:00+00:00" }];
    expect(computeSectorAlerts(three, s, today)).toEqual([
      { departmentId: "vendas", category: "Assédio moral", count: 3 },
    ]);
  });

  it("casos fora da janela não contam", () => {
    const cases = [
      { departmentId: "vendas", category: "Assédio moral", date: "2026-08-04" }, // 91 dias atrás
      { departmentId: "vendas", category: "Assédio moral", date: "2026-08-05" }, // 90º dia
      { departmentId: "vendas", category: "Assédio moral", date: "2026-10-01" },
    ];
    expect(computeSectorAlerts(cases, s, today)).toEqual([]);
    expect(computeSectorAlerts(cases, { threshold: 2, windowDays: 90 }, today)).toEqual([
      { departmentId: "vendas", category: "Assédio moral", count: 2 },
    ]);
  });

  it("separa por categoria e por setor e ignora casos sem setor", () => {
    const cases = [
      { departmentId: "vendas", category: "Assédio moral", date: "2026-10-01" },
      { departmentId: "vendas", category: "Discriminação", date: "2026-10-01" },
      { departmentId: "obra", category: "Assédio moral", date: "2026-10-01" },
      { departmentId: null, category: "Assédio moral", date: "2026-10-01" },
      { departmentId: null, category: "Assédio moral", date: "2026-10-02" },
    ];
    expect(computeSectorAlerts(cases, { threshold: 2, windowDays: 90 }, today)).toEqual([]);
  });
});

describe("normalizeAlertSettings", () => {
  it("aplica padrão e faixas", () => {
    expect(normalizeAlertSettings(undefined, null)).toEqual({ threshold: 3, windowDays: 90 });
    expect(normalizeAlertSettings(1, 1000)).toEqual({ threshold: 2, windowDays: 365 });
    expect(normalizeAlertSettings("5", "30")).toEqual({ threshold: 5, windowDays: 30 });
  });
});

describe("datas", () => {
  it("windowStart conta o dia de hoje", () => {
    expect(windowStart(today, 90)).toBe("2026-08-05");
    expect(windowStart(today, 1)).toBe(today);
  });
  it("todayInBrazil usa o fuso de São Paulo", () => {
    // 02:00 UTC de 03/11 ainda é 02/11 em Brasília (UTC-3)
    expect(todayInBrazil(new Date("2026-11-03T02:00:00Z"))).toBe("2026-11-02");
  });
});
