/**
 * Ingestão da base GLOBAL do RAG (docs/rag/fontes.json + referências curadas do banco).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/rag/ingest-global.ts            # só o que mudou
 *   npx tsx --env-file=.env.local scripts/rag/ingest-global.ts --force    # reprocessa tudo
 *   npx tsx --env-file=.env.local scripts/rag/ingest-global.ts --only lei-14831-2024
 *
 * Precisa de NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e OPENAI_API_KEY.
 * Os arquivos ficam em docs/referencias/ (fora do git). Se faltarem, são baixados da URL
 * oficial registrada em fontes.json.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { extractPdfPages, hasUsefulText, htmlToText } from "../../src/lib/rag/extract";
import { upsertGlobalDocument, type GlobalDocumentMeta } from "../../src/lib/rag/ingest";
import { getInterventionById } from "../../src/lib/ai/knowledge-base/catalog";

interface SourceEntry {
  slug: string;
  title: string;
  source_type: GlobalDocumentMeta["sourceType"];
  publisher: string | null;
  year: number | null;
  url: string;
  file: string;
  format: "pdf" | "html";
  kb_reference?: string;
  citation: string;
}

const ROOT = path.resolve(__dirname, "../..");
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta a variável ${name} (rode com --env-file=.env.local).`);
    process.exit(1);
  }
  return v;
}

async function ensureFile(src: SourceEntry): Promise<Buffer> {
  const file = path.join(ROOT, src.file);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  console.log(`  baixando ${src.url}`);
  const res = await fetch(src.url, { headers: { "User-Agent": "Mozilla/5.0 (Sentinel RAG ingest)" } });
  if (!res.ok) throw new Error(`download falhou (${res.status}) — baixe manualmente para ${src.file}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}

/**
 * Respeita o charset declarado no HTML; sem declaração (caso do Planalto), usa UTF-8
 * se o arquivo for UTF-8 válido e windows-1252 caso contrário.
 */
function decodeHtml(buf: Buffer): string {
  const head = buf.toString("latin1").split(/<\/head>/i)[0];
  const declared = head.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  if (declared) return new TextDecoder(declared === "iso-8859-1" ? "windows-1252" : declared).decode(buf);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

async function pagesFor(src: SourceEntry): Promise<string[]> {
  const buf = await ensureFile(src);
  if (src.format === "html") return [htmlToText(decodeHtml(buf))];
  return extractPdfPages(new Uint8Array(buf));
}

async function main() {
  const admin = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  requireEnv("OPENAI_API_KEY");

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/rag/fontes.json"), "utf8")) as {
    documentos: SourceEntry[];
  };

  let failures = 0;
  for (const src of manifest.documentos) {
    if (only && only !== src.slug) continue;
    console.log(`• ${src.title}`);
    try {
      const pages = await pagesFor(src);
      if (!hasUsefulText(pages)) throw new Error("sem texto extraível (PDF escaneado?)");
      const r = await upsertGlobalDocument(
        admin,
        {
          slug: src.slug,
          title: src.title,
          sourceType: src.source_type,
          publisher: src.publisher,
          year: src.year,
          url: src.url,
          citation: src.citation,
        },
        pages,
        { force, paged: src.format === "pdf" }
      );
      console.log(
        r.skipped
          ? `  sem mudanças (${r.chunkCount} trechos)`
          : `  ${r.chunkCount} trechos${r.flaggedCount ? `, ${r.flaggedCount} marcados pela triagem (${r.flaggedReasons.join("; ")})` : ""}`
      );
    } catch (err) {
      failures++;
      console.error(`  ERRO: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Referências científicas curadas: uma "ficha" por referência, com as alegações
  // verificadas que o Sentinel usa. As que já entram com o texto completo acima ficam de fora.
  if (!only || only === "referencias") {
    const fullText = new Set(manifest.documentos.map((d) => d.kb_reference).filter(Boolean));
    const { data: refs, error } = await admin
      .from("kb_references")
      .select("id, citation_key, authors, year, title, publisher_or_journal, doi, url, evidence_type, certainty_level, region, abnt_citation, notes, kb_intervention_references(intervention_id, specific_claim)");
    if (error) throw new Error(error.message);

    console.log(`• Referências curadas (${refs?.length ?? 0})`);
    for (const ref of refs ?? []) {
      if (fullText.has(ref.citation_key)) continue;
      const claims = (ref.kb_intervention_references as { intervention_id: string; specific_claim: string | null }[])
        .filter((c) => c.specific_claim)
        .map((c) => `- ${getInterventionById(c.intervention_id)?.title ?? c.intervention_id}: ${c.specific_claim}`);
      const certainty = ref.certainty_level ? `; certeza da evidência: ${ref.certainty_level}` : "";
      const text = [
        `${ref.title}`,
        `${ref.authors} (${ref.year}). ${ref.publisher_or_journal ?? ""}`.trim(),
        `Tipo de evidência: ${ref.evidence_type}${certainty}${ref.region ? `; região: ${ref.region}` : ""}.`,
        ref.notes ? `Observações: ${ref.notes}` : "",
        claims.length ? `Alegações verificadas usadas no Sentinel:\n${claims.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      try {
        const r = await upsertGlobalDocument(
          admin,
          {
            slug: `ref-${ref.citation_key}`,
            title: ref.title,
            sourceType: "referencia_cientifica",
            publisher: ref.publisher_or_journal,
            year: ref.year,
            url: ref.doi ? `https://doi.org/${ref.doi}` : ref.url,
            citation: ref.abnt_citation,
          },
          [text],
          { force, paged: false }
        );
        if (!r.skipped) console.log(`  ${ref.citation_key}: ${r.chunkCount} trecho(s)`);
      } catch (err) {
        failures++;
        console.error(`  ERRO ${ref.citation_key}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (failures) {
    console.error(`\n${failures} documento(s) com erro.`);
    process.exit(1);
  }
  console.log("\nBase global atualizada.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
