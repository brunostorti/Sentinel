import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { getFeedbackOptions, isFeedbackRating } from "@/lib/feedback/options";

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 4000;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  try {
    // O login só libera o envio: e-mail e usuário NÃO são gravados.
    const employee = await getEmployeeContext();
    if (!employee) {
      return fail("Sua sessão expirou. Entre novamente pelo link enviado ao seu e-mail.", 401);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const companyId = String(body?.companyId ?? "").trim();
    const planId = String(body?.actionPlanId ?? "").trim() || null;
    const rating = String(body?.rating ?? "");
    const message = String(body?.message ?? "").trim();

    // Elegibilidade recalculada no servidor: empresa, departamento e planos vêm do cadastro.
    const options = await getFeedbackOptions(employee.email);
    const option = options.find((o) => o.companyId === companyId);
    if (!option) return fail("Escolha uma das empresas em que você trabalha.", 400);
    if (!option.eligible) {
      return fail(
        "Seu departamento tem menos de 5 pessoas; para proteger seu anonimato, o feedback não está disponível.",
        403
      );
    }
    if (planId && !option.plans.some((p) => p.id === planId)) {
      return fail("Este plano de ação não está disponível para avaliação.", 400);
    }
    if (!isFeedbackRating(rating)) return fail("Diga como o plano está funcionando.", 400);
    if (message.length < MIN_MESSAGE) {
      return fail(`Escreva pelo menos ${MIN_MESSAGE} caracteres.`, 400);
    }
    if (message.length > MAX_MESSAGE) return fail("Resuma em até 4 mil caracteres.", 400);

    // Data cortada para o dia pelo trigger action_plan_feedback_day_only.
    const { error } = await createAdminClient().from("action_plan_feedback").insert({
      company_id: option.companyId,
      action_plan_id: planId,
      department_id: option.departmentId,
      rating,
      message,
    });
    if (error) {
      console.error("Feedback insert error:", error);
      return fail("Não foi possível enviar o feedback. Tente novamente.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Feedback submission error:", error);
    return fail("Erro ao enviar o feedback. Tente novamente.", 500);
  }
}
