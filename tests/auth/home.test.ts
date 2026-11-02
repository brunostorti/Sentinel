import { describe, expect, it } from "vitest";
import { homeForRole } from "@/lib/auth/home";

describe("homeForRole", () => {
  it("só o master abre o Painel Sentinel", () => {
    expect(homeForRole("SUPER_ADMIN", true)).toBe("/empresas");
    expect(homeForRole("SUPER_ADMIN", false)).toBe("/usuarios");
  });
  it("admins de empresa vão para o painel da empresa, mesmo com flag indevida", () => {
    expect(homeForRole("ADMIN", true)).toBe("/inicio");
    expect(homeForRole("HR")).toBe("/inicio");
    expect(homeForRole(null)).toBe("/inicio");
  });
});
