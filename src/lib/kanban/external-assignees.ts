/* Responsáveis externos do Kanban (sem login). Seguro para o navegador. */

export const EXTERNAL_KINDS = {
  prestadora: { label: "Empresa prestadora", icon: "engineering" },
  consultoria_sst: { label: "Consultoria de SST", icon: "health_and_safety" },
  medicina_trabalho: { label: "Medicina do trabalho", icon: "medical_services" },
  outro: { label: "Outro", icon: "handshake" },
} as const;

export type ExternalKind = keyof typeof EXTERNAL_KINDS;

export function isExternalKind(value: unknown): value is ExternalKind {
  return typeof value === "string" && value in EXTERNAL_KINDS;
}

export interface ExternalAssignee {
  id: string;
  name: string;
  organization: string | null;
  kind: ExternalKind;
}

export interface ExternalAssigneeInput {
  name: string;
  organization?: string | null;
  kind?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export type NormalizedExternal =
  | {
      ok: true;
      value: {
        name: string;
        organization: string | null;
        kind: ExternalKind;
        contact_email: string | null;
        contact_phone: string | null;
      };
    }
  | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: string | null | undefined, max: number): string | null {
  const v = (value ?? "").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : null;
}

/** Valida e limpa o cadastro de um responsável externo. */
export function normalizeExternalAssignee(input: ExternalAssigneeInput): NormalizedExternal {
  const name = clean(input.name, 120);
  if (!name) return { ok: false, error: "Informe o nome do responsável externo." };

  const contactEmail = clean(input.contactEmail, 200)?.toLowerCase() ?? null;
  if (contactEmail && !EMAIL.test(contactEmail)) {
    return { ok: false, error: "E-mail de contato inválido." };
  }

  return {
    ok: true,
    value: {
      name,
      organization: clean(input.organization, 120),
      kind: isExternalKind(input.kind) ? input.kind : "outro",
      contact_email: contactEmail,
      contact_phone: clean(input.contactPhone, 40),
    },
  };
}

/** Rótulo curto para cards: "Nome · Organização". */
export function externalLabel(e: Pick<ExternalAssignee, "name" | "organization">): string {
  return e.organization ? `${e.name} · ${e.organization}` : e.name;
}

export interface AssigneeTaskLike {
  assignedTo: string | null;
  externalAssigneeId: string | null;
  columnId: string;
}

export interface AssigneeSummary {
  key: string;
  type: "internal" | "external" | "none";
  id: string | null;
  name: string;
  detail: string | null;
  total: number;
  open: number;
}

/**
 * Agrupa as tarefas por responsável para a visão "Por responsável".
 * Uma tarefa com dono interno e executor externo conta para os dois.
 */
export function summarizeByAssignee(
  tasks: AssigneeTaskLike[],
  users: { id: string; name: string }[],
  externals: Pick<ExternalAssignee, "id" | "name" | "organization" | "kind">[],
  doneColumnId: string | null
): AssigneeSummary[] {
  const map = new Map<string, AssigneeSummary>();

  for (const u of users) {
    map.set(`u:${u.id}`, {
      key: `u:${u.id}`,
      type: "internal",
      id: u.id,
      name: u.name,
      detail: null,
      total: 0,
      open: 0,
    });
  }
  for (const e of externals) {
    map.set(`e:${e.id}`, {
      key: `e:${e.id}`,
      type: "external",
      id: e.id,
      name: e.name,
      detail: e.organization ?? EXTERNAL_KINDS[e.kind]?.label ?? null,
      total: 0,
      open: 0,
    });
  }
  const none: AssigneeSummary = {
    key: "none",
    type: "none",
    id: null,
    name: "Sem responsável",
    detail: null,
    total: 0,
    open: 0,
  };

  for (const t of tasks) {
    const isOpen = t.columnId !== doneColumnId;
    const keys: string[] = [];
    if (t.assignedTo) keys.push(`u:${t.assignedTo}`);
    if (t.externalAssigneeId) keys.push(`e:${t.externalAssigneeId}`);
    if (keys.length === 0) {
      none.total++;
      if (isOpen) none.open++;
      continue;
    }
    for (const k of keys) {
      const s = map.get(k);
      if (!s) continue;
      s.total++;
      if (isOpen) s.open++;
    }
  }

  const list = Array.from(map.values())
    .filter((s) => s.total > 0)
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name, "pt-BR"));
  if (none.total > 0) list.push(none);
  return list;
}
