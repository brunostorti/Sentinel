/**
 * Experimento da banca: DUAS empresas fictícias com o MESMO resultado na pesquisa
 * (as mesmas respostas, setor por setor) e contextos diferentes — perfil, orçamento,
 * CIPA, políticas internas, histórico de ações e denúncias. Serve para mostrar que os
 * planos e o chat levam em conta a realidade de cada empresa.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/demo/seed-demo-companies.ts           # cria
 *   npx tsx --env-file=.env.local scripts/demo/seed-demo-companies.ts --reset   # apaga e recria
 *
 * Login das contas de RH: e-mails rh@apice.demo e rh@bussola.demo. A senha vem de
 * DEMO_USERS_PASSWORD; se a variável não existir, uma senha aleatória é gerada e salva em
 * .env.demo.local (fora do git), nunca impressa no terminal.
 *
 * Tudo aqui é fictício: empresas, CNPJs, pessoas, documentos e respostas.
 */

import fs from "fs";
import path from "path";
import { randomBytes, randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EMBEDDING_MODEL_ID } from "../../src/lib/rag/config";
import { ingestPages } from "../../src/lib/rag/ingest";
import { LGPD_CONSENT_VERSION } from "../../src/lib/lgpd";
import { computeCompleteness } from "../../src/lib/ai/profile/completeness";
import type { CompanyProfile } from "../../src/lib/ai/profile/schema";

const ROOT = path.resolve(__dirname, "../..");
const RESET = process.argv.includes("--reset");
const SURVEY_TITLE = "Pesquisa psicossocial 2026 — COPSOQ II";

/* ── Respostas: geradas uma vez (semente fixa) e copiadas para as duas empresas ── */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261010);
const normal = (sd: number) => {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd;
};

interface DeptSpec {
  name: string;
  invited: number;
  responses: number;
  /** Escore-alvo (0–100, na escala da dimensão) onde o setor foge do padrão. */
  targets: Record<string, number>;
}

const DEPARTMENTS: DeptSpec[] = [
  {
    name: "Contábil",
    invited: 18,
    responses: 16,
    targets: {
      "Exigências quantitativas": 80,
      "Ritmo de trabalho": 78,
      "Exigências cognitivas": 70,
      "Conflito trabalho/família": 76,
      Previsibilidade: 35,
      "Influência no trabalho": 38,
      Burnout: 72,
      Stress: 66,
      "Problemas em dormir": 62,
      "Sintomas depressivos": 40,
      "Saúde geral": 55,
    },
  },
  {
    name: "Atendimento ao Cliente",
    invited: 14,
    responses: 12,
    targets: {
      "Exigências emocionais": 80,
      "Ritmo de trabalho": 72,
      "Qualidade da liderança": 32,
      "Apoio social de superiores": 30,
      "Recompensas (reconhecimento)": 35,
      "Justiça e respeito": 38,
      "Confiança vertical": 42,
      "Comportamentos ofensivos": 32,
      Stress: 64,
      Burnout: 58,
      "Sintomas depressivos": 46,
    },
  },
  { name: "Departamento Pessoal", invited: 10, responses: 9, targets: { "Recompensas (reconhecimento)": 45, Previsibilidade: 50 } },
  // Grupos pequenos: ficam ocultos pela regra de 5 (juntos somam 5, sem supressão complementar).
  { name: "Tecnologia", invited: 4, responses: 3, targets: {} },
  { name: "Diretoria", invited: 3, responses: 2, targets: {} },
];

interface Item {
  id: string;
  dimension: string;
  direction: "HIGH_IS_RISK" | "HIGH_IS_FAVORABLE";
  isInverted: boolean;
  reference: number | null;
}

/** Linhas de respostas por setor: [setor][respondente] = { itemId: escore bruto }. */
function generateAnswers(items: Item[]): Map<string, Record<string, number>[]> {
  const out = new Map<string, Record<string, number>[]>();
  for (const dept of DEPARTMENTS) {
    const people: Record<string, number>[] = [];
    for (let r = 0; r < dept.responses; r++) {
      const personal = normal(8); // pessoa mais ou menos afetada que a média do setor
      const answers: Record<string, number> = {};
      for (const item of items) {
        const sign = item.direction === "HIGH_IS_RISK" ? 1 : -1;
        // Padrão: referência nacional (manual, tabela 3) levemente favorável.
        const base = item.reference !== null ? (item.reference - 1) * 25 - sign * 6 : sign > 0 ? 35 : 65;
        const target = dept.targets[item.dimension] ?? base;
        const value = Math.min(100, Math.max(0, target + sign * personal + normal(14)));
        const rounded = Math.round(value / 25) * 25;
        // Item invertido: a pessoa responde no sentido contrário; o banco desinverte.
        answers[item.id] = item.isInverted ? 100 - rounded : rounded;
      }
      people.push(answers);
    }
    out.set(dept.name, people);
  }
  return out;
}

