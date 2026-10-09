import { describe, expect, it } from "vitest";
import { CATALOG, filterAndAnnotate } from "@/lib/ai/knowledge-base/filters";
import type { ActionOutcome, CompanyProfile } from "@/lib/ai/profile/schema";

const profile = {} as CompanyProfile;

function outcome(over: Partial<ActionOutcome>): ActionOutcome {
  return {
    intervention_id: CATALOG[0].intervention_id,
    universal_category_id: null,
    delta: 10,
    delta_computed_at: "2026-10-01T00:00:00Z",
    hr_attribution: "high",
    ...over,
  } as ActionOutcome;
}

describe("filterAndAnnotate — aprendizado com resultados anteriores", () => {
  const worked = CATALOG[0];
  const sameCategory = CATALOG.find((iv) => iv.universal_category_code === worked.universal_category_code && iv !== worked)!;
  const otherCategory = CATALOG.find((iv) => iv.universal_category_code !== worked.universal_category_code)!;

  it("resultado bom favorece só a mesma categoria", () => {
    const annotated = filterAndAnnotate(CATALOG, profile, [outcome({ intervention_id: worked.intervention_id })], 100);
    const status = (id: string) => annotated.find((a) => a.intervention_id === id)!.status;
    expect(status(sameCategory.intervention_id)).toBe("preferred");
    expect(status(otherCategory.intervention_id)).toBe("candidate");
  });

  it("intervenção que não melhorou a dimensão é excluída", () => {
    const annotated = filterAndAnnotate(CATALOG, profile, [outcome({ intervention_id: worked.intervention_id, delta: -3, hr_attribution: null })], 100);
    expect(annotated.find((a) => a.intervention_id === worked.intervention_id)!.status).toBe("excluded");
  });
});
