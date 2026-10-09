/**
 * Divisão de documentos em trechos (chunking) guiada pela estrutura do texto.
 *
 * Entrada: o texto de cada página (como sai do PDF). Saída: trechos de até
 * CHUNK_MAX_WORDS palavras, cada um com a seção a que pertence e as páginas, para a
 * citação poder dizer "Manual GRO/PGR, 11.2 Matriz de risco, p. 68".
 *
 * Reconhece:
 *  - títulos numerados em vários níveis ("11.2 Matriz de risco", "1. INTRODUÇÃO");
 *  - itens de norma ("1.5.7.3.2 O inventário de riscos deve…") e artigos ("Art. 3º");
 *  - perguntas numeradas de documentos de perguntas e respostas ("5. Existe modelo…?");
 * - títulos de norma ("CAPÍTULO", "ANEXO", "RETIFICAÇÃO").
 * E limpa: sumário, números de página, cabeçalhos/rodapés repetidos e hifenização
 * de quebra de linha.
 *
 * Funções puras (sem I/O): testadas em tests/rag/chunking.test.ts.
 */

import { CHUNK_MAX_WORDS, CHUNK_MIN_WORDS_AT_HEADING } from "./config";

export interface DocumentChunk {
  index: number;
  section: string | null;
  pageStart: number;
  pageEnd: number;
  content: string;
  wordCount: number;
}

interface Line {
  text: string;
  page: number;
}

type Block =
  | { kind: "heading"; level: number; text: string; page: number }
  | { kind: "para"; text: string; pageStart: number; pageEnd: number; label?: string };

