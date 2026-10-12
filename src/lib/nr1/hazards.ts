/**
 * Mapa dimensão do questionário → perigo psicossocial (NR-1, inventário de riscos).
 *
 * Os perigos e as possíveis consequências seguem a "Listagem exemplificativa" do Guia de
 * informações sobre os fatores de riscos psicossociais (MTE, 2025, p. 7). Alguns perigos
 * medidos pelo COPSOQ não constam dessa listagem (que é exemplificativa) e entram
 * marcados com `inGuide: false`. Cada instrumento ativo tem mapa próprio (COPSOQ II,
 * COPSOQ III, JSS, OLBI); tests/nr1/hazards.test.ts confere que nenhuma escala ficou de fora.
 *
 * Papéis das dimensões:
 *  - "hazard": exposição a um perigo (entra no inventário);
 *  - "health": efeito à saúde (burnout, stress, sintomas depressivos…) — não é perigo,
 *    é evidência de agravo no grupo e aumenta a probabilidade (criteria.ts);
 *  - "context": recurso ou traço individual (ex.: Auto-eficácia) ou fator fora do
 *    trabalho (Conflito família/trabalho — o Guia exclui a vida fora do trabalho, FAQ 5).
 *
 * PRECISA DE VALIDAÇÃO DA EQUIPE (psicologia/SST): é uma proposta do Sentinel.
 */

export type HazardKey =
  | "sobrecarga"
  | "demandas_emocionais"
  | "baixo_controle"
  | "pouco_desenvolvimento"
  | "mudancas"
  | "clareza_papel"
  | "recompensas"
  | "falta_apoio"
  | "relacionamentos"
  | "justica"
  | "inseguranca"
  | "trabalho_familia"
  | "assedio";

export interface Hazard {
  key: HazardKey;
  label: string;
  /** Possíveis lesões ou agravos (NR-1 1.5.7.3.2 d). */
  consequences: string[];
  /** Consta da listagem exemplificativa do Guia do MTE. */
  inGuide: boolean;
}

export const HAZARDS: Record<HazardKey, Hazard> = {
  sobrecarga: { key: "sobrecarga", label: "Excesso de demandas no trabalho (sobrecarga)", consequences: ["Transtorno mental", "DORT"], inGuide: true },
  demandas_emocionais: { key: "demandas_emocionais", label: "Exigências emocionais elevadas", consequences: ["Transtorno mental"], inGuide: false },
  baixo_controle: { key: "baixo_controle", label: "Baixo controle no trabalho / falta de autonomia", consequences: ["Transtorno mental", "DORT"], inGuide: true },
  pouco_desenvolvimento: { key: "pouco_desenvolvimento", label: "Poucas possibilidades de desenvolvimento e trabalho monótono", consequences: ["Transtorno mental"], inGuide: false },
  mudancas: { key: "mudancas", label: "Má gestão de mudanças organizacionais (baixa previsibilidade)", consequences: ["Transtorno mental", "DORT"], inGuide: true },
  clareza_papel: { key: "clareza_papel", label: "Baixa clareza de papel/função", consequences: ["Transtorno mental"], inGuide: true },
  recompensas: { key: "recompensas", label: "Baixas recompensas e reconhecimento", consequences: ["Transtorno mental"], inGuide: true },
  falta_apoio: { key: "falta_apoio", label: "Falta de suporte/apoio no trabalho", consequences: ["Transtorno mental"], inGuide: true },
  relacionamentos: { key: "relacionamentos", label: "Maus relacionamentos no local de trabalho", consequences: ["Transtorno mental"], inGuide: true },
  justica: { key: "justica", label: "Baixa justiça organizacional", consequences: ["Transtorno mental"], inGuide: true },
  inseguranca: { key: "inseguranca", label: "Insegurança no emprego", consequences: ["Transtorno mental"], inGuide: false },
  trabalho_familia: { key: "trabalho_familia", label: "Exigências do trabalho que invadem a vida pessoal", consequences: ["Transtorno mental", "Fadiga"], inGuide: false },
  assedio: { key: "assedio", label: "Assédio e comportamentos ofensivos (inclui violência)", consequences: ["Transtorno mental"], inGuide: true },
};

