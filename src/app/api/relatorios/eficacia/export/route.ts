import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * GET /api/relatorios/eficacia/export?format=pdf|csv
 *
 * Devolve binário (application/pdf ou text/csv).
 */

const ATTRIBUTION_LABEL: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  none: "Nenhuma",
  cannot_tell: "Não dá pra dizer",
};

const STATUS_LABEL: Record<string, string> = {
  computed: "Medido",
  unmeasurable: "Não medível",
  anonymity_blocked: "Anonimato",
  pending: "Pendente",
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", authUser.id)
    .single();
  if (!userData)
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", userData.company_id!)
    .single();

  const { data: outcomes } = await supabase
    .from("action_outcomes")
    .select(`
      id, intervention_id, score_before, score_after, delta, outcome_status,
      hr_attribution, hr_notes, delta_computed_at, created_at,
      questionnaire_scales(name),
      action_plans(ai_recommendation)
    `)
    .eq("company_id", userData.company_id!)
    .order("delta_computed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const rows = (outcomes ?? []).map((r) => {
    const dim = (r.questionnaire_scales as { name?: string } | null)?.name ?? "—";
    const rec = (r.action_plans as { ai_recommendation?: { title?: string } } | null)
      ?.ai_recommendation;
    return {
      acao: rec?.title ?? r.intervention_id,
      dimensao: dim,
      antes: r.score_before,
      depois: r.score_after ?? "—",
      delta: r.delta != null ? (r.delta > 0 ? `+${r.delta}` : r.delta) : "—",
      atribuicao: r.hr_attribution
        ? ATTRIBUTION_LABEL[r.hr_attribution] ?? r.hr_attribution
        : "pendente",
      status: r.outcome_status
        ? STATUS_LABEL[r.outcome_status] ?? r.outcome_status
        : "pendente",
      notas: r.hr_notes ?? "",
    };
  });

  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const filename = `eficacia-acoes-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    const header = "Ação,Dimensão,Antes,Depois,Δ,Atribuição,Status,Notas";
    const lines = rows.map((r) =>
      [r.acao, r.dimensao, r.antes, r.depois, r.delta, r.atribuicao, r.status, r.notas]
        .map((v) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    );
    const csv = `${header}\n${lines.join("\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // PDF
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(`Eficácia das ações — ${company?.name ?? "Empresa"}`, 14, 16);
  doc.setFontSize(10);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} • ${rows.length} ações registradas`,
    14,
    24
  );

  autoTable(doc, {
    startY: 30,
    head: [["Ação", "Dimensão", "Antes", "Depois", "Δ", "Atribuição", "Status"]],
    body: rows.map((r) => [
      r.acao,
      r.dimensao,
      String(r.antes),
      String(r.depois),
      String(r.delta),
      r.atribuicao,
      r.status,
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [25, 104, 230] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50 },
    },
  });

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
