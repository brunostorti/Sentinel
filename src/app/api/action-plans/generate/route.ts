import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/ai/pipeline/orchestrator";

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return new Response(sseEvent({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData) {
    return new Response(sseEvent({ error: "Usuário não encontrado." }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  if (userData.role !== "HR" && userData.role !== "ADMIN") {
    return new Response(
      sseEvent({ error: "Apenas RH e Admin podem gerar planos." }),
      { status: 403, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const body = (await req.json()) as { surveyId?: string };
  if (!body.surveyId) {
    return new Response(sseEvent({ error: "surveyId é obrigatório." }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const surveyId = body.surveyId;
  const companyId = userData.company_id!;

  // Destrava o lock antes de iniciar — garante que tentativas anteriores
  // presas em "running" (por falha ou crash) não bloqueiem esta geração.
  const admin = createAdminClient();
  await admin
    .from("surveys")
    .update({
      ai_generation_status: "not_started",
      ai_generation_run_id: null,
      ai_generation_started_at: null,
      ai_generation_error: null,
    })
    .eq("id", surveyId)
    .eq("company_id", companyId);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(data)));
      };

      try {
        const result = await runPipeline(
          surveyId,
          companyId,
          (step, label) => send({ step, label, total: 4 })
        );

        if (result.status === "failed") {
          send({ error: result.error ?? "Erro ao gerar planos." });
        } else if (result.status === "skipped") {
          send({ error: "Geração já em curso em outra aba. Aguarde." });
        } else {
          send({ done: true, plans_created: result.plans_created ?? 0 });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro interno.";
        send({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
