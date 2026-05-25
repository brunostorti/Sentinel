/**
 * Seed script: populates questionnaire_instruments, questionnaire_scales,
 * and questionnaire_items with the JSS (Job Satisfaction Survey) question bank.
 *
 * Usage: npx tsx scripts/seed-jss.ts
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Source: Spector, P. E. (1985). Measurement of human service staff satisfaction:
 * Development of the Job Satisfaction Survey. American Journal of Community
 * Psychology, 13(6), 693-713.
 *
 * PT-BR translation: Validation by UNICAMP (2013).
 *
 * The JSS contains 36 items across 9 subscales (4 items each).
 * Uses a 6-point Likert agree/disagree scale (likert_agree_6).
 * 18 items are reverse-scored.
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
}

interface QuestionDef {
  scaleName: string;
  text: string;
  isInverted: boolean;
  orderIndex: number;
}

// ---------------------------------------------------------------------------
// JSS Subscales (9 subscales, 4 items each)
// ---------------------------------------------------------------------------

const SCALES: ScaleDef[] = [
  {
    name: "Pagamento",
    category: "Pay",
    description: "Satisfação com o salário e remuneração recebida",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "recognition",
  },
  {
    name: "Promoção",
    category: "Promotion",
    description: "Satisfação com as oportunidades de promoção e crescimento na carreira",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "security",
  },
  {
    name: "Supervisão",
    category: "Supervision",
    description: "Satisfação com o supervisor imediato e a qualidade da supervisão",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "leadership",
  },
  {
    name: "Benefícios",
    category: "Fringe Benefits",
    description: "Satisfação com os benefícios oferecidos pela organização",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "recognition",
  },
  {
    name: "Recompensas",
    category: "Contingent Rewards",
    description: "Satisfação com o reconhecimento e as recompensas por bom desempenho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "recognition",
  },
  {
    name: "Procedimentos",
    category: "Operating Conditions",
    description: "Satisfação com as regras, procedimentos e burocracia organizacional",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "workload",
  },
  {
    name: "Colegas de Trabalho",
    category: "Coworkers",
    description: "Satisfação com os colegas de trabalho e o relacionamento interpessoal",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "social",
  },
  {
    name: "Natureza do Trabalho",
    category: "Nature of Work",
    description: "Satisfação com o tipo de atividades e tarefas realizadas no trabalho",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "meaning",
  },
  {
    name: "Comunicação",
    category: "Communication",
    description: "Satisfação com a comunicação e o fluxo de informação na organização",
    scoringDirection: "HIGH_IS_FAVORABLE",
    universalCategoryCode: "communication",
  },
];

// ---------------------------------------------------------------------------
// JSS Questions (36 items)
//
// Based on the UNICAMP 2013 PT-BR validation of Spector's JSS.
// Inverted items: 2, 4, 6, 8, 10, 12, 14, 16, 18, 19, 21, 23, 24, 26, 29,
//                 31, 32, 34, 36 (18 total).
// ---------------------------------------------------------------------------

const QUESTIONS: QuestionDef[] = [
  // ── Pagamento (Pay) — Items 1, 10, 19, 28 ──
  {
    scaleName: "Pagamento",
    orderIndex: 1,
    isInverted: false,
    text: "Sinto que estou sendo pago de forma justa pelo trabalho que faço.",
  },
  {
    scaleName: "Pagamento",
    orderIndex: 10,
    isInverted: true,
    text: "Os aumentos são poucos e distantes entre si.",
  },
  {
    scaleName: "Pagamento",
    orderIndex: 19,
    isInverted: true,
    text: "Sinto-me desvalorizado pela organização quando penso no que me pagam.",
  },
  {
    scaleName: "Pagamento",
    orderIndex: 28,
    isInverted: false,
    text: "Sinto-me satisfeito com minhas chances de aumento salarial.",
  },

  // ── Promoção (Promotion) — Items 2, 11, 20, 33 ──
  {
    scaleName: "Promoção",
    orderIndex: 2,
    isInverted: true,
    text: "No meu trabalho, há realmente muito pouca chance de promoção.",
  },
  {
    scaleName: "Promoção",
    orderIndex: 11,
    isInverted: false,
    text: "Aqueles que fazem bem o seu trabalho têm uma boa chance de serem promovidos.",
  },
  {
    scaleName: "Promoção",
    orderIndex: 20,
    isInverted: false,
    text: "As pessoas progridem aqui tão rápido quanto em outros lugares.",
  },
  {
    scaleName: "Promoção",
    orderIndex: 33,
    isInverted: false,
    text: "Estou satisfeito com as minhas chances de promoção.",
  },

  // ── Supervisão (Supervision) — Items 3, 12, 21, 30 ──
  {
    scaleName: "Supervisão",
    orderIndex: 3,
    isInverted: false,
    text: "Meu supervisor é bastante competente em fazer seu trabalho.",
  },
  {
    scaleName: "Supervisão",
    orderIndex: 12,
    isInverted: true,
    text: "Meu supervisor é injusto comigo.",
  },
  {
    scaleName: "Supervisão",
    orderIndex: 21,
    isInverted: true,
    text: "Meu supervisor demonstra pouco interesse nos sentimentos dos subordinados.",
  },
  {
    scaleName: "Supervisão",
    orderIndex: 30,
    isInverted: false,
    text: "Gosto do meu supervisor.",
  },

  // ── Benefícios (Fringe Benefits) — Items 4, 13, 22, 29 ──
  {
    scaleName: "Benefícios",
    orderIndex: 4,
    isInverted: true,
    text: "Não estou satisfeito com os benefícios que recebo.",
  },
  {
    scaleName: "Benefícios",
    orderIndex: 13,
    isInverted: false,
    text: "Os benefícios que recebemos são tão bons quanto os que a maioria das outras organizações oferece.",
  },
  {
    scaleName: "Benefícios",
    orderIndex: 22,
    isInverted: false,
    text: "O pacote de benefícios que temos é justo.",
  },
  {
    scaleName: "Benefícios",
    orderIndex: 29,
    isInverted: true,
    text: "Há benefícios que não temos e que deveríamos ter.",
  },

  // ── Recompensas (Contingent Rewards) — Items 5, 14, 23, 32 ──
  {
    scaleName: "Recompensas",
    orderIndex: 5,
    isInverted: false,
    text: "Quando faço um bom trabalho, recebo o devido reconhecimento.",
  },
  {
    scaleName: "Recompensas",
    orderIndex: 14,
    isInverted: true,
    text: "Não sinto que o trabalho que faço é apreciado.",
  },
  {
    scaleName: "Recompensas",
    orderIndex: 23,
    isInverted: true,
    text: "Há poucas recompensas para aqueles que trabalham aqui.",
  },
  {
    scaleName: "Recompensas",
    orderIndex: 32,
    isInverted: true,
    text: "Não sinto que meus esforços são recompensados da forma que deveriam ser.",
  },

  // ── Procedimentos (Operating Conditions) — Items 6, 15, 24, 31 ──
  {
    scaleName: "Procedimentos",
    orderIndex: 6,
    isInverted: true,
    text: "Muitas das nossas regras e procedimentos dificultam um bom trabalho.",
  },
  {
    scaleName: "Procedimentos",
    orderIndex: 15,
    isInverted: false,
    text: "Meus esforços para fazer um bom trabalho raramente são bloqueados por burocracia.",
  },
  {
    scaleName: "Procedimentos",
    orderIndex: 24,
    isInverted: true,
    text: "Tenho muito o que fazer no trabalho.",
  },
  {
    scaleName: "Procedimentos",
    orderIndex: 31,
    isInverted: true,
    text: "Tenho muita papelada.",
  },

  // ── Colegas de Trabalho (Coworkers) — Items 7, 16, 25, 34 ──
  {
    scaleName: "Colegas de Trabalho",
    orderIndex: 7,
    isInverted: false,
    text: "Gosto das pessoas com quem trabalho.",
  },
  {
    scaleName: "Colegas de Trabalho",
    orderIndex: 16,
    isInverted: true,
    text: "Acho que tenho que trabalhar mais no meu emprego por causa da incompetência das pessoas com quem trabalho.",
  },
  {
    scaleName: "Colegas de Trabalho",
    orderIndex: 25,
    isInverted: false,
    text: "Gosto dos meus colegas de trabalho.",
  },
  {
    scaleName: "Colegas de Trabalho",
    orderIndex: 34,
    isInverted: true,
    text: "Há muita briga e discussão no trabalho.",
  },

  // ── Natureza do Trabalho (Nature of Work) — Items 8, 17, 27, 35 ──
  {
    scaleName: "Natureza do Trabalho",
    orderIndex: 8,
    isInverted: true,
    text: "Às vezes, sinto que meu trabalho não tem sentido.",
  },
  {
    scaleName: "Natureza do Trabalho",
    orderIndex: 17,
    isInverted: false,
    text: "Gosto de fazer as coisas que faço no trabalho.",
  },
  {
    scaleName: "Natureza do Trabalho",
    orderIndex: 27,
    isInverted: false,
    text: "Sinto um senso de orgulho ao fazer o meu trabalho.",
  },
  {
    scaleName: "Natureza do Trabalho",
    orderIndex: 35,
    isInverted: false,
    text: "Meu trabalho é agradável.",
  },

  // ── Comunicação (Communication) — Items 9, 18, 26, 36 ──
  {
    scaleName: "Comunicação",
    orderIndex: 9,
    isInverted: false,
    text: "A comunicação parece boa nesta organização.",
  },
  {
    scaleName: "Comunicação",
    orderIndex: 18,
    isInverted: true,
    text: "Os objetivos desta organização não são claros para mim.",
  },
  {
    scaleName: "Comunicação",
    orderIndex: 26,
    isInverted: true,
    text: "Muitas vezes sinto que não sei o que está acontecendo na organização.",
  },
  {
    scaleName: "Comunicação",
    orderIndex: 36,
    isInverted: true,
    text: "As tarefas do meu trabalho não são totalmente explicadas.",
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding JSS (Job Satisfaction Survey) instrument, scales, and items...\n");

  // 1. Upsert the JSS instrument into questionnaire_instruments
  const { data: instrumentData, error: instrumentError } = await supabase
    .from("questionnaire_instruments")
    .upsert(
      {
        code: "jss",
        name: "JSS — Job Satisfaction Survey",
        description:
          "Job Satisfaction Survey de Paul Spector (1985). Tradução e validação brasileira pela UNICAMP (2013). Avalia a satisfação no trabalho em 9 facetas com 36 itens.",
        version_label: "1985",
        source: "Spector, P.E. (1985) / UNICAMP (2013) — Validação PT-BR",
        total_questions: 36,
        estimated_minutes: 10,
        is_active: true,
      },
      { onConflict: "code" }
    )
    .select("id")
    .single();

  if (instrumentError) {
    console.error("Error upserting JSS instrument:", instrumentError.message);
    process.exit(1);
  }

  const instrumentId = instrumentData.id;
  console.log(`✓ JSS instrument upserted (id: ${instrumentId})`);

  // 2. Look up response format: likert_agree_6
  const { data: formatData, error: formatError } = await supabase
    .from("response_formats")
    .select("id")
    .eq("code", "likert_agree_6")
    .single();

  if (formatError || !formatData) {
    console.error("Error finding likert_agree_6 response format:", formatError?.message);
    process.exit(1);
  }

  const responseFormatId = formatData.id;
  console.log(`✓ Response format likert_agree_6 found (id: ${responseFormatId})`);

  // 3. Look up universal categories by code
  const categoryCodes = [...new Set(SCALES.map((s) => s.universalCategoryCode))];
  const { data: categories, error: catError } = await supabase
    .from("universal_categories")
    .select("id, code")
    .in("code", categoryCodes);

  if (catError || !categories) {
    console.error("Error fetching universal categories:", catError?.message);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.code, cat.id);
  }

  // Verify all required categories exist
  for (const code of categoryCodes) {
    if (!categoryMap.has(code)) {
      console.error(`Universal category not found: "${code}"`);
      process.exit(1);
    }
  }

  console.log(`✓ ${categories.length} universal categories found`);

  // 4. Clear existing JSS data (if re-running)
  const { count: existingItems } = await supabase
    .from("questionnaire_items")
    .select("*", { count: "exact", head: true })
    .eq("instrument_id", instrumentId);

  if (existingItems && existingItems > 0) {
    console.log(`\nFound ${existingItems} existing JSS items. Clearing...`);
    await supabase
      .from("questionnaire_items")
      .delete()
      .eq("instrument_id", instrumentId);
    console.log("JSS items cleared.");
  }

  const { count: existingScales } = await supabase
    .from("questionnaire_scales")
    .select("*", { count: "exact", head: true })
    .eq("instrument_id", instrumentId);

  if (existingScales && existingScales > 0) {
    console.log(`Found ${existingScales} existing JSS scales. Clearing...`);
    await supabase
      .from("questionnaire_scales")
      .delete()
      .eq("instrument_id", instrumentId);
    console.log("JSS scales cleared.\n");
  }

  // 5. Insert scales
  const scaleRows = SCALES.map((s, idx) => ({
    name: s.name,
    category: s.category,
    description: s.description,
    scoring_direction: s.scoringDirection,
    short_version: true,
    medium_version: true,
    long_version: true,
    instrument_id: instrumentId,
    universal_category_id: categoryMap.get(s.universalCategoryCode)!,
    display_order: idx + 1,
  }));

  const { data: insertedScales, error: scaleError } = await supabase
    .from("questionnaire_scales")
    .insert(scaleRows)
    .select("id, name");

  if (scaleError) {
    console.error("Error inserting scales:", scaleError.message);
    process.exit(1);
  }

  console.log(`✓ ${insertedScales.length} scales inserted`);

  // Build name -> id map
  const scaleMap = new Map<string, string>();
  for (const s of insertedScales) {
    scaleMap.set(s.name, s.id);
  }

  // 6. Insert questions
  const questionRows = QUESTIONS.map((q) => {
    const dimensionId = scaleMap.get(q.scaleName);
    if (!dimensionId) {
      console.error(`Scale not found: "${q.scaleName}" for question #${q.orderIndex}`);
      process.exit(1);
    }
    return {
      dimension_id: dimensionId,
      text: q.text,
      is_inverted: q.isInverted,
      order_index: q.orderIndex,
      short_version: true,
      medium_version: true,
      long_version: true,
      instrument_id: instrumentId,
      response_format_id: responseFormatId,
      item_level: null,
    };
  });

  const { error: qError } = await supabase
    .from("questionnaire_items")
    .insert(questionRows);

  if (qError) {
    console.error("Error inserting questions:", qError.message);
    process.exit(1);
  }

  // 7. Summary
  const invertedCount = QUESTIONS.filter((q) => q.isInverted).length;
  const scalesSummary = SCALES.map((s) => {
    const items = QUESTIONS.filter((q) => q.scaleName === s.name);
    return `  ${s.name} (${s.category}): ${items.length} itens → ${s.universalCategoryCode}`;
  }).join("\n");

  console.log(`✓ ${QUESTIONS.length} questions inserted\n`);
  console.log("=== JSS SEED SUMMARY ===");
  console.log(`Instrument: JSS — Job Satisfaction Survey`);
  console.log(`Total scales: ${SCALES.length}`);
  console.log(`Total questions: ${QUESTIONS.length}`);
  console.log(`Inverted items: ${invertedCount}`);
  console.log(`Response format: likert_agree_6 (6-point agree/disagree)`);
  console.log(`Scoring: All scales HIGH_IS_FAVORABLE`);
  console.log(`\nScales breakdown:`);
  console.log(scalesSummary);
  console.log("========================\n");
}

seed().catch(console.error);