/* ── Contextos ── */

interface CompanySpec {
  slug: string;
  docsDir: string;
  company: { name: string; cnpj: string; industry: string; employee_count: number; work_regime: "presencial" | "remoto" | "hibrido" };
  profile: Record<string, unknown>;
  history: { title: string; description: string; year_started: number; outcome: string; outcome_notes: string }[];
  reports: { occurrence_type: string; description: string }[];
  hr: { email: string; name: string };
}

const COMPANIES: CompanySpec[] = [
  {
    slug: "apice",
    docsDir: "scripts/demo/empresas/apice",
    company: {
      name: "Ápice Contabilidade Ltda.",
      cnpj: "11.222.333/0001-01",
      industry: "Serviços contábeis e de departamento pessoal para pequenas empresas",
      employee_count: 49,
      work_regime: "presencial",
    },
    profile: {
      annual_budget_brl: 25000,
      budget_per_employee_year_brl: 510,
      budget_horizon: "ano_corrente",
      budget_flexibility: "rigid",
      existing_wellbeing_spend_brl: 18000,
      hr_team_size: 1,
      has_dedicated_hr: false,
      has_internal_training: false,
      has_occupational_health: true,
      has_compliance_officer: false,
      decision_speed: "slow",
      culture_type: "family",
      declared_values: ["confiança", "rigor técnico"],
      workforce_composition: { avg_age: 38, regime_split: { clt: 1 }, shift_pattern: "diurno" },
      predominant_role_type: "office",
      regions: ["Campinas - SP"],
      has_remote: false,
      has_shift_workers: false,
      has_unionized_workers: true,
      constraints: [
        "não terceirizar: congelamento de novos fornecedores até dezembro de 2026",
        "sem app: equipe sem celular corporativo; ações devem ser presenciais",
      ],
      preferred_modalities: ["presencial"],
      avoid_modalities: ["online"],
    },
    history: [
      {
        title: "Programa de Apoio ao Empregado (PAE) com clínica local",
        description: "Psicoterapia breve presencial e plantão telefônico, contrato pago até março de 2027.",
        year_started: 2025,
        outcome: "partial",
        outcome_notes: "Adesão de 4% em 2025; divulgado uma única vez, por e-mail.",
      },
      {
        title: "Palestra anual sobre estresse",
        description: "Palestra de 1 hora com psicóloga convidada.",
        year_started: 2025,
        outcome: "unsuccessful",
        outcome_notes: "Realizada durante o fechamento contábil; sem mudança percebida.",
      },
    ],
    reports: [],
    hr: { email: "rh@apice.demo", name: "Renata Lopes (RH)" },
  },
  {
    slug: "bussola",
    docsDir: "scripts/demo/empresas/bussola",
    company: {
      name: "Bússola Contabilidade Digital S.A.",
      cnpj: "44.555.666/0001-02",
      industry: "Serviços contábeis e de departamento pessoal para pequenas empresas",
      employee_count: 49,
      work_regime: "remoto",
    },
    profile: {
      annual_budget_brl: 150000,
      budget_per_employee_year_brl: 3060,
      budget_horizon: "12_meses",
      budget_flexibility: "flexible",
      existing_wellbeing_spend_brl: 60000,
      hr_team_size: 4,
      has_dedicated_hr: true,
      has_internal_training: true,
      has_occupational_health: false,
      has_compliance_officer: true,
      decision_speed: "fast",
      culture_type: "startup",
      declared_values: ["autonomia", "transparência"],
      workforce_composition: { avg_age: 29, regime_split: { clt: 0.8, pj: 0.2 }, shift_pattern: "diurno" },
      predominant_role_type: "remote",
      regions: ["SP", "PR", "PE"],
      has_remote: true,
      has_shift_workers: false,
      has_unionized_workers: false,
      constraints: ["não presencial: empresa 100% remota, sem escritório"],
      preferred_modalities: ["online"],
      avoid_modalities: ["presencial"],
    },
    history: [
      {
        title: "Ginástica laboral online ao vivo",
        description: "Sessões de 15 minutos às 15h pelo Meet.",
        year_started: 2025,
        outcome: "abandoned",
        outcome_notes: "Baixa participação por causa dos fusos e das reuniões no horário.",
      },
      {
        title: "Plataforma de terapia online",
        description: "Até 4 sessões por mês por pessoa.",
        year_started: 2024,
        outcome: "successful",
        outcome_notes: "Usada por 38% da equipe em 2025.",
      },
    ],
    reports: [
      {
        occurrence_type: "Assédio",
        description: "Exposição de metas individuais e cobranças agressivas no canal público do Slack pela coordenação do Atendimento.",
      },
      {
        occurrence_type: "Assédio",
        description: "Cobrança em tom humilhante após avaliação baixa de cliente, em reunião de equipe do Atendimento.",
      },
    ],
    hr: { email: "rh@bussola.demo", name: "Caio Mendes (Pessoas)" },
  },
];

