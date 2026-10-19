import { describe, expect, it } from "vitest";
import { parseEmailLinkType, safeNext } from "@/lib/auth/email-link";

describe("safeNext", () => {
  it("aceita caminhos internos, com query", () => {
    expect(safeNext("/pesquisas", "/inicio")).toBe("/pesquisas");
    expect(safeNext("/denuncia/nova?companyId=abc", "/inicio")).toBe("/denuncia/nova?companyId=abc");
  });

  it("recusa destinos externos", () => {
    for (const raw of ["//evil.com", "/\\evil.com", "https://evil.com", "@evil.com", "evil.com", "/%5Cevil.com/../x"]) {
      const out = safeNext(raw, "/inicio");
      expect(out.startsWith("/")).toBe(true);
      expect(out.startsWith("//")).toBe(false);
      expect(out).not.toContain("evil.com/");
    }
    expect(safeNext("//evil.com", "/inicio")).toBe("/inicio");
    expect(safeNext("/\\evil.com", "/inicio")).toBe("/inicio");
    expect(safeNext("https://evil.com", "/inicio")).toBe("/inicio");
  });

  it("usa o padrão quando vazio", () => {
    expect(safeNext(null, "/pesquisas")).toBe("/pesquisas");
    expect(safeNext("", "/pesquisas")).toBe("/pesquisas");
  });
});

describe("parseEmailLinkType", () => {
  it("aceita só os tipos de link usados pelo app", () => {
    expect(parseEmailLinkType("email")).toBe("email");
    expect(parseEmailLinkType("invite")).toBe("invite");
    expect(parseEmailLinkType("recovery")).toBeNull();
    expect(parseEmailLinkType("email_change")).toBeNull();
    expect(parseEmailLinkType(null)).toBeNull();
  });
});
