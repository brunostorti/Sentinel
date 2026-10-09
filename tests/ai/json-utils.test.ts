import { describe, expect, it } from "vitest";
import { extractJsonArray, extractJsonObject } from "@/lib/ai/pipeline/json-utils";

describe("extractJsonObject", () => {
  it("lê JSON puro", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("lê JSON dentro de bloco ```json", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignora texto antes do JSON", () => {
    expect(extractJsonObject('Segue a seleção:\n{"a":1}')).toEqual({ a: 1 });
  });

  it("ignora texto depois do JSON", () => {
    expect(extractJsonObject('{"a":1}\n\nObservação: escolhi a opção mais barata.')).toEqual({ a: 1 });
  });

  it("ignora texto antes e depois de um bloco ```json", () => {
    const raw = 'Aqui está:\n```json\n{"a":{"b":[1,2]}}\n```\nQualquer dúvida, avise.';
    expect(extractJsonObject(raw)).toEqual({ a: { b: [1, 2] } });
  });

  it("não se confunde com chaves e aspas dentro de strings", () => {
    const raw = '{"motivo":"usa {chaves} e \\"aspas\\" no texto"} fim';
    expect(extractJsonObject(raw)).toEqual({ motivo: 'usa {chaves} e "aspas" no texto' });
  });

  it("devolve null sem JSON ou com JSON truncado", () => {
    expect(extractJsonObject("sem json aqui")).toBeNull();
    expect(extractJsonObject('{"a":1,"b":')).toBeNull();
  });
});

describe("extractJsonArray", () => {
  it("lê array com texto depois", () => {
    expect(extractJsonArray('[{"a":1},{"a":2}]\nFim.')).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("recupera os itens completos de um array truncado", () => {
    expect(extractJsonArray('[{"a":1},{"a":2},{"a":')).toEqual([{ a: 1 }, { a: 2 }]);
  });
});
