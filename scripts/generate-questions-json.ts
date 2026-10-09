import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Gera o JSON de perguntas exibido em /sobre/metodologia.
// Uso: npx tsx --env-file=.env.local scripts/generate-questions-json.ts

// A simple script to extract QUESTIONS array from seed files using regex
function extractQuestions(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/const (?:QUESTIONS|ITEMS)[^=]*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];

  const arrayStr = "[" + match[1] + "]";

  try {
    // We need to evaluate the array string, which contains objects without quotes on keys.
    // We'll use a new Function to return it.
    const getQuestions = new Function(`return ${arrayStr};`);
    return getQuestions();
  } catch (e) {
    console.error("Failed to parse", filePath, e);
    return [];
  }
}

/**
 * COPSOQ II: a versão portuguesa oficial vem do banco (migração
 * 20261009124759_copsoq_ii_oficial.sql). O antigo scripts/seed-copsoq.ts tinha uma
 * versão não oficial e foi desativado.
 */
async function fetchOfficialCopsoqII() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: inst, error: instError } = await sb
    .from("questionnaire_instruments")
    .select("id")
    .eq("code", "copsoq_ii")
    .single();
  if (instError || !inst) throw new Error("COPSOQ II oficial não encontrado no banco.");

  const { data, error } = await sb
    .from("questionnaire_items")
    .select("text, order_index, is_inverted, short_version, medium_version, long_version, questionnaire_scales(name)")
    .eq("instrument_id", inst.id)
    .order("order_index");
  if (error) throw error;

  return (data ?? []).map((q) => ({
    dimensionName: (q.questionnaire_scales as unknown as { name: string }).name,
    orderIndex: q.order_index,
    isInverted: q.is_inverted,
    short: q.short_version,
    medium: q.medium_version,
    long: q.long_version,
    text: q.text,
  }));
}

async function main() {
  const output = {
    "copsoq-ii": await fetchOfficialCopsoqII(),
    "copsoq-iii": extractQuestions(path.join(__dirname, "seed-copsoq-iii.ts")),
    "jss": extractQuestions(path.join(__dirname, "seed-jss.ts")),
    "olbi": extractQuestions(path.join(__dirname, "seed-olbi.ts")),
  };

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