export type DimensionRole = { role: "hazard"; hazard: HazardKey } | { role: "health" } | { role: "context" };

/** COPSOQ II — versão portuguesa (nomes das escalas como na migração 20261009124759). */
const COPSOQ_II: Record<string, DimensionRole> = {
  "Exigências quantitativas": { role: "hazard", hazard: "sobrecarga" },
  "Ritmo de trabalho": { role: "hazard", hazard: "sobrecarga" },
  "Exigências cognitivas": { role: "hazard", hazard: "sobrecarga" },
  "Exigências emocionais": { role: "hazard", hazard: "demandas_emocionais" },
  "Exigências para esconder emoções": { role: "hazard", hazard: "demandas_emocionais" },
  "Influência no trabalho": { role: "hazard", hazard: "baixo_controle" },
  "Possibilidades de desenvolvimento": { role: "hazard", hazard: "pouco_desenvolvimento" },
  "Variação no trabalho": { role: "hazard", hazard: "pouco_desenvolvimento" },
  "Previsibilidade": { role: "hazard", hazard: "mudancas" },
  "Transparência do papel laboral": { role: "hazard", hazard: "clareza_papel" },
  "Conflitos laborais": { role: "hazard", hazard: "clareza_papel" },
  "Recompensas (reconhecimento)": { role: "hazard", hazard: "recompensas" },
  "Qualidade da liderança": { role: "hazard", hazard: "falta_apoio" },
  "Apoio social de superiores": { role: "hazard", hazard: "falta_apoio" },
  "Apoio social de colegas": { role: "hazard", hazard: "falta_apoio" },
  "Comunidade social no trabalho": { role: "hazard", hazard: "relacionamentos" },
  "Confiança horizontal": { role: "hazard", hazard: "relacionamentos" },
  "Confiança vertical": { role: "hazard", hazard: "justica" },
  "Justiça e respeito": { role: "hazard", hazard: "justica" },
  "Insegurança laboral": { role: "hazard", hazard: "inseguranca" },
  "Conflito trabalho/família": { role: "hazard", hazard: "trabalho_familia" },
  "Comportamentos ofensivos": { role: "hazard", hazard: "assedio" },
  "Saúde geral": { role: "health" },
  "Stress": { role: "health" },
  "Burnout": { role: "health" },
  "Problemas em dormir": { role: "health" },
  "Stress somático": { role: "health" },
  "Stress cognitivo": { role: "health" },
  "Sintomas depressivos": { role: "health" },
  "Significado do trabalho": { role: "context" },
  "Compromisso face ao local de trabalho": { role: "context" },
  "Satisfação no trabalho": { role: "context" },
  "Responsabilidade social": { role: "context" },
  "Auto-eficácia": { role: "context" },
  "Conflito família/trabalho": { role: "context" },
};

