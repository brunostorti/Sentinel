/**
 * Seed script: populates questionnaire_instruments, questionnaire_scales,
 * and questionnaire_items with the OLBI (Oldenburg Burnout Inventory).
 *
 * Usage: npx tsx scripts/seed-olbi.ts
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Source: Demerouti, E., Bakker, A. B., Vardakou, I., & Kantas, A. (2003).
 * The convergent validity of two burnout instruments: A multi-trait
 * multi-method analysis. European Journal of Psychological Assessment, 19(1).
 *
 * PT-BR translation — 16 items, 2 subscales (Exaustao, Desengajamento).
 * 4-point Likert agreement scale (response_format: likert_agree_4).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScoringDirection = "HIGH_IS_RISK" | "HIGH_IS_FAVORABLE";

interface ScaleDef {
  name: string;
  category: string;
  description: string;
  scoringDirection: ScoringDirection;
  universalCategoryCode: string;
  displayOrder: number;
}

interface ItemDef {
  scaleName: string;
  text: string;
  isInverted: boolean;
  orderIndex: number;
}

// ---------------------------------------------------------------------------
// OLBI Scales (2 subscales)
// ---------------------------------------------------------------------------

const SCALES: ScaleDef[] = [
  {
    name: "Exaustao",
    category: "Burnout",
    description:
      "Consequencias da tensao fisica, afetiva e cognitiva prolongada no trabalho, " +
      "resultando em sentimentos de fadiga, necessidade de descanso e esgotamento geral.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "burnout",
    displayOrder: 1,
  },
  {
    name: "Desengajamento",
    category: "Burnout",
    description:
      "Distanciamento do conteudo e do significado do trabalho, " +
      "incluindo atitudes negativas, cinicas e mecanicas em relacao as tarefas profissionais.",
    scoringDirection: "HIGH_IS_RISK",
    universalCategoryCode: "meaning",
    displayOrder: 2,
  },
];

// ---------------------------------------------------------------------------
// OLBI Items (16 questions)
// ---------------------------------------------------------------------------
// Subscale assignment:
//   Disengagement (D): items 1, 3, 5, 7, 9, 11, 14, 15
//   Exhaustion (E):    items 2, 4, 6, 8, 10, 12, 13, 16
//
// Inverted items (positively worded — reverse-scored):
//   1, 5, 7, 10, 13, 14, 15
// ---------------------------------------------------------------------------

const ITEMS: ItemDef[] = [
  // Item 1 — Disengagement, Inverted
  {
    scaleName: "Desengajamento",
    orderIndex: 1,
    isInverted: true,
    text: "Sempre encontro coisas novas e interessantes no meu trabalho.",
  },
  // Item 2 — Exhaustion
  {
    scaleName: "Exaustao",
    orderIndex: 2,
    isInverted: false,
    text: "Ha dias em que me sinto cansado(a) antes mesmo de chegar ao trabalho.",
  },
  // Item 3 — Disengagement
  {
    scaleName: "Desengajamento",
    orderIndex: 3,
    isInverted: false,
    text: "Cada vez mais, tendo a falar do meu trabalho de forma negativa.",
  },
  // Item 4 — Exhaustion
  {
    scaleName: "Exaustao",
    orderIndex: 4,
    isInverted: false,
    text: "Depois do trabalho, preciso de mais tempo para relaxar e me sentir melhor.",
  },
  // Item 5 — Disengagement, Inverted
  {
    scaleName: "Desengajamento",
    orderIndex: 5,
    isInverted: true,
    text: "Consigo lidar bem com as demandas do meu trabalho.",
  },
  // Item 6 — Exhaustion
  {
    scaleName: "Exaustao",
    orderIndex: 6,
    isInverted: false,
    text: "Ultimamente, tendo a pensar menos durante o trabalho e faze-lo quase mecanicamente.",
  },
  // Item 7 — Disengagement, Inverted
  {
    scaleName: "Desengajamento",
    orderIndex: 7,
    isInverted: true,
    text: "Considero meu trabalho um desafio positivo.",
  },
  // Item 8 — Exhaustion
  {
    scaleName: "Exaustao",
    orderIndex: 8,
    isInverted: false,
    text: "Durante o trabalho, frequentemente me sinto emocionalmente esgotado(a).",
  },
  // Item 9 — Disengagement
  {
    scaleName: "Desengajamento",
    orderIndex: 9,
    isInverted: false,
    text: "Com o tempo, perdi o interesse pelo meu trabalho.",
  },
  // Item 10 — Exhaustion, Inverted
  {
    scaleName: "Exaustao",
    orderIndex: 10,
    isInverted: true,
    text: "Depois do trabalho, geralmente me sinto bem e com energia.",
  },
  // Item 11 — Disengagement
  {
    scaleName: "Desengajamento",
    orderIndex: 11,
    isInverted: false,
    text: "As vezes me sinto enjoado(a) com as tarefas do meu trabalho.",
  },
  // Item 12 — Exhaustion
  {
    scaleName: "Exaustao",
    orderIndex: 12,
    isInverted: false,
    text: "Depois do trabalho, costumo me sentir cansado(a) e sem energia.",
  },
  // Item 13 — Exhaustion, Inverted
  {
    scaleName: "Exaustao",
    orderIndex: 13,
    isInverted: true,
    text: "Geralmente, consigo administrar bem a quantidade de trabalho.",
  },
  // Item 14 — Disengagement, Inverted
  {
    scaleName: "Desengajamento",
    orderIndex: 14,
    isInverted: true,
    text: "Este e o unico tipo de trabalho que me imagino fazendo.",
  },
  // Item 15 — Disengagement, Inverted
  {
    scaleName: "Desengajamento",
    orderIndex: 15,
    isInverted: true,
    text: "Sinto que o meu trabalho e cada vez mais uma experiencia positiva.",
  },
  // Item 16 — Exhaustion
  {
    scaleName: "Exaustao",
    orderIndex: 16,
    isInverted: false,
    text: "Durante o trabalho, frequentemente me sinto fisicamente exausto(a).",
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding OLBI instrument, scales, and items...\n");

  // ── 1. Upsert instrument ──────────────────────────────────────────────────
  const { data: instrument, error: instrError } = await supabase
    .from("questionnaire_instruments")
    .upsert(
      {
        code: "olbi",
        name: "OLBI — Oldenburg Burnout Inventory",
        description:
          "Inventario de Burnout de Oldenburg (Demerouti et al., 2003). " +
          "Avalia duas dimensoes centrais do burnout: exaustao e desengajamento. " +
          "16 itens com escala Likert de 4 pontos (concordancia).",
        total_questions: 16,
        estimated_minutes: 5,
        is_active: true,
      },
      { onConflict: "code" }
    )
    .select("id")
    .single();

  if (instrError) {
    console.error("Error upserting instrument:", instrError.message);
    process.exit(1);
  }

  const instrumentId = instrument.id;
  console.log(`Instrument upserted: ${instrumentId}`);

  // ── 2. Look up response format ────────────────────────────────────────────
  const { data: format, error: fmtError } = await supabase
    .from("response_formats")
    .select("id")
    .eq("code", "likert_agree_4")
    .single();

  if (fmtError || !format) {
    console.error("Response format 'likert_agree_4' not found:", fmtError?.message);
    process.exit(1);
  }

  const responseFormatId = format.id;
  console.log(`Response format found: ${responseFormatId}`);

  // ── 3. Look up universal categories ───────────────────────────────────────
  const { data: categories, error: catError } = await supabase
    .from("universal_categories")
    .select("id, code")
    .in("code", ["burnout", "meaning"]);

  if (catError || !categories || categories.length < 2) {
    console.error("Universal categories not found:", catError?.message);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.code, cat.id);
  }
  console.log(`Universal categories found: burnout=${categoryMap.get("burnout")}, meaning=${categoryMap.get("meaning")}`);

  // ── 4. Clear existing OLBI scales and items ───────────────────────────────
  const { count: existingScales } = await supabase
    .from("questionnaire_scales")
    .select("*", { count: "exact", head: true })
    .eq("instrument_id", instrumentId);

  if (existingScales && existingScales > 0) {
    console.log(`\nFound ${existingScales} existing OLBI scales. Clearing...`);
    await supabase
      .from("questionnaire_items")
      .delete()
      .eq("instrument_id", instrumentId);
    await supabase
      .from("questionnaire_scales")
      .delete()
      .eq("instrument_id", instrumentId);
    console.log("Existing OLBI data cleared.");
  }

  // ── 5. Insert scales ─────────────────────────────────────────────────────
  const scaleRows = SCALES.map((s) => ({
    name: s.name,
    category: s.category,
    description: s.description,
    scoring_direction: s.scoringDirection,
    short_version: true,
    medium_version: true,
    long_version: true,
    instrument_id: instrumentId,
    universal_category_id: categoryMap.get(s.universalCategoryCode)!,
    display_order: s.displayOrder,
  }));

  const { data: insertedScales, error: scaleError } = await supabase
    .from("questionnaire_scales")
    .insert(scaleRows)
    .select("id, name");

  if (scaleError) {
    console.error("Error inserting scales:", scaleError.message);
    process.exit(1);
  }

  console.log(`\n${insertedScales.length} scales inserted`);

  // Build name -> id map
  const scaleMap = new Map<string, string>();
  for (const s of insertedScales) {
    scaleMap.set(s.name, s.id);
  }

  // ── 6. Insert items ──────────────────────────────────────────────────────
  const itemRows = ITEMS.map((item) => {
    const dimensionId = scaleMap.get(item.scaleName);
    if (!dimensionId) {
      console.error(`Scale not found: "${item.scaleName}" for item #${item.orderIndex}`);
      process.exit(1);
    }
    return {
      dimension_id: dimensionId,
      text: item.text,
      is_inverted: item.isInverted,
      order_index: item.orderIndex,
      short_version: true,
      medium_version: true,
      long_version: true,
      instrument_id: instrumentId,
      response_format_id: responseFormatId,
      item_level: null,
    };
  });

  const { error: itemError } = await supabase
    .from("questionnaire_items")
    .insert(itemRows);

  if (itemError) {
    console.error("Error inserting items:", itemError.message);
    process.exit(1);
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  const exhaustionItems = ITEMS.filter((i) => i.scaleName === "Exaustao");
  const disengagementItems = ITEMS.filter((i) => i.scaleName === "Desengajamento");
  const invertedItems = ITEMS.filter((i) => i.isInverted);

  console.log(`${ITEMS.length} items inserted\n`);
  console.log("=== OLBI SEED SUMMARY ===");
  console.log(`Total items:          ${ITEMS.length}`);
  console.log(`Exaustao items:       ${exhaustionItems.length} (${exhaustionItems.map((i) => i.orderIndex).join(", ")})`);
  console.log(`Desengajamento items: ${disengagementItems.length} (${disengagementItems.map((i) => i.orderIndex).join(", ")})`);
  console.log(`Inverted items:       ${invertedItems.length} (${invertedItems.map((i) => i.orderIndex).join(", ")})`);
  console.log(`Response format:      likert_agree_4`);
  console.log(`Scoring direction:    both HIGH_IS_RISK`);
  console.log("=========================\n");
}

seed().catch(console.error);