const UPPER = "A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ";
const LOWER = "a-záéíóúâêôãõçàü";
const STARTS_LOWER = new RegExp(`^[${LOWER}]`);
const ENDS_SENTENCE = /[.!?:;]["”)]?$/;
const STARTS_UPPER = new RegExp(`^[${UPPER}0-9"“(]`);
const BULLET = /^[•▪●◦○■□➢►✓✔\-–—*]\s*/;

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

function isMostlyUpper(text: string): boolean {
  const letters = text.replace(new RegExp(`[^${UPPER}${LOWER}]`, "g"), "");
  if (letters.length < 4) return false;
  const upper = letters.replace(new RegExp(`[^${UPPER}]`, "g"), "").length;
  return upper / letters.length > 0.85;
}

/* ──────────────────────────────────────────────────────────────────────
 * 1. Limpeza
 * ────────────────────────────────────────────────────────────────────── */

const PAGE_NUMBER = /^[-–—]?\s*\d{1,4}\s*[-–—]?$|^(p[áa]gina|p\.)\s*\d+(\s*(de|\/)\s*\d+)?$/i;
const TOC_LINE = /(\.\s*){4,}\s*\d+\s*$|…{2,}\s*\d+\s*$/;

export function cleanPages(pages: string[]): Line[] {
  const perPage = pages.map((p) =>
    p
      // Ligaduras ("ﬁ" → "fi") e o "Ǫ" que alguns PDFs usam no lugar de Q. (NFKC
      // resolveria as ligaduras, mas também troca "º" por "o".)
      .normalize("NFC")
      .replace(/[ﬀﬁﬂﬃﬄ]/g, (c) => c.normalize("NFKC"))
      .replace(/Ǫ/g, "Q")
      .replace(/ǫ/g, "q")
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l.length > 0)
  );

  // Cabeçalhos/rodapés: a mesma linha (ignorando números) em muitas páginas.
  const repeated = new Set<string>();
  if (pages.length >= 4) {
    const seen = new Map<string, number>();
    perPage.forEach((lines) => {
      for (const key of new Set(lines.map(repeatKey))) seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    const threshold = Math.max(3, Math.ceil(pages.length * 0.3));
    for (const [key, n] of seen) if (n >= threshold && key.length <= 120) repeated.add(key);
  }

  const out: Line[] = [];
  perPage.forEach((lines, i) => {
    // Página de sumário: descarta inteira (sobram títulos sem número de página).
    const tocLines = lines.filter((l) => TOC_LINE.test(l)).length;
    if (tocLines >= 5 && tocLines >= lines.length * 0.4) return;
    for (const text of lines) {
      if (PAGE_NUMBER.test(text) || TOC_LINE.test(text)) continue;
      if (repeated.has(repeatKey(text))) continue;
      out.push({ text, page: i + 1 });
    }
  });
  return out;
}

function repeatKey(line: string): string {
  return line.toLowerCase().replace(/\d+/g, "#");
}

/* ──────────────────────────────────────────────────────────────────────
 * 2. Linhas → blocos (títulos e parágrafos)
 * ────────────────────────────────────────────────────────────────────── */

const MULTI_NUMBER = new RegExp(`^(\\d+(?:\\.\\d+)+)\\.?\\s+([${UPPER}"“(].*)$`);
const SINGLE_NUMBER = new RegExp(`^(\\d{1,2})\\.\\s+([${UPPER}"“(].*)$`);
const ARTICLE = /^(Art\.?\s*\d+[ºo°]?(?:-[A-Z])?)\.?\s+(.+)$/;
const NORM_VERB = /(^|\s)(deve|devem|dever[áã]o?|pode|podem|poder[áã]o?|ser[áã]o?|é|são)(?=[\s,.;:]|$)/i;
const KEYWORD_HEADING =/^(CAP[ÍI]TULO|ANEXO|SE[ÇC][ÃA]O|T[ÍI]TULO|PARTE|RETIFICA[ÇC][ÃA]O)\b/;

/** Junta "trabalha-" + "dor" quando a palavra sem hífen existe no documento. */
function joinLines(prev: string, next: string, vocabulary: Set<string>): string {
  const m = prev.match(new RegExp(`([${UPPER}${LOWER}]+)-$`));
  if (m && STARTS_LOWER.test(next)) {
    const nextWord = next.match(new RegExp(`^[${LOWER}]+`))?.[0] ?? "";
    const joined = (m[1] + nextWord).toLowerCase();
    return vocabulary.has(joined) ? prev.slice(0, -1) + next : prev + next;
  }
  return `${prev} ${next}`;
}

export function toBlocks(lines: Line[]): Block[] {
  const vocabulary = new Set(
    lines.flatMap((l) => l.text.toLowerCase().match(new RegExp(`[${LOWER}]+`, "g")) ?? [])
  );
  const blocks: Block[] = [];
  let para: Extract<Block, { kind: "para" }> | null = null;

  const flushPara = () => {
    if (para && para.text.trim()) blocks.push(para);
    para = null;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const text = line.text;

    // Junta a continuação de uma linha numerada/título (linhas que começam em minúscula,
    // ou em maiúsculas quando o título inteiro é em maiúsculas).
    const gather = (allowUpperContinuation: boolean) => {
      let merged = text;
      let j = i + 1;
      while (j < lines.length && j <= i + 3 && !ENDS_SENTENCE.test(merged)) {
        const next = lines[j].text;
        const continues =
          STARTS_LOWER.test(next) ||
          (allowUpperContinuation && isMostlyUpper(next) && next.length <= 80 && !MULTI_NUMBER.test(next) && !SINGLE_NUMBER.test(next));
        if (!continues) break;
        merged = joinLines(merged, next, vocabulary);
        j++;
      }
      return { merged, consumed: j - i };
    };

    const multi = text.match(MULTI_NUMBER);
    const single = !multi ? text.match(SINGLE_NUMBER) : null;
    const article = text.match(ARTICLE);

    if (multi) {
      const { merged, consumed } = gather(isMostlyUpper(multi[2]));
      const level = multi[1].split(".").length;
      // Título: curto e sem pontuação final. Item de norma: frase com obrigação ("deve"…),
      // mesmo quando a quebra de linha deixa a primeira linha curta.
      const isItem = /[.;:,]$/.test(merged) || merged.length > 100 || NORM_VERB.test(merged);
      if (merged.endsWith("?") || !isItem) {
        flushPara();
        blocks.push({ kind: "heading", level, text: merged, page: line.page });
      } else {
        // Item de norma: começa um parágrafo rotulado com o número do item.
        flushPara();
        para = { kind: "para", text: merged, pageStart: line.page, pageEnd: lines[i + consumed - 1].page, label: `item ${multi[1]}` };
      }
      i += consumed;
      continue;
    }

    if (single) {
      const upper = isMostlyUpper(single[2]);
      const { merged, consumed } = gather(upper);
      if (merged.endsWith("?") || upper) {
        flushPara();
        blocks.push({ kind: "heading", level: upper ? 1 : 2, text: merged, page: line.page });
        i += consumed;
        continue;
      }
      // Item de lista comum: segue como parágrafo.
    }

    if (article) {
      flushPara();
      const label = article[1].replace(/\s+/g, " ").replace(/^Art\.?\s*/, "Art. ");
      para = { kind: "para", text, pageStart: line.page, pageEnd: line.page, label };
      i++;
      continue;
    }

    // Linhas em maiúsculas sem número (capas, expediente, ementas citadas) seguem como
    // texto: como título, poluíam a seção dos trechos seguintes.
    if (KEYWORD_HEADING.test(text)) {
      const { merged, consumed } = gather(true);
      flushPara();
      blocks.push({ kind: "heading", level: 1, text: merged, page: line.page });
      i += consumed;
      continue;
    }

    // Texto corrido: novo parágrafo depois de fim de frase seguido de maiúscula/marcador.
    const newParagraph =
      BULLET.test(text) || (para !== null && ENDS_SENTENCE.test(para.text) && STARTS_UPPER.test(text));
    if (!para) {
      para = { kind: "para", text, pageStart: line.page, pageEnd: line.page };
    } else if (newParagraph && para.label) {
      // Alíneas e parágrafos de um item de norma/artigo ficam com ele até o próximo item.
      para.text = `${para.text}
${text}`;
      para.pageEnd = line.page;
    } else if (newParagraph) {
      flushPara();
      para = { kind: "para", text, pageStart: line.page, pageEnd: line.page };
    } else {
      para.text = joinLines(para.text, text, vocabulary);
      para.pageEnd = line.page;
    }
    i++;
  }
  flushPara();
  return blocks;
}

/* ──────────────────────────────────────────────────────────────────────
 * 3. Blocos → trechos
 * ────────────────────────────────────────────────────────────────────── */

function splitLongText(text: string, maxWords: number): string[] {
  const sentences = text.split(new RegExp(`(?<=[.!?;])\\s+(?=[${UPPER}0-9"“(•▪-])`));
  const pieces: string[] = [];
  let cur: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const w = countWords(s);
    if (w > maxWords) {
      // Frase gigante (tabela extraída como texto corrido): corta por palavras.
      if (cur.length) pieces.push(cur.join(" "));
      const tokens = s.split(/\s+/);
      for (let k = 0; k < tokens.length; k += maxWords) pieces.push(tokens.slice(k, k + maxWords).join(" "));
      cur = [];
      words = 0;
      continue;
    }
    if (words + w > maxWords && cur.length) {
      pieces.push(cur.join(" "));
      // Sobreposição de uma frase entre pedaços do mesmo parágrafo.
      const last = cur[cur.length - 1];
      cur = countWords(last) < maxWords / 3 ? [last] : [];
      words = cur.length ? countWords(last) : 0;
    }
    cur.push(s);
    words += w;
  }
  if (cur.length) pieces.push(cur.join(" "));
  return pieces;
}

export function chunkBlocks(
  blocks: Block[],
  opts: { maxWords?: number; minWordsAtHeading?: number } = {}
): DocumentChunk[] {
  const maxWords = opts.maxWords ?? CHUNK_MAX_WORDS;
  const minAtHeading = opts.minWordsAtHeading ?? CHUNK_MIN_WORDS_AT_HEADING;

  const chunks: DocumentChunk[] = [];
  const headingStack: { level: number; text: string }[] = [];
  const headingPath = () =>
    headingStack.length ? headingStack.slice(-2).map((h) => truncate(h.text, 120)).join(" › ") : null;

  let texts: string[] = [];
  let words = 0;
  let pageStart = 0;
  let pageEnd = 0;
  let section: string | null = null;
  let firstLabel: string | null = null;
  let lastLabel: string | null = null;

  const sectionWithLabels = () => {
    if (!firstLabel) return section;
    const labels =
      firstLabel === lastLabel || !lastLabel
        ? firstLabel
        : firstLabel.startsWith("item ") && lastLabel.startsWith("item ")
          ? `itens ${firstLabel.slice(5)} a ${lastLabel.slice(5)}`
          : `${firstLabel} a ${lastLabel}`;
    return section ? `${section} › ${labels}` : labels;
  };

  const flush = () => {
    const content = texts.join("\n").trim();
    if (content && countWords(content) >= 5) {
      chunks.push({ index: chunks.length, section: sectionWithLabels(), pageStart, pageEnd, content, wordCount: countWords(content) });
    }
    texts = [];
    words = 0;
    firstLabel = lastLabel = null;
  };

  const add = (text: string, from: number, to: number, label?: string) => {
    if (texts.length === 0) {
      pageStart = from;
      section = headingPath();
    }
    texts.push(text);
    words += countWords(text);
    pageEnd = to;
    if (label) {
      firstLabel ??= label;
      lastLabel = label;
    }
  };

  for (const block of blocks) {
    if (block.kind === "heading") {
      if (words >= minAtHeading) flush();
      while (headingStack.length && headingStack[headingStack.length - 1].level >= block.level) headingStack.pop();
      headingStack.push({ level: block.level, text: block.text });
      // Trecho ainda pequeno: passa a pertencer à seção nova.
      if (words < 30) section = headingPath();
      if (texts.length === 0) {
        pageStart = block.page;
        section = headingPath();
      }
      texts.push(block.text);
      words += countWords(block.text);
      pageEnd = Math.max(pageEnd, block.page);
      continue;
    }

    const w = countWords(block.text);
    if (w > maxWords) {
      // Parágrafo maior que um trecho: divide por frases. Só o título (se houver) segue junto.
      if (words >= 30) flush();
      const pieces = splitLongText(block.text, maxWords - words);
      pieces.forEach((piece, k) => {
        if (k > 0) flush();
        add(piece, block.pageStart, block.pageEnd, block.label);
      });
      continue;
    }
    if (words + w > maxWords) flush();
    add(block.text, block.pageStart, block.pageEnd, block.label);
  }
  flush();

  // Último trecho muito curto: junta ao anterior.
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    const prev = chunks[chunks.length - 2];
    if (last.wordCount < 40 && prev.wordCount + last.wordCount <= maxWords * 1.3) {
      prev.content = `${prev.content}\n${last.content}`;
      prev.wordCount += last.wordCount;
      prev.pageEnd = last.pageEnd;
      chunks.pop();
    }
  }
  return chunks;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Atalho: páginas → trechos. */
export function chunkDocument(
  pages: string[],
  opts?: { maxWords?: number; minWordsAtHeading?: number }
): DocumentChunk[] {
  return chunkBlocks(toBlocks(cleanPages(pages)), opts);
}
