import { describe, expect, it } from "vitest";
import {
  canonicalCompany,
  findExactCompany,
  findSimilarCompany,
  isSimilarCompany,
  matchCompanies,
  uniqueCompanies,
} from "@/lib/third-party/company-names";

const EXISTING = ["Limpa Bem Serviços Ltda.", "Segurança Total S.A.", "TechStaff"];

describe("isSimilarCompany", () => {
  it("ignora maiúsculas, acentos, espaços e sufixos", () => {
    expect(isSimilarCompany("LimpaBem", "Limpa Bem Serviços Ltda.")).toBe(true);
    expect(isSimilarCompany("seguranca total", "Segurança Total S.A.")).toBe(true);
  });
  it("tolera erro de digitação", () => {
    expect(isSimilarCompany("Tech Staf", "TechStaff")).toBe(true);
    expect(isSimilarCompany("Limpa Bemm", "Limpa Bem Ltda")).toBe(true);
  });
  it("não junta empresas diferentes", () => {
    expect(isSimilarCompany("Limpa Mais", "Limpa Bem Serviços Ltda.")).toBe(false);
    expect(isSimilarCompany("Alfa", "Beta")).toBe(false);
  });
});

describe("findExactCompany / canonicalCompany", () => {
  it("reconhece a mesma grafia sem acento e espaço", () => {
    expect(findExactCompany("techstaff", EXISTING)).toBe("TechStaff");
    expect(canonicalCompany(" SEGURANÇA TOTAL S.A. ", EXISTING)).toBe("Segurança Total S.A.");
  });
  it("mantém nome novo e vazio vira null", () => {
    expect(canonicalCompany("Nova Empresa", EXISTING)).toBe("Nova Empresa");
    expect(canonicalCompany("   ", EXISTING)).toBeNull();
  });
});

describe("findSimilarCompany", () => {
  it("sugere a parecida, mas não a idêntica", () => {
    expect(findSimilarCompany("LimpaBem", EXISTING)).toBe("Limpa Bem Serviços Ltda.");
    expect(findSimilarCompany("TechStaff", EXISTING)).toBeNull();
    expect(findSimilarCompany("Zeta", EXISTING)).toBeNull();
  });
});

describe("matchCompanies / uniqueCompanies", () => {
  it("autocomplete por início e por trecho", () => {
    expect(matchCompanies("lim", EXISTING)).toEqual(["Limpa Bem Serviços Ltda."]);
    expect(matchCompanies("total", EXISTING)).toEqual(["Segurança Total S.A."]);
    expect(matchCompanies("", EXISTING)).toEqual([]);
  });
  it("remove duplicatas de grafia", () => {
    expect(uniqueCompanies(["TechStaff", "techstaff", null, "Alfa"])).toEqual(["Alfa", "TechStaff"]);
  });
});
