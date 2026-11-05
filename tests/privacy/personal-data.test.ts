import { describe, expect, it } from "vitest";
import { describeKinds, findPersonalData, isValidCpf } from "@/lib/privacy/personal-data";

describe("detector de dados pessoais", () => {
  it("reconhece CPF válido, com e sem pontuação", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(findPersonalData("meu cpf é 529.982.247-25").kinds).toEqual(["cpf"]);
  });

  it("ignora número de 11 dígitos que não é CPF nem telefone", () => {
    expect(findPersonalData("protocolo 12345678900 do caso").kinds).toEqual([]);
  });

  it("reconhece e-mail", () => {
    const r = findPersonalData("falar com joao.silva@empresa.com.br hoje");
    expect(r.kinds).toEqual(["email"]);
    expect(r.counts.email).toBe(1);
  });

  it("reconhece celular e fixo brasileiros", () => {
    expect(findPersonalData("me liga no (11) 98765-4321").kinds).toEqual(["phone"]);
    expect(findPersonalData("ramal +55 11 3456-7890").kinds).toEqual(["phone"]);
    expect(findPersonalData("11987654321").kinds).toEqual(["phone"]);
  });

  it("não marca datas, horários, valores e quantidades comuns", () => {
    const texto =
      "Em 12/03/2026 às 14:30 o gestor gritou com 3 pessoas. A meta subiu de 1.500 para 2.000 peças e o turno vai de 2025 a 2026.";
    expect(findPersonalData(texto).kinds).toEqual([]);
  });

  it("junta vários tipos", () => {
    const r = findPersonalData("cpf 529.982.247-25, email a@b.com, cel 11 98765 4321");
    expect(r.kinds).toEqual(["cpf", "email", "phone"]);
    expect(describeKinds(r.kinds)).toBe("CPF, e-mail e telefone");
  });
});
