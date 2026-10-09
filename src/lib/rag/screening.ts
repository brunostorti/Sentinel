/**
 * Triagem anti-injeção (camada 1 de docs/rag/2026-10-09-design-rag.md, seção 8).
 *
 * Marca trechos que parecem instruções dirigidas a uma IA ("ignore as instruções
 * anteriores", "a partir de agora você é…", marcadores de prompt). Trechos marcados
 * ficam fora da busca e aparecem como aviso na tela de documentos da empresa.
 *
 * É uma rede de proteção, não a única defesa: o prompt também delimita os trechos e
 * manda tratá-los como dados (ver prompt.ts).
 */

import { countWords, type DocumentChunk } from "./chunking";

const PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /\b(ignore|ignorem?|desconsiderem?|esque[çc]am?)\s+(todas\s+)?(as\s+|suas\s+)?(instru[çc][õo]es|regras|orienta[çc][õo]es|diretrizes)(\s+(anteriores|acima|do sistema|recebidas))?/i,
    reason: "pede para ignorar instruções",
  },
  {
    re: /\b(ignore|disregard|forget)\s+(all\s+|any\s+)?(the\s+|your\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?|messages)/i,
    reason: "pede para ignorar instruções (inglês)",
  },
  { re: /\b(system|developer)\s+(prompt|message)\b|\bprompt\s+do\s+sistema\b/i, reason: "menciona o prompt do sistema" },
  {
    re: /\ba\s+partir\s+de\s+agora,?\s+(voc[êe]|a\s+ia|o\s+assistente)\s+(é|ser[áa]|deve)|\byou\s+are\s+now\b|\bact\s+as\s+(an?|the)\s+\w+/i,
    reason: "tenta redefinir o papel do assistente",
  },
  {
    re: /\b(assistente|chatbot|intelig[êe]ncia\s+artificial|modelo\s+de\s+linguagem|chatgpt|claude|gemini|llm)\b[^.\n]{0,40}\b(responda|diga|escreva|recomende|afirme|declare|informe)\b/i,
    reason: "dá ordens a uma IA",
  },
  {
    re: /<\/?\s*(system|assistant|user|instructions?|documentos|trecho)\b[^>]*>|\[\/?INST\]|<\|im_(start|end)\|>/i,
    reason: "contém marcadores de prompt",
  },
];

export interface ScreeningResult {
  flagged: boolean;
  reason: string | null;
}

export function screenChunk(text: string): ScreeningResult {
  for (const { re, reason } of PATTERNS) {
    if (re.test(text)) return { flagged: true, reason };
  }
  return { flagged: false, reason: null };
}

export interface ScreenedUnit {
  section: string | null;
  pageStart: number;
  pageEnd: number;
  content: string;
  flagged: boolean;
  reason: string | null;
}

/**
 * Triagem por parágrafo: o parágrafo suspeito sai do trecho e vira um trecho marcado
 * (fica fora da busca, mas aparece para o RH conferir); o resto do trecho continua
 * pesquisável. Assim uma frase maliciosa não derruba um documento inteiro.
 */
export function screenDocumentChunks(chunks: DocumentChunk[]): ScreenedUnit[] {
  const kept: ScreenedUnit[] = [];
  const quarantined: ScreenedUnit[] = [];
  for (const c of chunks) {
    const clean: string[] = [];
    for (const paragraph of c.content.split("\n")) {
      const r = screenChunk(paragraph);
      if (r.flagged) {
        quarantined.push({ section: c.section, pageStart: c.pageStart, pageEnd: c.pageEnd, content: paragraph, flagged: true, reason: r.reason });
      } else {
        clean.push(paragraph);
      }
    }
    const content = clean.join("\n").trim();
    if (countWords(content) < 5) continue;
    // Padrões que atravessam parágrafos.
    const whole = screenChunk(content);
    kept.push({ section: c.section, pageStart: c.pageStart, pageEnd: c.pageEnd, content, flagged: whole.flagged, reason: whole.reason });
  }
  return [...kept, ...quarantined];
}
