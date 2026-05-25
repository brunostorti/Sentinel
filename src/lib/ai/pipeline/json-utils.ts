/**
 * Utilitários para extrair JSON da resposta do LLM com tolerância a:
 * - blocos cercados por ```json ... ```
 * - texto introdutório antes do JSON
 * - truncamento (recuperação parcial)
 */

/** Extrai um único objeto JSON (não array) da string. */
export function extractJsonObject<T = unknown>(raw: string): T | null {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  const objStart = s.indexOf("{");
  const arrStart = s.indexOf("[");
  if (objStart === -1) return null;

  if (arrStart !== -1 && arrStart < objStart) {
    s = s.substring(arrStart);
  } else {
    s = s.substring(objStart);
  }

  try {
    return JSON.parse(s) as T;
  } catch {
    // tentativa de fechar fechamentos pendentes (truncamento)
    return null;
  }
}

/** Extrai um array JSON da string, com recuperação de truncamento. */
export function extractJsonArray<T = unknown>(raw: string): T[] {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  const arrStart = s.indexOf("[");
  if (arrStart === -1) return [];
  s = s.substring(arrStart);

  try {
    return JSON.parse(s) as T[];
  } catch {
    // recovery: encontra o último objeto fechado em depth 1
    const completeEnds: number[] = [];
    let depth = 0;
    let inStr = false;
    let escape = false;

    for (let i = 1; i < s.length; i++) {
      const ch = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === "{" || ch === "[") depth++;
      if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0 && ch === "}") completeEnds.push(i);
      }
    }

    if (completeEnds.length === 0) return [];
    const lastEnd = completeEnds[completeEnds.length - 1];
    let fixed = s.substring(0, lastEnd + 1);
    fixed = fixed.replace(/,\s*$/, "");
    fixed += "]";
    try {
      return JSON.parse(fixed) as T[];
    } catch {
      return [];
    }
  }
}
