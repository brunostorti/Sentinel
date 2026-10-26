/* Leitura do CSV de colaboradores.
   Com cabeçalho, as colunas são achadas pelo nome (em qualquer ordem); sem cabeçalho, vale a
   ordem email, departamento, nome, terceiro, empresa_prestadora. */

export interface ParsedEmployee {
  email: string;
  department: string;
  name?: string;
  isThirdParty: boolean;
  thirdPartyCompany?: string;
}

type Column = "email" | "department" | "name" | "thirdParty" | "company";

const POSITIONAL: Column[] = ["email", "department", "name", "thirdParty", "company"];

const HEADER_ALIASES: Record<Column, string[]> = {
  email: ["email", "e-mail", "e_mail"],
  department: ["departamento", "department", "setor", "area"],
  name: ["nome", "name"],
  thirdParty: ["terceiro", "terceirizado", "third_party"],
  company: ["empresa_prestadora", "empresa prestadora", "prestadora", "empresa"],
};

const YES = new Set(["sim", "s", "x", "1", "true", "yes", "terceiro", "terceirizado"]);

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function headerColumns(cells: string[]): Column[] | null {
  const cols = cells.map((cell) => {
    const key = plain(cell);
    return (Object.keys(HEADER_ALIASES) as Column[]).find((c) => HEADER_ALIASES[c].includes(key));
  });
  return cols.includes("email") ? (cols as Column[]) : null;
}

export function parseEmployeesCsv(text: string): ParsedEmployee[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string) => line.split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ""));
  const header = headerColumns(split(lines[0]));
  const columns = header ?? POSITIONAL;

  const result: ParsedEmployee[] = [];
  for (const line of lines.slice(header ? 1 : 0)) {
    const row: Partial<Record<Column, string>> = {};
    split(line).forEach((cell, i) => {
      const col = columns[i];
      if (col && cell) row[col] = cell;
    });
    if (!row.email?.includes("@")) continue;

    const company = row.company?.trim() || undefined;
    // Empresa prestadora preenchida já indica terceiro, mesmo sem a coluna "terceiro".
    const isThirdParty = Boolean(company) || YES.has(plain(row.thirdParty ?? ""));

    result.push({
      email: row.email.toLowerCase(),
      department: row.department ?? "",
      name: row.name || undefined,
      isThirdParty,
      thirdPartyCompany: isThirdParty ? company : undefined,
    });
  }
  return result;
}
