import { describe, expect, it } from "vitest";
import { anonymize, buildExamplePlanText, companyNameVariants, sizeBand } from "@/lib/rag/example-plans";

const company = {
  name: "Vértice Logística Integrada Ltda.",
  industry: "Logística e armazenagem",
  employeeCount: 59,
  workRegime: "hibrido",
  departmentNames: ["Operações CD", "Financeiro"],
};

describe("planos de exemplo anonimizados", () => {
  it("variações do nome da empresa", () => {
    expect(companyNameVariants(company.name)).toEqual(["Vértice Logística Integrada Ltda.", "Vértice Logística Integrada", "Vértice"]);
  });

  it("tira nome da empresa, setores e contagens de pessoas", () => {
    const text = anonymize("A Vértice vai treinar 13 colaboradores do Financeiro e da equipe de Operações CD da Vértice Logística Integrada.", company);
    expect(text).toBe("A empresa vai treinar colaboradores do grupo-alvo do setor e da equipe do setor da empresa.");
    expect(text).not.toMatch(/Vértice|Financeiro|Operações|13/);
  });

  it("monta o texto sem justificativa e com o resultado medido", () => {
    const text = buildExamplePlanText(
      {
        title: "Microtreinamento de gestão do tempo no Financeiro",
        dimension: "Ritmo de trabalho",
        riskLevel: "RED",
        status: "COMPLETED",
        recommendation: {
          rationale: "Pergunta real: 'Precisa trabalhar muito rapidamente?' no Financeiro da Vértice",
          quick_action: "Mapear picos de demanda com a equipe",
          leading_indicators: [{ metric: "Participação", target: ">=90%", measurement: "lista" }],
        },
        outcomeDelta: 7.6,
      },
      company
    );
    expect(text).toContain("Contexto: Logística e armazenagem; 50 a 249 trabalhadores; regime hibrido.");
    expect(text).toContain('dimensão "Ritmo de trabalho" em nível Risco');
    expect(text).toContain("Situação: concluído. Resultado: na reavaliação, a dimensão melhorou 8 pontos.");
    expect(text).toContain("Ação: Microtreinamento de gestão do tempo.");
    expect(text).not.toContain("Pergunta real");
    expect(text).not.toMatch(/Vértice|Financeiro/);
  });

  it("faixas de porte", () => {
    expect(sizeBand(12)).toBe("até 49 trabalhadores");
    expect(sizeBand(1200)).toBe("1.000 ou mais trabalhadores");
    expect(sizeBand(null)).toBe("porte não informado");
  });
});
