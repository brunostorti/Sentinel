import { describe, expect, it } from "vitest";
import { isStaleReport, reportAgeDays, STALE_REPORT_DAYS } from "@/lib/reports/stale";

const now = new Date("2026-11-20T15:00:00Z");

describe("denúncia parada", () => {
  it("conta os dias desde o recebimento", () => {
    expect(reportAgeDays("2026-11-13T03:00:00Z", now)).toBe(7);
    expect(reportAgeDays("2026-11-20T03:00:00Z", now)).toBe(0);
  });

  it(`fica parada com ${STALE_REPORT_DAYS}+ dias ainda aguardando`, () => {
    expect(isStaleReport("PENDING", "2026-11-13T03:00:00Z", now)).toBe(true);
    expect(isStaleReport("PENDING", "2026-11-15T03:00:00Z", now)).toBe(false);
  });

  it("em andamento ou concluída nunca fica parada", () => {
    expect(isStaleReport("IN_PROGRESS", "2026-10-01T03:00:00Z", now)).toBe(false);
    expect(isStaleReport("RESOLVED", "2026-10-01T03:00:00Z", now)).toBe(false);
  });
});
