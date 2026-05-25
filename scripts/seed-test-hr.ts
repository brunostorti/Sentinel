/**
 * Seed script: creates an HR user for the test company so you can test
 * the full flow (create survey → import employees → respond → view dashboard).
 *
 * Usage: npx tsx scripts/seed-test-hr.ts
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

const HR_EMAIL = "rh@sentinel.com";
const HR_PASSWORD = "rh123456";
const HR_NAME = "Maria Silva (RH)";

const TEST_EMPLOYEES = [
  { email: "joao.teste@empresa.com", department: "Engenharia" },
  { email: "ana.teste@empresa.com", department: "Engenharia" },
  { email: "pedro.teste@empresa.com", department: "Comercial" },
  { email: "lucia.teste@empresa.com", department: "Comercial" },
  { email: "carlos.teste@empresa.com", department: "RH" },
  { email: "maria.teste@empresa.com", department: "RH" },
  { email: "jose.teste@empresa.com", department: "Financeiro" },
  { email: "paula.teste@empresa.com", department: "Financeiro" },
  { email: "andre.teste@empresa.com", department: "Engenharia" },
  { email: "sofia.teste@empresa.com", department: "Comercial" },
];

async function seed() {
  console.log("=== Criando ambiente de teste ===\n");

  // 1. Find the test company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("cnpj", "00.000.000/0001-00")
    .single();

  if (!company) {
    console.error("Empresa teste não encontrada. Rode primeiro: npx tsx scripts/seed-super-admin.ts");
    process.exit(1);
  }

  console.log(`Empresa: ${company.name} (${company.id})`);

  // 2. Create HR auth user
  let hrAuthId: string;

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: HR_EMAIL,
      password: HR_PASSWORD,
      email_confirm: true,
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("Auth user HR já existe, buscando...");
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find((u) => u.email === HR_EMAIL);
      if (!existing) {
        console.error("Não foi possível encontrar o usuário existente.");
        process.exit(1);
      }
      hrAuthId = existing.id;
    } else {
      console.error("Erro ao criar auth user HR:", authError.message);
      process.exit(1);
    }
  } else {
    hrAuthId = authUser.user.id;
    console.log("Auth user HR criado:", hrAuthId);
  }

  // 3. Create HR platform record (if not exists)
  const { data: existingHR } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", hrAuthId)
    .maybeSingle();

  if (!existingHR) {
    const { error: userError } = await supabase.from("users").insert({
      auth_id: hrAuthId,
      company_id: company.id,
      role: "HR",
      email: HR_EMAIL,
      name: HR_NAME,
    });

    if (userError) {
      console.error("Erro ao criar registro HR:", userError.message);
      process.exit(1);
    }
    console.log("Registro HR criado na tabela users.");
  } else {
    console.log("Registro HR já existe.");
  }

  // 4. Ensure departments exist
  const deptNames = [...new Set(TEST_EMPLOYEES.map((e) => e.department))];
  const deptMap = new Map<string, string>();

  for (const name of deptNames) {
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("company_id", company.id)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      deptMap.set(name, existing.id);
    } else {
      const { data: created } = await supabase
        .from("departments")
        .insert({ company_id: company.id, name })
        .select("id")
        .single();

      if (created) deptMap.set(name, created.id);
    }
  }

  console.log(`Departamentos: ${deptNames.join(", ")}`);

  // 5. Create a test survey (DRAFT)
  const { data: existingSurvey } = await supabase
    .from("surveys")
    .select("id")
    .eq("company_id", company.id)
    .eq("title", "Pesquisa Teste Q1 2025")
    .maybeSingle();

  let surveyId: string;

  if (existingSurvey) {
    surveyId = existingSurvey.id;
    console.log("Pesquisa teste já existe:", surveyId);
  } else {
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .insert({
        company_id: company.id,
        title: "Pesquisa Teste Q1 2025",
        version: "SHORT",
        status: "DRAFT",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (surveyError) {
      console.error("Erro ao criar pesquisa:", surveyError.message);
      process.exit(1);
    }
    surveyId = survey.id;
    console.log("Pesquisa teste criada:", surveyId);
  }

  // 6. Import test employees as survey participants
  let importedCount = 0;
  for (const emp of TEST_EMPLOYEES) {
    const deptId = deptMap.get(emp.department);
    if (!deptId) continue;

    const { data: existing } = await supabase
      .from("survey_participants")
      .select("id")
      .eq("survey_id", surveyId)
      .eq("email", emp.email)
      .maybeSingle();

    if (!existing) {
      await supabase.from("survey_participants").insert({
        survey_id: surveyId,
        email: emp.email,
        department_id: deptId,
        has_accessed: false,
      });
      importedCount++;
    }
  }

  console.log(`${importedCount} participantes importados (${TEST_EMPLOYEES.length} total).`);

  // Done!
  console.log("\n========================================");
  console.log("  AMBIENTE DE TESTE PRONTO!");
  console.log("========================================\n");
  console.log("1. Inicie o servidor:");
  console.log("   npm run dev\n");
  console.log("2. Login como HR:");
  console.log("   URL:   http://localhost:3000/entrar");
  console.log("   Tab:   Administração");
  console.log(`   Email: ${HR_EMAIL}`);
  console.log(`   Senha: ${HR_PASSWORD}\n`);
  console.log("3. No painel, vá em 'Pesquisas' para ver a pesquisa criada.");
  console.log("   - A pesquisa está em RASCUNHO com 10 participantes.");
  console.log("   - Clique 'Ativar Pesquisa' para ativá-la.\n");
  console.log("4. Para testar a resposta do colaborador:");
  console.log("   - Na aba 'Colaborador' do login, use um dos emails:");
  console.log("     " + TEST_EMPLOYEES.slice(0, 3).map((e) => e.email).join(", "));
  console.log("   - (Em produção, o colaborador recebe um magic link por email.");
  console.log("     Em dev, configure o Supabase para permitir login OTP/test.)\n");
  console.log("5. Após respostas, volte ao painel HR para ver o dashboard BI.\n");
  console.log("SUPER ADMIN: admin@sentinel.com / admin123456");
  console.log("HR:          rh@sentinel.com / rh123456");
  console.log("========================================\n");
}

seed().catch(console.error);
