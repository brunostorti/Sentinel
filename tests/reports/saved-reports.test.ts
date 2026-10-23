import { describe, it, expect } from "vitest";
import { parseSavedReports, savedReportsKey } from "@/lib/reports/saved-reports";

describe("parseSavedReports", () => {
  it("lê a lista e descarta itens inválidos", () => {
    const raw = JSON.stringify([
      { protocol: "DEN-2026-ABCD-EFGH", type: "Outro", sentOn: "2026-10-22" },
      { protocol: 123, type: "Outro", sentOn: "2026-10-22" },
      null,
    ]);
    expect(parseSavedReports(raw)).toEqual([
      { protocol: "DEN-2026-ABCD-EFGH", type: "Outro", sentOn: "2026-10-22" },
    ]);
  });

  it("não quebra com conteúdo corrompido", () => {
    expect(parseSavedReports("{")).toEqual([]);
    expect(parseSavedReports(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseSavedReports(null)).toEqual([]);
  });

  it("separa a lista por usuário", () => {
    expect(savedReportsKey("u1")).not.toBe(savedReportsKey("u2"));
  });
});
