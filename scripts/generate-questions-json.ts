import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Gera o JSON de perguntas exibido em /sobre/metodologia, direto do banco.
// Uso: npx tsx --env-file=.env.local scripts/generate-questions-json.ts
//
// Todos os instrumentos ativos vêm das migrações (versões validadas):
// - COPSOQ II: 20261009124759_copsoq_ii_oficial.sql
// - COPSOQ III, JSS e OLBI: 20261012174401_instrumentos_validados.sql
// Os antigos seeds (seed-copsoq*.ts, seed-jss.ts, seed-olbi.ts) gravavam versões não
// validadas e foram desativados.

const INSTRUMENTS: Record<string, string> = {
  "copsoq-ii": "copsoq_ii",
  "copsoq-iii": "copsoq_iii",
  jss: "jss",
  olbi: "olbi",
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const output: Record<string, unknown[]> = {};
  for (const [key, code] of Object.entries(INSTRUMENTS)) {
    const { data: inst } = await sb.from("questionnaire_instruments").select("id").eq("code", code).single();
    if (!inst) throw new Error(`Instrumento ${code} não encontrado no banco.`);
    const { data, error } = await sb
      .from("questionnaire_items")
      .select("text, order_index, is_inverted, short_version, medium_version, long_version, questionnaire_scales(name)")
      .eq("instrument_id", inst.id)
      .order("order_index");
    if (error) throw error;
    output[key] = (data ?? []).map((q) => ({
      dimensionName: (q.questionnaire_scales as unknown as { name: string }).name,
      orderIndex: q.order_index,
      isInverted: q.is_inverted,
      short: q.short_version,
      medium: q.medium_version,
      long: q.long_version,
      text: q.text,
    }));
    console.log(`${code}: ${output[key].length} perguntas`);
  }

  fs.writeFileSync(
    path.join(__dirname, "../src/app/(dashboard)/sobre/metodologia/questions-data.json"),
    JSON.stringify(output, null, 2)
  );
  console.log("Questions JSON generated successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
