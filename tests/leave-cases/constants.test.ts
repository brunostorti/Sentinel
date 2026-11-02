import { describe, expect, it } from "vitest";
import { allowedMonths, formatMonth, isLeaveReason, normalizeMonth } from "@/lib/leave-cases/constants";

describe("afastamentos", () => {
  it("meses permitidos: atual e 12 para trás, virando o ano", () => {
    const m = allowedMonths("2026-02-10");
    expect(m[0]).toBe("2026-02-01");
    expect(m[1]).toBe("2026-01-01");
    expect(m[2]).toBe("2025-12-01");
    expect(m).toHaveLength(13);
    expect(m.at(-1)).toBe("2025-02-01");
  });

  it("normalizeMonth guarda só o mês e recusa fora da janela ou futuro", () => {
    expect(normalizeMonth("2026-10-17", "2026-11-02")).toBe("2026-10-01");
    expect(normalizeMonth("2026-12", "2026-11-02")).toBeNull();
    expect(normalizeMonth("2025-10", "2026-11-02")).toBeNull();
    expect(normalizeMonth("ontem", "2026-11-02")).toBeNull();
    expect(normalizeMonth(202610, "2026-11-02")).toBeNull();
  });

  it("motivo só da lista fechada", () => {
    expect(isLeaveReason("saude_mental")).toBe(true);
    expect(isLeaveReason("CID F32")).toBe(false);
  });

  it("formata o mês em português", () => {
    expect(formatMonth("2026-03-01")).toBe("março de 2026");
  });
});
