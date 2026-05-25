"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Helpers ──────────────────────────────────────────────────

async function getAuthUserData() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (!userData) return null;
  return userData;
}

function canManage(role: string) {
  return role === "HR" || role === "ADMIN";
}

// ── Import employees from CSV ────────────────────────────────

interface ImportPayload {
  participants: { email: string; department: string; name?: string }[];
  departments: { id: string; name: string }[];
}

export async function importEmployees(payload: ImportPayload) {
  const userData = await getAuthUserData();
  if (!userData) return { error: "Não autenticado." };
  if (!canManage(userData.role)) {
    return { error: "Apenas RH e Admin podem importar colaboradores." };
  }

  const admin = createAdminClient();

  // Build department lookup (name -> id), creating missing ones
  const deptMap = new Map<string, string>();
  for (const d of payload.departments) {
    deptMap.set(d.name.toLowerCase(), d.id);
  }

  const missingDepts = new Set<string>();
  for (const p of payload.participants) {
    const deptName = p.department.trim();
    if (deptName && !deptMap.has(deptName.toLowerCase())) {
      missingDepts.add(deptName);
    }
  }

  for (const deptName of missingDepts) {
    const { data: newDept } = await admin
      .from("departments")
      .insert({ company_id: userData.company_id, name: deptName })
      .select("id")
      .single();

    if (newDept) {
      deptMap.set(deptName.toLowerCase(), newDept.id);
    }
  }

  // Insert employees (skip duplicates)
  let imported = 0;
  for (const p of payload.participants) {
    const departmentId = deptMap.get(p.department.trim().toLowerCase());
    if (!departmentId) continue;

    const { error } = await admin.from("employees").insert({
      company_id: userData.company_id,
      email: p.email,
      name: p.name?.trim() || null,
      department_id: departmentId,
    });

    if (!error) imported++;
    // Duplicates silently skipped (unique constraint on company_id, email)
  }

  return { success: true, imported };
}

// ── Add single employee ──────────────────────────────────────

interface AddEmployeePayload {
  email: string;
  name: string | null;
  departmentId: string;
  newDepartmentName?: string;
}

export async function addEmployee(payload: AddEmployeePayload) {
  const userData = await getAuthUserData();
  if (!userData) return { error: "Não autenticado." };
  if (!canManage(userData.role)) {
    return { error: "Apenas RH e Admin podem adicionar colaboradores." };
  }

  const email = payload.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Email inválido." };
  }

  const admin = createAdminClient();

  // Resolve department (existing or new)
  let departmentId = payload.departmentId;

  if (payload.newDepartmentName?.trim()) {
    const { data: newDept, error: deptError } = await admin
      .from("departments")
      .insert({
        company_id: userData.company_id,
        name: payload.newDepartmentName.trim(),
      })
      .select("id")
      .single();

    if (deptError) {
      return { error: "Erro ao criar departamento. Talvez já exista." };
    }
    departmentId = newDept.id;
  }

  const { error } = await admin.from("employees").insert({
    company_id: userData.company_id,
    email,
    name: payload.name?.trim() || null,
    department_id: departmentId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este email já está cadastrado na empresa." };
    }
    return { error: "Erro ao adicionar colaborador." };
  }

  return { success: true };
}

// ── Update employee ──────────────────────────────────────────

interface UpdateEmployeePayload {
  employeeId: string;
  name: string | null;
  departmentId: string;
}

export async function updateEmployee(payload: UpdateEmployeePayload) {
  const userData = await getAuthUserData();
  if (!userData) return { error: "Não autenticado." };
  if (!canManage(userData.role)) {
    return { error: "Apenas RH e Admin podem editar colaboradores." };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("employees")
    .update({
      name: payload.name?.trim() || null,
      department_id: payload.departmentId,
    })
    .eq("id", payload.employeeId)
    .eq("company_id", userData.company_id);

  if (error) return { error: "Erro ao atualizar colaborador." };
  return { success: true };
}

// ── Remove employee ──────────────────────────────────────────

export async function removeEmployee(employeeId: string) {
  const userData = await getAuthUserData();
  if (!userData) return { error: "Não autenticado." };
  if (!canManage(userData.role)) {
    return { error: "Apenas RH e Admin podem remover colaboradores." };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("company_id", userData.company_id);

  if (error) return { error: "Erro ao remover colaborador." };
  return { success: true };
}
