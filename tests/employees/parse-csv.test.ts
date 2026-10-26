import { describe, expect, it } from "vitest";
import { parseEmployeesCsv } from "@/lib/employees/parse-csv";

describe("parseEmployeesCsv", () => {
  it("formato antigo continua funcionando", () => {
    expect(parseEmployeesCsv("email,departamento,nome\nAna@x.com,RH,Ana")).toEqual([
      { email: "ana@x.com", department: "RH", name: "Ana", isThirdParty: false, thirdPartyCompany: undefined },
    ]);
  });

  it("sem cabeçalho, colunas por posição", () => {
    const [row] = parseEmployeesCsv("bia@x.com;Limpeza;Bia;sim;Limpa Bem");
    expect(row).toMatchObject({ isThirdParty: true, thirdPartyCompany: "Limpa Bem" });
  });

  it("com cabeçalho, em qualquer ordem e com acento", () => {
    const csv = "Empresa Prestadora,E-mail,Departamento\r\nTechStaff,caio@x.com,TI\r\n,duda@x.com,TI";
    const rows = parseEmployeesCsv(csv);
    expect(rows[0]).toMatchObject({ email: "caio@x.com", department: "TI", isThirdParty: true, thirdPartyCompany: "TechStaff" });
    expect(rows[1]).toMatchObject({ email: "duda@x.com", isThirdParty: false });
  });

  it("terceiro sem empresa e linhas sem e-mail ignoradas", () => {
    const rows = parseEmployeesCsv("email,departamento,nome,terceiro\neva@x.com,TI,,X\nsem-email,TI");
    expect(rows).toEqual([
      { email: "eva@x.com", department: "TI", name: undefined, isThirdParty: true, thirdPartyCompany: undefined },
    ]);
  });
});
