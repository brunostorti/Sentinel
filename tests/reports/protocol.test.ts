import { describe, it, expect } from "vitest";
import { generateProtocol, normalizeProtocol, PROTOCOL_ALPHABET } from "@/lib/reports/protocol";

describe("generateProtocol", () => {
  it("usa o formato DEN-AAAA-XXXX-XXXX com o ano de Brasília", () => {
    const p = generateProtocol(new Date("2027-03-10T12:00:00Z"));
    expect(p).toMatch(/^DEN-2027-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("usa o ano de Brasília na virada do ano (servidor em UTC)", () => {
    // 01/01/2027 01:00 UTC ainda é 31/12/2026 em Brasília
    expect(generateProtocol(new Date("2027-01-01T01:00:00Z"))).toMatch(/^DEN-2026-/);
  });

  it("nunca usa 0, O, 1 ou I", () => {
    expect(PROTOCOL_ALPHABET).not.toMatch(/[0O1I]/);
    expect(PROTOCOL_ALPHABET).toHaveLength(32);
    for (let i = 0; i < 200; i++) {
      // só os blocos aleatórios (o ano 2026 tem "0" e não conta)
      expect(generateProtocol().slice("DEN-AAAA-".length)).not.toMatch(/[0O1I]/);
    }
  });

  it("monta os blocos com a fonte de aleatoriedade recebida", () => {
    const p = generateProtocol(new Date("2026-06-01T12:00:00Z"), () => 0);
    expect(p).toBe("DEN-2026-2222-2222");
  });
});

describe("normalizeProtocol", () => {
  it("aceita o formato novo, ignorando espaços e minúsculas", () => {
    expect(normalizeProtocol(" den-2026-7kq4-m9xt ")).toBe("DEN-2026-7KQ4-M9XT");
  });

  it("continua aceitando protocolos antigos PROT-", () => {
    expect(normalizeProtocol("prot-2026-a1b2c3")).toBe("PROT-2026-A1B2C3");
    expect(normalizeProtocol("PROT-2026-DEMOBUSSOLA1")).toBe("PROT-2026-DEMOBUSSOLA1");
  });

  it("recusa texto que não é protocolo", () => {
    expect(normalizeProtocol("")).toBeNull();
    expect(normalizeProtocol(null)).toBeNull();
    expect(normalizeProtocol("DEN-2026-0000-1111")).toBeNull();
    expect(normalizeProtocol("DEN-2026-ABCD")).toBeNull();
    expect(normalizeProtocol("' OR 1=1 --")).toBeNull();
  });
});
