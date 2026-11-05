import { describe, expect, it } from "vitest";
import { daysOverdue, isTaskOverdue, overdueLabel } from "@/lib/kanban/overdue";

describe("tarefa atrasada", () => {
  it("o dia do prazo ainda não é atraso", () => {
    expect(daysOverdue("2026-11-05", "2026-11-05")).toBe(0);
    expect(daysOverdue("2026-11-04", "2026-11-05")).toBe(1);
    expect(daysOverdue("2026-10-31", "2026-11-05")).toBe(5);
    expect(daysOverdue("2026-11-10", "2026-11-05")).toBe(0);
  });

  it("concluída ou sem prazo não fica atrasada", () => {
    expect(isTaskOverdue("2026-11-01", false, "2026-11-05")).toBe(true);
    expect(isTaskOverdue("2026-11-01", true, "2026-11-05")).toBe(false);
    expect(isTaskOverdue(null, false, "2026-11-05")).toBe(false);
  });

  it("rótulo", () => {
    expect(overdueLabel(1)).toBe("Atrasada há 1 dia");
    expect(overdueLabel(3)).toBe("Atrasada há 3 dias");
  });
});