/* ── Banco ── */

function demoPassword(): string {
  if (process.env.DEMO_USERS_PASSWORD) return process.env.DEMO_USERS_PASSWORD;
  const file = path.join(ROOT, ".env.demo.local");
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8").match(/^DEMO_USERS_PASSWORD=(.+)$/m)?.[1] : null;
  if (existing) return existing.trim();
  const generated = randomBytes(12).toString("base64url");
  fs.writeFileSync(file, `# Senha das contas de RH das empresas de demonstração (rh@apice.demo, rh@bussola.demo)\nDEMO_USERS_PASSWORD=${generated}\n`);
  return generated;
}

async function must<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data as NonNullable<T>;
}

async function findAuthUser(admin: SupabaseClient, email: string) {
  for (let page = 1; page < 50; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = data.users.find((u) => u.email === email);
    if (found || data.users.length < 200) return found ?? null;
  }
  return null;
}

async function resetCompany(admin: SupabaseClient, spec: CompanySpec) {
  const { data: existing } = await admin.from("companies").select("id").eq("cnpj", spec.company.cnpj).maybeSingle();
  if (!existing) return;
  if (!RESET) throw new Error(`${spec.company.name} já existe. Rode com --reset para apagar e recriar.`);
  // Arquivos do bucket antes (o banco apaga o resto em cascata a partir da empresa).
  const { data: docs } = await admin.from("kb_documents").select("storage_path").eq("company_id", existing.id);
  const paths = (docs ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
  if (paths.length) await admin.storage.from("kb-documents").remove(paths);
  await must("apagar empresa", admin.from("companies").delete().eq("id", existing.id));
  const auth = await findAuthUser(admin, spec.hr.email);
  if (auth) await admin.auth.admin.deleteUser(auth.id);
  console.log(`  (recriando ${spec.company.name})`);
}

async function seedCompany(admin: SupabaseClient, spec: CompanySpec, items: Item[], answers: Map<string, Record<string, number>[]>, instrumentId: string, password: string) {
  console.log(`• ${spec.company.name}`);
  await resetCompany(admin, spec);

  const company = await must("empresa", admin.from("companies").insert(spec.company).select("id").single());
  const companyId = company.id as string;
  // O perfil é criado por trigger na inserção da empresa. Como se o RH tivesse revisado e
  // salvo cada seção; a completude é a mesma conta da tela de perfil.
  const reviewedAt = new Date().toISOString();
  const profile = {
    ...spec.profile,
    regions_reviewed_at: reviewedAt,
    constraints_reviewed_at: reviewedAt,
    preferred_modalities_reviewed_at: reviewedAt,
    workforce_composition_reviewed_at: reviewedAt,
  };
  await must(
    "perfil",
    admin
      .from("company_profiles")
      .update({ ...profile, setup_completeness: computeCompleteness(profile as unknown as CompanyProfile) })
      .eq("company_id", companyId)
  );

  const depts = await must(
    "setores",
    admin.from("departments").insert(DEPARTMENTS.map((d) => ({ company_id: companyId, name: d.name }))).select("id, name")
  );
  const deptId = new Map(depts.map((d) => [d.name as string, d.id as string]));

  // Conta de RH (fictícia, domínio .demo: nenhum e-mail é enviado).
  const { data: created, error: authError } = await admin.auth.admin.createUser({ email: spec.hr.email, password, email_confirm: true });
  if (authError) throw new Error(`usuário RH: ${authError.message}`);
  const hrUser = await must(
    "usuário",
    admin
      .from("users")
      .insert({
        auth_id: created.user.id,
        company_id: companyId,
        role: "HR",
        email: spec.hr.email,
        name: spec.hr.name,
        lgpd_consent_at: new Date().toISOString(),
        lgpd_consent_version: LGPD_CONSENT_VERSION,
      })
      .select("id")
      .single()
  );

  if (spec.history.length) {
    await must("histórico", admin.from("company_actions_taken").insert(spec.history.map((h) => ({ ...h, company_id: companyId, source: "manual_entry" }))));
  }
  if (spec.reports.length) {
    await must(
      "denúncias",
      admin.from("reports").insert(
        spec.reports.map((r, i) => ({
          company_id: companyId,
          protocol: `PROT-2026-DEMO${spec.slug.toUpperCase()}${i + 1}`,
          occurrence_type: r.occurrence_type,
          description: r.description,
          is_anonymous: true,
          attachments: [],
          status: "PENDING",
          created_at: `2026-09-1${i + 2}T12:00:00Z`,
        }))
      )
    );
  }

  // Pesquisa encerrada, mesma janela de datas nas duas empresas.
  const cycle = await must("ciclo", admin.from("survey_cycles").insert({ company_id: companyId, title: "Ciclo 2026" }).select("id").single());
  const survey = await must(
    "pesquisa",
    admin
      .from("surveys")
      .insert({
        company_id: companyId,
        title: SURVEY_TITLE,
        version: "MEDIUM",
        status: "CLOSED",
        instrument_id: instrumentId,
        cycle_id: cycle.id,
        created_at: "2026-09-08T12:00:00Z",
        closed_at: "2026-09-26T21:00:00Z",
      })
      .select("id")
      .single()
  );
  const surveyId = survey.id as string;
  await must("setores-alvo", admin.from("survey_target_departments").insert(depts.map((d) => ({ survey_id: surveyId, department_id: d.id }))));
  await must(
    "convidados",
    admin.from("survey_participants").insert(
      DEPARTMENTS.flatMap((d) =>
        Array.from({ length: d.invited }, (_, i) => ({
          survey_id: surveyId,
          department_id: deptId.get(d.name),
          email: `${d.name.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase()}${i + 1}@${spec.slug}.demo`,
          has_accessed: i < d.responses,
          invited_at: "2026-09-08T12:00:00Z",
        }))
      )
    )
  );

  // Respostas idênticas nas duas empresas; data de envio truncada ao dia (como no app).
  let dayOffset = 0;
  const answerRows: { survey_response_id: string; question_id: string; score: number }[] = [];
  const responseRows: { id: string; survey_id: string; department_id: string; submitted_at: string }[] = [];
  for (const dept of DEPARTMENTS) {
    for (const person of answers.get(dept.name)!) {
      const id = randomUUID();
      const day = 9 + (dayOffset++ % 15);
      responseRows.push({ id, survey_id: surveyId, department_id: deptId.get(dept.name)!, submitted_at: `2026-09-${String(day).padStart(2, "0")}T00:00:00Z` });
      for (const item of items) answerRows.push({ survey_response_id: id, question_id: item.id, score: person[item.id] });
    }
  }
  await must("respostas", admin.from("survey_responses").insert(responseRows));
  for (let i = 0; i < answerRows.length; i += 1000) {
    await must("itens", admin.from("survey_answers").insert(answerRows.slice(i, i + 1000)));
  }
  console.log(`  ${responseRows.length} respostas, ${answerRows.length} itens`);

  // Documentos da empresa na base de conhecimento (RAG).
  const dir = path.join(ROOT, spec.docsDir);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    const title = text.split(/\r?\n/)[0].trim();
    const doc = await must(
      "documento",
      admin
        .from("kb_documents")
        .insert({
          company_id: companyId,
          title,
          source_type: "documento_empresa",
          file_name: file,
          status: "processing",
          embedding_model: EMBEDDING_MODEL_ID,
          uploaded_by: hrUser.id,
        })
        .select("id")
        .single()
    );
    const r = await ingestPages(admin, { id: doc.id as string, title }, [text], { paged: false });
    console.log(`  doc "${title}": ${r.chunkCount} trecho(s)${r.flaggedCount ? `, ${r.flaggedCount} barrado(s)` : ""}`);
  }
  return { companyId, surveyId };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.OPENAI_API_KEY) {
    console.error("Precisa de NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e OPENAI_API_KEY (--env-file=.env.local).");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const instrument = await must("instrumento", admin.from("questionnaire_instruments").select("id").eq("code", "copsoq_ii").single());
  const rawItems = await must(
    "perguntas",
    admin
      .from("questionnaire_items")
      .select("id, is_inverted, order_index, questionnaire_scales(name, scoring_direction, reference_mean)")
      .eq("instrument_id", instrument.id)
      .eq("medium_version", true)
      .order("order_index")
  );
  const items: Item[] = rawItems.map((r) => {
    const s = r.questionnaire_scales as unknown as { name: string; scoring_direction: Item["direction"]; reference_mean: string | null };
    return { id: r.id, dimension: s.name, direction: s.scoring_direction, isInverted: r.is_inverted, reference: s.reference_mean ? Number(s.reference_mean) : null };
  });
  const answers = generateAnswers(items);
  const password = demoPassword();

  const result: Record<string, { companyId: string; surveyId: string }> = {};
  for (const spec of COMPANIES) result[spec.slug] = await seedCompany(admin, spec, items, answers, instrument.id as string, password);

  console.log("\nPronto. Mesmas respostas nas duas empresas:");
  for (const [slug, r] of Object.entries(result)) console.log(`  ${slug}: empresa ${r.companyId}, pesquisa ${r.surveyId}`);
  console.log("Logins: rh@apice.demo e rh@bussola.demo (senha em DEMO_USERS_PASSWORD ou .env.demo.local).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
