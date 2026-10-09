import { describe, expect, it } from "vitest";
import { chunkDocument, cleanPages, countWords } from "@/lib/rag/chunking";

const words = (n: number, w = "palavra") => Array.from({ length: n }, () => w).join(" ");

describe("cleanPages", () => {
  it("remove números de página, sumário e cabeçalho repetido", () => {
    const body = ["Introdução ao tema.", "Conceito de perigo.", "Conceito de risco.", "Avaliação.", "Controle."];
    const pages = body.map((text, i) => [`Ministério do Trabalho — Manual ${i + 1}`, `${i + 1}`, text].join("\n"));
    pages[0] += "\n1. INTRODUÇÃO ........................ 7";
    const lines = cleanPages(pages).map((l) => l.text);
    expect(lines).toEqual(body);
  });

  it("descarta páginas de sumário inteiras e preserva º", () => {
    const toc = Array.from({ length: 6 }, (_, i) => `${i + 1}. Capítulo ${i + 1} ............ ${i + 3}`).join("\n");
    const lines = cleanPages([toc + "\n10.3 Requisitos sem número", "Art. 1º Esta Lei entra em vigor."]).map((l) => l.text);
    expect(lines).toEqual(["Art. 1º Esta Lei entra em vigor."]);
  });
});

describe("chunkDocument", () => {
  it("guarda a seção e as páginas de cada trecho", () => {
    const pages = [
      `11. PROCESSO DE AVALIAÇÃO\n11.2 Matriz de risco\nTexto ${words(60, "matriz")}.`,
      `${words(30, "continua")}.\n11.3 Gradação da severidade\nTexto ${words(60, "severidade")}.`,
    ];
    const chunks = chunkDocument(pages, { maxWords: 120, minWordsAtHeading: 40 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0].section).toBe("11. PROCESSO DE AVALIAÇÃO › 11.2 Matriz de risco");
    expect([chunks[0].pageStart, chunks[0].pageEnd]).toEqual([1, 2]);
    expect(chunks[1].section).toBe("11. PROCESSO DE AVALIAÇÃO › 11.3 Gradação da severidade");
    expect(chunks[1].content.startsWith("11.3 Gradação da severidade")).toBe(true);
  });

  it("trata itens de norma como parágrafos rotulados, não como títulos", () => {
    const page = [
      "1.5.7 Documentação",
      "1.5.7.1 O PGR deve conter, no mínimo, os seguintes documentos:",
      "a) inventário de riscos; e",
      "b) plano de ação.",
      "1.5.7.2 Os documentos integrantes do PGR devem ser elaborados sob a responsabilidade da",
      "organização, datados e assinados.",
    ].join("\n");
    const [chunk] = chunkDocument([page]);
    expect(chunk.section).toBe("1.5.7 Documentação › itens 1.5.7.1 a 1.5.7.2");
    expect(chunk.content).toContain("a) inventário de riscos; e");
    expect(chunk.content).toContain("responsabilidade da organização, datados");
  });

  it("reconhece perguntas numeradas que quebram de linha", () => {
    const page = [
      "3. A identificação de riscos psicossociais deve abranger trabalho remoto, híbrido",
      "e teletrabalho?",
      `Sim. ${words(20, "resposta")}.`,
    ].join("\n");
    const [chunk] = chunkDocument([page]);
    expect(chunk.section).toBe("3. A identificação de riscos psicossociais deve abranger trabalho remoto, híbrido e teletrabalho?");
  });

  it("junta palavra hifenizada na quebra só quando ela existe no documento", () => {
    const page = "O trabalhador participa. Todo trabalha-\ndor deve ser ouvido. O bem-\nestar importa.";
    const [chunk] = chunkDocument([page]);
    expect(chunk.content).toContain("Todo trabalhador deve");
    expect(chunk.content).toContain("bem-estar");
  });

  it("respeita o tamanho máximo dividindo parágrafos longos por frases", () => {
    const sentence = `${words(25, "termo")}.`;
    const page = Array.from({ length: 12 }, () => sentence).join(" ");
    const chunks = chunkDocument([page], { maxWords: 120, minWordsAtHeading: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(countWords(c.content)).toBeLessThanOrEqual(120);
  });
});