/** COPSOQ III — versão média portuguesa (Cotrim et al., 2022; migração 20261012174401). */
const COPSOQ_III: Record<string, DimensionRole> = {
  "Exigências quantitativas": { role: "hazard", hazard: "sobrecarga" },
  "Ritmo de trabalho": { role: "hazard", hazard: "sobrecarga" },
  "Exigências cognitivas": { role: "hazard", hazard: "sobrecarga" },
  "Exigências emocionais": { role: "hazard", hazard: "demandas_emocionais" },
  "Influência no trabalho": { role: "hazard", hazard: "baixo_controle" },
  "Controlo sobre o tempo de trabalho": { role: "hazard", hazard: "baixo_controle" },
  "Possibilidades de desenvolvimento": { role: "hazard", hazard: "pouco_desenvolvimento" },
  "Previsibilidade": { role: "hazard", hazard: "mudancas" },
  "Transparência do papel laboral": { role: "hazard", hazard: "clareza_papel" },
  "Conflito de papéis laborais": { role: "hazard", hazard: "clareza_papel" },
  "Reconhecimento": { role: "hazard", hazard: "recompensas" },
  "Qualidade da liderança": { role: "hazard", hazard: "falta_apoio" },
  "Suporte social de superiores": { role: "hazard", hazard: "falta_apoio" },
  "Suporte social de colegas": { role: "hazard", hazard: "falta_apoio" },
  "Sentido de pertença a comunidade": { role: "hazard", hazard: "relacionamentos" },
  "Confiança horizontal": { role: "hazard", hazard: "relacionamentos" },
  "Confiança vertical": { role: "hazard", hazard: "justica" },
  "Justiça organizacional": { role: "hazard", hazard: "justica" },
  "Insegurança laboral": { role: "hazard", hazard: "inseguranca" },
  "Insegurança com as condições de trabalho": { role: "hazard", hazard: "inseguranca" },
  "Conflito trabalho-família": { role: "hazard", hazard: "trabalho_familia" },
  "Auto-avaliação da saúde": { role: "health" },
  "Problemas de sono": { role: "health" },
  "Burnout": { role: "health" },
  "Stress": { role: "health" },
  "Sintomas depressivos": { role: "health" },
  "Significado do trabalho": { role: "context" },
  "Compromisso face ao local de trabalho": { role: "context" },
  "Qualidade do trabalho": { role: "context" },
  "Satisfação com o trabalho": { role: "context" },
  "Auto-eficácia": { role: "context" },
};

/**
 * JSS — mede satisfação, não exposição: as facetas entram como indício do perigo
 * correspondente (o Dossiê avisa que precisam ser confirmadas por observação e escuta).
 */
const JSS: Record<string, DimensionRole> = {
  "Pagamento": { role: "hazard", hazard: "recompensas" },
  "Benefícios": { role: "hazard", hazard: "recompensas" },
  "Recompensas": { role: "hazard", hazard: "recompensas" },
  "Promoção": { role: "hazard", hazard: "pouco_desenvolvimento" },
  "Supervisão": { role: "hazard", hazard: "falta_apoio" },
  "Procedimentos": { role: "hazard", hazard: "sobrecarga" },
  "Colegas de Trabalho": { role: "hazard", hazard: "relacionamentos" },
  "Comunicação": { role: "hazard", hazard: "clareza_papel" },
  "Natureza do Trabalho": { role: "context" },
};

/** OLBI — exaustão e desengajamento são o burnout: efeito à saúde, nenhum perigo. */
const OLBI: Record<string, DimensionRole> = {
  "Exaustão": { role: "health" },
  "Desengajamento": { role: "health" },
};

/** Mapa explícito por instrumento (código em questionnaire_instruments). */
export const ROLES_BY_INSTRUMENT: Record<string, Record<string, DimensionRole>> = {
  copsoq_ii: COPSOQ_II,
  copsoq_iii: COPSOQ_III,
  jss: JSS,
  olbi: OLBI,
};

/** Instrumentos arquivados (sem mapa próprio): pela categoria universal da dimensão. */
const BY_UNIVERSAL_CATEGORY: Record<string, DimensionRole> = {
  workload: { role: "hazard", hazard: "sobrecarga" },
  autonomy: { role: "hazard", hazard: "baixo_controle" },
  leadership: { role: "hazard", hazard: "falta_apoio" },
  social: { role: "hazard", hazard: "relacionamentos" },
  recognition: { role: "hazard", hazard: "recompensas" },
  communication: { role: "hazard", hazard: "clareza_papel" },
  security: { role: "hazard", hazard: "inseguranca" },
  offensive: { role: "hazard", hazard: "assedio" },
  burnout: { role: "health" },
  meaning: { role: "context" },
};

export function dimensionRole(name: string, universalCategory?: string | null, instrumentCode?: string | null): DimensionRole {
  const byInstrument = instrumentCode ? ROLES_BY_INSTRUMENT[instrumentCode] : undefined;
  if (byInstrument) return byInstrument[name] ?? { role: "context" };
  return COPSOQ_II[name] ?? (universalCategory ? BY_UNIVERSAL_CATEGORY[universalCategory] : undefined) ?? { role: "context" };
}
