import { describe, expect, it } from "vitest";
import { eventsRange, eventsToCsv, parseEventsFilter } from "@/lib/rag/document-events-filter";

describe("filtro do registro de atividades", () => {
  it("sem filtro válido, mostra os últimos 50", () => {
    expect(parseEventsFilter(new URLSearchParams())).toEqual({ mode: "recent" });
    expect(parseEventsFilter(new URLSearchParams("mode=month&year=2026&month=13"))).toEqual({ mode: "recent" });
    expect(parseEventsFilter(new URLSearchParams("mode=period&from=2026-02-10&to=2026-02-01"))).toEqual({ mode: "recent" });
    expect(eventsRange({ mode: "recent" })).toBeNull();
  });

  it("mês vira o intervalo do mês em Brasília (dezembro passa o ano)", () => {
    const f = parseEventsFilter(new URLSearchParams("mode=month&year=2026&month=12"));
    expect(eventsRange(f)).toEqual({ from: "2026-12-01T00:00:00-03:00", to: "2027-01-01T00:00:00-03:00" });
  });

  it("período inclui o último dia", () => {
    const f = parseEventsFilter(new URLSearchParams("mode=period&from=2026-11-01&to=2026-11-30"));
    expect(eventsRange(f)).toEqual({ from: "2026-11-01T00:00:00-03:00", to: "2026-12-01T00:00:00-03:00" });
  });

  it("CSV com ponto e vírgula, aspas escapadas e sem fórmula", () => {
    const csv = eventsToCsv([
      {
        created_at: "2026-11-05T14:30:00Z",
        actor: "Maria",
        action: "usage_change",
        document_title: 'Política "A"; versão 2',
        details: { from: "Chat e planos de ação", to: "Somente chat" },
      },
      { created_at: "2026-11-05T14:31:00Z", actor: null, action: "upload", document_title: "=SOMA(1)", details: {} },
    ]);
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe("Data e hora;Usuário;Ação;Documento;Detalhes");
    expect(lines[1]).toContain('"Política ""A""; versão 2"');
    expect(lines[1]).toContain("Chat e planos de ação → Somente chat");
    expect(lines[2]).toContain("'=SOMA(1)");
    expect(lines[2]).toContain("Usuário removido");
  });
});
