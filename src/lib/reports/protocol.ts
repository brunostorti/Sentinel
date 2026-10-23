import { randomInt } from "crypto";

/**
 * Protocolo da denúncia: DEN-AAAA-XXXX-XXXX.
 *
 * Alfabeto de 32 símbolos sem 0/O e 1/I (não se confundem ao copiar à mão):
 * 32^8 ≈ 1,1 trilhão de combinações, o que torna inviável adivinhar um protocolo.
 * Protocolos antigos (PROT-AAAA-XXXXXX, inclusive os de demonstração) continuam consultáveis.
 */
export const PROTOCOL_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const NEW_FORMAT = /^DEN-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
const LEGACY_FORMAT = /^PROT-\d{4}-[0-9A-Z]{6,16}$/;

/** Ano corrente no fuso de Brasília (o servidor roda em UTC). */
function yearInBrazil(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

export function generateProtocol(
  date: Date = new Date(),
  random: (max: number) => number = randomInt
): string {
  const block = () =>
    Array.from({ length: 4 }, () => PROTOCOL_ALPHABET[random(PROTOCOL_ALPHABET.length)]).join("");
  return `DEN-${yearInBrazil(date)}-${block()}-${block()}`;
}

/** Normaliza o que a pessoa digitou (espaços, minúsculas); null se não for um protocolo válido. */
export function normalizeProtocol(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").replace(/\s+/g, "").toUpperCase();
  if (NEW_FORMAT.test(value) || LEGACY_FORMAT.test(value)) return value;
  return null;
}
