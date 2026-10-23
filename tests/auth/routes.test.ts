import { describe, it, expect } from "vitest";
import { matchesRoute, matchesAnyRoute } from "@/lib/auth/routes";

describe("matchesRoute", () => {
  it("casa a rota e as subpáginas", () => {
    expect(matchesRoute("/denuncia", "/denuncia")).toBe(true);
    expect(matchesRoute("/denuncia/nova", "/denuncia")).toBe(true);
    expect(matchesRoute("/responder/abc", "/responder")).toBe(true);
  });

  it("não confunde /denuncia com /denuncias (tela do RH)", () => {
    expect(matchesRoute("/denuncias", "/denuncia")).toBe(false);
    expect(matchesAnyRoute("/denuncias", ["/pesquisas", "/denuncia"])).toBe(false);
  });
});
