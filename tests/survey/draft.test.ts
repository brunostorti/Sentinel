import { describe, it, expect } from "vitest";
import {
  parseDraft,
  countDraftAnswers,
  estimateMinutes,
  draftKey,
  describeDeadline,
  type DraftSchema,
} from "@/lib/survey/draft";

const SCHEMA: DraftSchema = [
  { id: "q1", values: [0, 25, 50, 75, 100] },
  { id: "q2", values: [0, 25, 50, 75, 100] },
  { id: "q3", values: [0, 50, 100] },
];

describe("parseDraft", () => {
  it("devolve o rascunho válido", () => {
    const raw = JSON.stringify({ answers: { q1: 25, q2: 100 }, index: 2, savedAt: "2026-10-22T10:00:00Z" });
    expect(parseDraft(raw, SCHEMA)).toEqual({
      answers: { q1: 25, q2: 100 },
      index: 2,
      savedAt: "2026-10-22T10:00:00Z",
    });
  });

  it("descarta perguntas que não existem e valores fora da escala", () => {
    const raw = JSON.stringify({ answers: { q1: 25, qX: 50, q3: 25, q2: "100" }, index: 1 });
    const draft = parseDraft(raw, SCHEMA);
    expect(draft?.answers).toEqual({ q1: 25 });
  });

  it("limita a posição ao tamanho da pesquisa", () => {
    const raw = JSON.stringify({ answers: { q1: 0 }, index: 99 });
    expect(parseDraft(raw, SCHEMA)?.index).toBe(2);
    expect(parseDraft(JSON.stringify({ answers: { q1: 0 }, index: -5 }), SCHEMA)?.index).toBe(0);
  });

  it("ignora conteúdo vazio, corrompido ou sem respostas aproveitáveis", () => {
    expect(parseDraft(null, SCHEMA)).toBeNull();
    expect(parseDraft("{nao é json", SCHEMA)).toBeNull();
    expect(parseDraft(JSON.stringify([1, 2]), SCHEMA)).toBeNull();
    expect(parseDraft(JSON.stringify({ answers: { qX: 0 } }), SCHEMA)).toBeNull();
  });
});

describe("utilitários do rascunho", () => {
  it("separa rascunhos por usuário e pesquisa", () => {
    expect(draftKey("u1", "s1")).not.toBe(draftKey("u2", "s1"));
    expect(draftKey("u1", "s1")).not.toBe(draftKey("u1", "s2"));
  });

  it("conta respostas sem quebrar com conteúdo inválido", () => {
    expect(countDraftAnswers(JSON.stringify({ answers: { a: 1, b: 2 } }))).toBe(2);
    expect(countDraftAnswers("lixo")).toBe(0);
    expect(countDraftAnswers(null)).toBe(0);
  });

  it("estima o tempo em minutos (mínimo 1)", () => {
    expect(estimateMinutes(41)).toBe(6);
    expect(estimateMinutes(119)).toBe(16);
    expect(estimateMinutes(1)).toBe(1);
  });
});

describe("describeDeadline", () => {
  const now = new Date("2026-10-22T15:00:00Z");

  it("mostra a data de Brasília e os dias que faltam", () => {
    expect(describeDeadline("2026-10-30T23:59:00-03:00", now)).toBe("Até 30/10 · faltam 8 dias");
  });

  it("conta dias do calendário, não blocos de 24 horas", () => {
    // vence hoje às 17h (Brasília): é "hoje", mesmo faltando poucas horas
    expect(describeDeadline("2026-10-22T20:00:00Z", now)).toBe("Encerra hoje (22/10)");
    expect(describeDeadline("2026-10-23T12:00:00Z", now)).toBe("Encerra amanhã (23/10)");
    // 01:00 UTC do dia 23 ainda é dia 22 em Brasília
    expect(describeDeadline("2026-10-23T01:00:00Z", now)).toBe("Encerra hoje (22/10)");
  });

  it("sem prazo, sem texto", () => {
    expect(describeDeadline(null, now)).toBeNull();
  });
});
