/**
 * Extração de texto por página (PDF) ou de texto simples (TXT/MD/HTML).
 * `unpdf` é JavaScript puro: roda no Node local e nas funções da Vercel.
 */

import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfPages(data: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  return Array.isArray(text) ? text : [text];
}

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ordm: "º", ordf: "ª", sect: "§",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É",
  Iacute: "Í", Oacute: "Ó", Uacute: "Ú", acirc: "â", ecirc: "ê", ocirc: "ô", Acirc: "Â",
  Ecirc: "Ê", Ocirc: "Ô", atilde: "ã", otilde: "õ", Atilde: "Ã", Otilde: "Õ", ccedil: "ç",
  Ccedil: "Ç", agrave: "à", Agrave: "À", uuml: "ü", ndash: "–", mdash: "—", ldquo: "“",
  rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…", deg: "°",
};

/** HTML (ex.: texto de lei do Planalto) → texto com uma linha por parágrafo. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<strike[\s\S]*?<\/strike>/gi, "") // trechos revogados
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|table|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Há texto suficiente para indexar? (PDF escaneado sai praticamente vazio.) */
export function hasUsefulText(pages: string[]): boolean {
  const letters = pages.join(" ").replace(/[^A-Za-zÀ-ÿ]/g, "").length;
  return letters >= 200;
}
