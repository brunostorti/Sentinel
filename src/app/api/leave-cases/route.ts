import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { isEligibleDepartment } from "@/lib/privacy/departments";
import { isLeaveReason, normalizeMonth } from "@/lib/leave-cases/constants";
import { todayInBrazil } from "@/lib/reports/alerts";

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Colaborador informa um afastamento. O login só libera o envio: usuário e e-mail
 * NÃO são gravados. Grava só empresa, setor (5+), mês e motivo da lista fechada.
 */
export async function POST(req: Request) {
  try {
    const employee = await getEmployeeContext();
    if (!employee) return fail("Sua sessão expirou. Entre novamente pelo link enviado ao seu e-mail.", 401);
    if (employee.companies.length === 0) {
      return fail("Seu e-mail não está no cadastro de colaboradores de nenhuma empresa. Fale com o RH.", 403);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const requestedCompany = String(body.companyId ?? "").trim();
    const company = requestedCompany
      ? employee.companies.find((c) => c.id === requestedCompany)
      : employee.companies.length === 1
        ? employee.companies[0]
        : undefined;
    if (!company) return fail("Escolha uma das empresas em que você trabalha.", 400);

    const today = todayInBrazil();
    const month = normalizeMonth(body.month, today);
    if (!month) return fail("Escolha o mês do afastamento (até 12 meses atrás).", 400);
    if (!isLeaveReason(body.reason)) return fail("Escolha o motivo na lista.", 400);

    const departmentId = String(body.departmentId ?? "").trim() || null;
    if (departmentId && !(await isEligibleDepartment(company.id, departmentId))) {
      return fail("Este setor não pode ser informado. Escolha outro ou \"Prefiro não informar\".", 400);
    }

    const { error } = await createAdminClient().from("leave_cases").insert({
      company_id: company.id,
      department_id: departmentId,
      reference_month: month,
      reason_code: body.reason,
    });
    if (error) {
      console.error("Leave case insert error:", error);
      return fail("Não foi possível registrar. Tente novamente.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Leave case error:", error);
    return fail("Não foi possível registrar. Tente novamente.", 500);
  }
}
