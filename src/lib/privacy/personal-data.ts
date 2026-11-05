/*
 * Detector de dados pessoais em texto livre: CPF, e-mail e telefone.
 * Usado para bloquear esses dados em denúncias e feedbacks (protege o anonimato de
 * quem escreve e de terceiros citados) e para checar documentos antes da indexação.
 * Funções puras, seguras para o navegador e o servidor.
 */

export type PersonalDataKind = "cpf" | "email" | "phone";

export const PERSONAL_DATA_LABELS: Record<PersonalDataKind, string> = {
  cpf: "CPF",
  email: "e-mail",
  phone: "telefone",
};

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// 000.000.000-00, 000000000-00 ou 00000000000 (sem dígitos colados antes/depois).
const CPF = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g;
// (11) 98765-4321, 11 98765 4321, +55 11 3456-7890, 11987654321...
const PHONE = /(?<![\d@])(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?(?:9[\s.-]?)?\d{4}[\s.-]?\d{4}(?!\d)/g;

/** Confere os dígitos verificadores do CPF (evita confundir com outros números). */
export function isValidCpf(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

function isPlausiblePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // Celular tem 9 na frente (11 dígitos); fixo começa de 2 a 5 (10 dígitos).
  return digits.length === 11 ? digits[2] === "9" : /[2-5]/.test(digits[2]);
}

export interface PersonalDataResult {
  kinds: PersonalDataKind[];
  counts: Record<PersonalDataKind, number>;
}

export function findPersonalData(text: string): PersonalDataResult {
  const counts: Record<PersonalDataKind, number> = { cpf: 0, email: 0, phone: 0 };
  if (!text) return { kinds: [], counts };

  const emails = text.match(EMAIL) ?? [];
  counts.email = emails.length;
  const withoutEmails = text.replace(EMAIL, " ");

  const cpfs = (withoutEmails.match(CPF) ?? []).filter(isValidCpf);
  counts.cpf = cpfs.length;
  let rest = withoutEmails;
  for (const c of cpfs) rest = rest.replace(c, " ");

  counts.phone = (rest.match(PHONE) ?? []).filter(isPlausiblePhone).length;

  const kinds = (Object.keys(counts) as PersonalDataKind[]).filter((k) => counts[k] > 0);
  return { kinds, counts };
}

/** "CPF e telefone", "CPF, e-mail e telefone". */
export function describeKinds(kinds: PersonalDataKind[]): string {
  const labels = kinds.map((k) => PERSONAL_DATA_LABELS[k]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

/** Mensagem para o colaborador quando o texto tem dados pessoais. */
export function personalDataBlockMessage(kinds: PersonalDataKind[]): string {
  return `Para proteger o anonimato, retire do texto: ${describeKinds(kinds)}. Descreva a situação sem dados que identifiquem pessoas.`;
}
