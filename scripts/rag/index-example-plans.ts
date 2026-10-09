/**
 * Indexa na base global os planos de EXEMPLO: planos aprovados ou concluídos de empresas
 * com companies.share_plans_as_examples = true, anonimizados (src/lib/rag/example-plans.ts).
 * Também remove exemplos que deixaram de valer (empresa desmarcada, plano rejeitado…).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/rag/index-example-plans.ts
 *
 * Marcar uma empresa (só empresas de exemplo ou com autorização expressa):
 *   update companies set share_plans_as_examples = true where id = '…';
 */

import { createClient } from "@supabase/supabase-js";
import { buildExamplePlanText, exampleTitle } from "../../src/lib/rag/example-plans";
import { upsertGlobalDocument } from "../../src/lib/rag/ingest";
import type { AIRecommendation } from "../../src/lib/ai/pipeline/types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta a variável ${name} (rode com --env-file=.env.local).`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const admin = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  requireEnv("OPENAI_API_KEY");

  const { data: companies, error } = await admin
    .from("companies")
    .select("id, name, industry, employee_count, work_regime, departments(name)")
    .eq("share_plans_as_examples", true);
  if (error) throw new Error(error.message);

  const keep = new Set<string>();
  for (const company of companies ?? []) {
    const { data: plans } = await admin
      .from("action_plans")
      .select("id, status, risk_level, created_at, ai_recommendation, questionnaire_scales(name), action_outcomes(delta, outcome_status)")
      .eq("company_id", company.id)
      .in("status", ["APPROVED", "COMPLETED"]);

    console.log(`• ${company.name}: ${plans?.length ?? 0} plano(s) aprovado(s)`);
    for (const plan of plans ?? []) {
      const rec = (plan.ai_recommendation ?? {}) as Partial<AIRecommendation>;
      const outcome = (plan.action_outcomes as { delta: number | null; outcome_status: string }[]).find(
        (o) => o.outcome_status === "computed" && o.delta !== null
      );
      const dimension = (plan.questionnaire_scales as unknown as { name: string } | null)?.name ?? null;
      const companyInput = {
        name: company.name as string,
        industry: company.industry as string | null,
        employeeCount: company.employee_count as number | null,
        workRegime: company.work_regime as string | null,
        departmentNames: ((company.departments ?? []) as { name: string }[]).map((d) => d.name),
      };
      const text = buildExamplePlanText(
        {
          title: rec.title ?? "Plano de ação",
          dimension,
          riskLevel: plan.risk_level as "RED" | "YELLOW",
          status: plan.status as "APPROVED" | "COMPLETED",
          recommendation: rec,
          outcomeDelta: outcome?.delta ?? null,
        },
        companyInput
      );
      const slug = `plano-exemplo-${plan.id}`;
      keep.add(slug);
      const r = await upsertGlobalDocument(
        admin,
        {
          slug,
          title: `Plano de exemplo — ${dimension ?? "dimensão"}: ${exampleTitle(rec.title ?? "ação", companyInput)}`,
          sourceType: "plano_exemplo",
          publisher: "Sentinel (exemplo anonimizado)",
          year: new Date(plan.created_at as string).getFullYear(),
          url: null,
          citation: "Plano de ação de outra empresa, anonimizado pelo Sentinel.",
          originCompanyId: company.id as string,
        },
        [text],
        { paged: false }
      );
      if (!r.skipped) console.log(`  + ${slug} (${r.chunkCount} trecho(s))`);
    }
  }

  // Exemplos que não valem mais.
  const { data: existing } = await admin.from("kb_documents").select("id, slug").eq("source_type", "plano_exemplo");
  const stale = (existing ?? []).filter((d) => !keep.has(d.slug as string));
  if (stale.length) {
    await admin.from("kb_documents").delete().in("id", stale.map((d) => d.id));
    console.log(`Removidos ${stale.length} exemplo(s) que deixaram de valer.`);
  }
  console.log(`\nExemplos na base: ${keep.size}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
