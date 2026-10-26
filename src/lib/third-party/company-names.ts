/* Comparação de nomes de empresas prestadoras, para evitar a mesma empresa escrita de jeitos
   diferentes ("Limpa Bem", "LimpaBem", "Limpa Bem Serviços Ltda."). Sem dependências: roda no
   navegador (autocomplete) e no servidor (gravação). */

/** Sufixos societários e palavras genéricas ignorados na comparação. */
const IGNORED_WORDS = new Set([
  "ltda", "ltd", "sa", "s", "a", "me", "epp", "eireli", "mei", "cia",
  "e", "de", "da", "do", "das", "dos",
  "servicos", "servico", "solucoes", "empresa", "grupo",
]);

/** Minúsculas, sem acento e só letras/números separados por espaço. */
function words(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** Chave exata: ignora maiúsculas, acentos, espaços e pontuação ("Limpa-Bem" = "limpabem"). */
export function exactKey(name: string): string {
  return words(name).join("");
}

/** Chave do núcleo do nome: também ignora sufixos como Ltda., S.A. e "Serviços". */
export function coreKey(name: string): string {
  const core = words(name).filter((w) => !IGNORED_WORDS.has(w));
  return core.length > 0 ? core.join("") : exactKey(name);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Erros de digitação tolerados: 1 até 6 letras, 2 acima disso. */
function typoTolerance(length: number) {
  return length <= 6 ? 1 : 2;
}

/** Os nomes parecem ser da mesma empresa (núcleo igual, um contém o outro ou erro de digitação). */
export function isSimilarCompany(a: string, b: string): boolean {
  const ka = coreKey(a);
  const kb = coreKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  if (short.length >= 4 && long.includes(short)) return true;
  return levenshtein(ka, kb) <= typoTolerance(short.length);
}

/** Nome já cadastrado igual ao digitado, ignorando maiúsculas, acentos, espaços e pontuação. */
export function findExactCompany(input: string, existing: readonly string[]): string | null {
  const key = exactKey(input);
  if (!key) return null;
  return existing.find((name) => exactKey(name) === key) ?? null;
}

/** Empresa parecida (mas não idêntica) já cadastrada, para sugerir "Você quis dizer...?". */
export function findSimilarCompany(input: string, existing: readonly string[]): string | null {
  if (exactKey(input).length < 3 || findExactCompany(input, existing)) return null;
  return existing.find((name) => isSimilarCompany(input, name)) ?? null;
}

/** Sugestões do autocomplete: nomes que começam com / contêm o texto digitado. */
export function matchCompanies(input: string, existing: readonly string[], limit = 6): string[] {
  const key = exactKey(input);
  if (!key) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of existing) {
    const k = exactKey(name);
    if (k === key) continue;
    if (k.startsWith(key)) starts.push(name);
    else if (k.includes(key) || (key.length >= 4 && isSimilarCompany(input, name))) contains.push(name);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Nomes distintos (pela chave exata), em ordem alfabética. */
export function uniqueCompanies(names: readonly (string | null | undefined)[]): string[] {
  const byKey = new Map<string, string>();
  for (const raw of names) {
    const name = raw?.trim();
    if (name && !byKey.has(exactKey(name))) byKey.set(exactKey(name), name);
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Na gravação: se a empresa já existe com outra grafia (só maiúsculas, acento ou espaço), usa a existente. */
export function canonicalCompany(input: string | null | undefined, existing: readonly string[]): string | null {
  const name = input?.trim();
  if (!name) return null;
  return findExactCompany(name, existing) ?? name;
}
