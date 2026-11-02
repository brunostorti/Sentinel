import { describe, expect, it } from "vitest";
import {
  externalLabel,
  normalizeExternalAssignee,
  summarizeByAssignee,
} from "@/lib/kanban/external-assignees";

describe("normalizeExternalAssignee", () => {
  it("exige nome", () => {
    expect(normalizeExternalAssignee({ name: "   " })).toEqual({
      ok: false,
      error: "Informe o nome do responsável externo.",
    });
  });

  it("limpa espaços, usa 'outro' para tipo desconhecido e e-mail em minúsculas", () => {
    const r = normalizeExternalAssignee({
      name: "  Carlos   Souza ",
      organization: " Limpa Bem ",
      kind: "hacker",
      contactEmail: " Carlos@Limpa.COM ",
    });
    expect(r).toEqual({
      ok: true,
      value: {
        name: "Carlos Souza",
        organization: "Limpa Bem",
        kind: "outro",
        contact_email: "carlos@limpa.com",
        contact_phone: null,
      },
    });
  });

  it("recusa e-mail inválido", () => {
    expect(normalizeExternalAssignee({ name: "Ana", contactEmail: "ana@" }).ok).toBe(false);
  });

  it("aceita os tipos conhecidos", () => {
    const r = normalizeExternalAssignee({ name: "Ana", kind: "consultoria_sst" });
    expect(r.ok && r.value.kind).toBe("consultoria_sst");
  });
});

describe("externalLabel", () => {
  it("junta nome e organização", () => {
    expect(externalLabel({ name: "Ana", organization: "SST Já" })).toBe("Ana · SST Já");
    expect(externalLabel({ name: "Ana", organization: null })).toBe("Ana");
  });
});

describe("summarizeByAssignee", () => {
  const users = [
    { id: "u1", name: "Bruna" },
    { id: "u2", name: "Diego" },
  ];
  const externals = [{ id: "e1", name: "Carlos", organization: "Limpa Bem", kind: "prestadora" as const }];

  it("conta abertas e totais; tarefa com dono e externo conta para os dois", () => {
    const tasks = [
      { assignedTo: "u1", externalAssigneeId: "e1", columnId: "c1" },
      { assignedTo: "u1", externalAssigneeId: null, columnId: "done" },
      { assignedTo: null, externalAssigneeId: null, columnId: "c1" },
    ];
    const s = summarizeByAssignee(tasks, users, externals, "done");
    const bruna = s.find((x) => x.key === "u:u1");
    const carlos = s.find((x) => x.key === "e:e1");
    expect(bruna).toMatchObject({ total: 2, open: 1, type: "internal" });
    expect(carlos).toMatchObject({ total: 1, open: 1, type: "external", detail: "Limpa Bem" });
    expect(s.at(-1)).toMatchObject({ key: "none", total: 1, open: 1 });
    expect(s.find((x) => x.key === "u:u2")).toBeUndefined();
  });

  it("ignora responsável que não é da empresa", () => {
    const s = summarizeByAssignee(
      [{ assignedTo: "intruso", externalAssigneeId: null, columnId: "c1" }],
      users,
      externals,
      "done"
    );
    expect(s).toEqual([]);
  });
});
