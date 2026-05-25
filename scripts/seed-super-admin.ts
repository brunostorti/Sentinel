/**
 * Seed script: creates a Super Admin user + a test company.
 *
 * Usage: npx tsx scripts/seed-super-admin.ts
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

const ADMIN_EMAIL = "admin@sentinel.com";
const ADMIN_PASSWORD = "admin123456";
const ADMIN_NAME = "Super Admin";

async function seed() {
  console.log("Seeding super admin...");

  // 1. Create auth user
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("Auth user already exists, fetching...");
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find((u) => u.email === ADMIN_EMAIL);
      if (!existing) {
        console.error("Could not find existing user");
        process.exit(1);
      }
      await createPlatformRecords(existing.id);
      return;
    }
    console.error("Error creating auth user:", authError.message);
    process.exit(1);
  }

  console.log("Auth user created:", authUser.user.id);
  await createPlatformRecords(authUser.user.id);
}

async function createPlatformRecords(authId: string) {
  // 2. Check if users record already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (existingUser) {
    console.log("Super admin platform record already exists.");
    console.log("\n---");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("---\n");
    return;
  }

  // 3. Create test company (check if it already exists first)
  let companyId: string;
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("cnpj", "00.000.000/0001-00")
    .maybeSingle();

  if (existingCompany) {
    companyId = existingCompany.id;
    console.log("Company already exists:", companyId);
  } else {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: "Empresa Teste Ltda",
        cnpj: "00.000.000/0001-00",
        industry: "Tecnologia",
      })
      .select("id")
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError.message);
      process.exit(1);
    }
    companyId = company.id;
    console.log("Company created:", companyId);
  }

  // 4. Create super admin user record
  //    SUPER_ADMIN must have company_id = NULL (DB constraint: users_company_check)
  const { error: userError } = await supabase.from("users").insert({
    auth_id: authId,
    company_id: null,
    role: "SUPER_ADMIN",
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
  });

  if (userError) {
    console.error("Error creating user record:", userError.message);
    process.exit(1);
  }

  console.log("Super admin user record created (company_id = null).");

  // 5. Create test departments (skip if they already exist)
  const departments = ["Engenharia", "Comercial", "RH", "Financeiro"];
  for (const name of departments) {
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", name)
      .maybeSingle();

    if (!existing) {
      await supabase.from("departments").insert({
        company_id: companyId,
        name,
      });
    }
  }

  console.log("Departments created:", departments.join(", "));

  console.log("\n=== SEED COMPLETE ===");
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Company: Empresa Teste Ltda`);
  console.log("Login at: http://localhost:3000/entrar (tab Administração)");
  console.log("=====================\n");
}

seed().catch(console.error);
