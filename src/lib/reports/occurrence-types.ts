/**
 * Tipos de ocorrência do canal de denúncia. O valor gravado no banco é o próprio rótulo
 * (denúncias antigas usam "Assédio", que continua sendo exibido como está).
 */
export const OCCURRENCE_TYPES = [
  {
    value: "Assédio moral",
    icon: "record_voice_over",
    description: "Humilhação, ameaça, isolamento ou cobrança abusiva repetida.",
  },
  {
    value: "Assédio sexual",
    icon: "front_hand",
    description: "Insinuação, contato ou pedido de natureza sexual não desejado.",
  },
  {
    value: "Discriminação",
    icon: "diversity_3",
    description: "Tratamento diferente por raça, gênero, idade, religião, deficiência ou outro motivo.",
  },
  {
    value: "Violência ou ameaça",
    icon: "warning",
    description: "Agressão física ou verbal, intimidação ou ameaça à integridade.",
  },
  {
    value: "Conduta antiética",
    icon: "gavel",
    description: "Fraude, corrupção, desvio ou outra conduta contra as regras.",
  },
  {
    value: "Outro",
    icon: "more_horiz",
    description: "Qualquer outra situação que você queira relatar.",
  },
] as const;

export type OccurrenceType = (typeof OCCURRENCE_TYPES)[number]["value"];

export function isOccurrenceType(value: unknown): value is OccurrenceType {
  return OCCURRENCE_TYPES.some((t) => t.value === value);
}
