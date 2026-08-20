import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import crypto from "crypto";
import { networkInterfaces } from "os";
import { fetchCycleDetail, computeCycleConformity, resolveCertificateTier } from "@/lib/surveys/cycle";
import { fetchSurveyDimensionScores } from "@/lib/copsoq/dashboard";
import { computeHealthIndex } from "@/lib/copsoq/health-index";
import type { DimensionScore } from "@/lib/copsoq/types";

function getBaseUrl(req: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Em desenvolvimento, tenta achar o IP da rede local para o QR code
  // funcionar num celular na mesma rede.
  if (process.env.NODE_ENV === "development") {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      if (nets[name]) {
        for (const net of nets[name]!) {
          if (net.family === "IPv4" && !net.internal) {
            return `http://${net.address}:3000`;
          }
        }
      }
    }
  }

  const host = req.headers.get("host");
  if (host) return `http://${host}`;
  return "http://localhost:3000";
}

const TIER_TITLE: Record<1 | 2 | 3, string> = {
  1: "Certificado de Avaliação de Riscos Psicossociais",
  2: "Certificado de Plano de Ação Implementado",
  3: "Certificado de Ciclo de Melhoria Comprovado",
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("auth_id", user.id)
      .single();
    if (!userData || (userData.role !== "HR" && userData.role !== "ADMIN")) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
    const companyId = userData.company_id;

    const { cycleId } = await req.json();
    if (!cycleId) {
      return NextResponse.json({ error: "cycleId é obrigatório." }, { status: 400 });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const cycle = await fetchCycleDetail(supabase, cycleId, companyId);
    if (!cycle) {
      return NextResponse.json({ error: "Ciclo não encontrado." }, { status: 404 });
    }

    // Mesmos dados que o hub do ciclo usa para montar o checklist de
    // conformidade — mesma fonte de verdade, nunca diverge do que a tela já
    // mostrou pro usuário.
    const surveyIds = cycle.surveys.map((s) => s.id);
    const [{ data: planRows }, { data: taskRows }, { data: certRows }] = await Promise.all([
      supabase
        .from("action_plans")
        .select("id, status")
        .eq("company_id", companyId)
        .in("survey_id", surveyIds),
      supabase
        .from("kanban_tasks")
        .select("id")
        .eq("company_id", companyId)
        .in("source_survey_id", surveyIds),
      supabase
        .from("certificates")
        .select("id, issued_at")
        .eq("company_id", companyId)
        .eq("cycle_id", cycleId)
        .order("issued_at", { ascending: false }),
    ]);

    const plans = planRows ?? [];
    const tasks = taskRows ?? [];
    const certificates = certRows ?? [];
    const approvedPlans = plans.filter((p) => ["APPROVED", "COMPLETED"].includes(p.status)).length;
    const pendingPlans = plans.filter((p) => p.status === "PENDING_REVIEW").length;

    const closed = cycle.surveys.filter((s) => s.status === "CLOSED");
    const closedScores = await Promise.all(
      closed.map((s) => fetchSurveyDimensionScores(supabase, s.id))
    );
    type ScoreResult = { scores: DimensionScore[]; isAnonymized: boolean };
    const scoreById = new Map<string, ScoreResult>();
    closed.forEach((s, i) => scoreById.set(s.id, closedScores[i]));

    const measured = cycle.surveys
      .map((survey) => {
        const result = scoreById.get(survey.id);
        const usable = Boolean(result && !result.isAnonymized && result.scores.length > 0);
        return usable
          ? { survey, healthIndex: computeHealthIndex(result!.scores) }
          : null;
      })
      .filter((m): m is { survey: (typeof cycle.surveys)[number]; healthIndex: number } => m !== null);

    const totalResponses = cycle.surveys.reduce((sum, s) => sum + s.responded, 0);
    const totalInvited = cycle.surveys.reduce((sum, s) => sum + s.invited, 0);

    const { stages, doneChecks, totalChecks, conformityPct } = computeCycleConformity({
      cycle,
      measuredCount: measured.length,
      plansTotal: plans.length,
      plansApproved: approvedPlans,
      plansPending: pendingPlans,
      tasksTotal: tasks.length,
      totalResponses,
      totalInvited,
      certificatesIssued: certificates.length,
      latestCertificateIssuedAt: certificates[0]?.issued_at ?? null,
    });

    const tier = resolveCertificateTier(stages);
    if (!tier) {
      const missing = stages[0].checks.filter((c) => !c.done).map((c) => c.title);
      return NextResponse.json(
        {
          error:
            "Este ciclo ainda não tem evidências suficientes para emitir um certificado. " +
            `Faltam: ${missing.join(", ")}.`,
        },
        { status: 403 }
      );
    }

    // Variação do índice de saúde entre a primeira e a última medição — só
    // entra no nível 3, e só quando é favorável (senão o documento afirmaria
    // uma melhora que não houve).
    const first = measured[0] ?? null;
    const last = measured.length > 1 ? measured[measured.length - 1] : null;
    const healthDelta = first && last ? last.healthIndex - first.healthIndex : null;
    const showsImprovement = tier === 3 && healthDelta !== null && healthDelta > 0;

    const uniqueHash = crypto.randomUUID();
    const baseUrl = getBaseUrl(req);
    const validationUrl = `${baseUrl}/validacao/${uniqueHash}`;
    const issuedAt = new Date();

    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      margin: 1,
      width: 150,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // O PDF é montado ANTES de gravar qualquer coisa no banco: se a geração
    // falhar (fonte, imagem, o que for), o catch devolve erro e nenhuma linha
    // fica pendurada em `certificates` sem PDF nenhum entregue.
    const pdfBytes = await buildCertificatePdf({
      companyName: company?.name ?? "Empresa",
      cycleTitle: cycle.title,
      tier,
      issuedAt,
      stages,
      doneChecks,
      totalChecks,
      conformityPct,
      showsImprovement,
      healthDelta,
      firstStageLabel: first?.survey.stageLabel ?? null,
      lastStageLabel: last?.survey.stageLabel ?? null,
      qrCodeDataUrl,
      uniqueHash,
    });

    const { error: insertError } = await supabase.from("certificates").insert({
      company_id: companyId,
      cycle_id: cycleId,
      survey_id: cycle.latestSurvey.id,
      tier,
      unique_hash: uniqueHash,
      validation_url: validationUrl,
    });
    if (insertError) {
      return NextResponse.json({ error: "Erro ao salvar o certificado." }, { status: 500 });
    }

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${cycle.title}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("Certificate error:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar certificado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface CertificateData {
  companyName: string;
  cycleTitle: string;
  tier: 1 | 2 | 3;
  issuedAt: Date;
  stages: ReturnType<typeof computeCycleConformity>["stages"];
  doneChecks: number;
  totalChecks: number;
  conformityPct: number;
  showsImprovement: boolean;
  healthDelta: number | null;
  firstStageLabel: string | null;
  lastStageLabel: string | null;
  qrCodeDataUrl: string;
  uniqueHash: string;
}

/**
 * Desenha o PDF com pdf-lib (mesma lib já usada aqui, API de baixo nível —
 * sem dependência nova). Só lista as evidências das etapas cobertas pelo
 * nível emitido, com o texto real de cada check (não mais boilerplate fixo).
 */
async function buildCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 retrato — cabe mais texto que paisagem
  const { width, height } = page.getSize();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.05, 0.35, 0.65);
  const textColor = rgb(0.2, 0.2, 0.2);
  const mutedColor = rgb(0.45, 0.45, 0.45);
  const emerald = rgb(0.02, 0.5, 0.35);

  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: primaryColor, borderWidth: 3 });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: primaryColor, borderWidth: 1 });

  let y = height - 70;

  page.drawText(TIER_TITLE[data.tier].toUpperCase(), {
    x: 50, y, size: 16, font: helveticaBold, color: primaryColor, maxWidth: width - 100, lineHeight: 20,
  });
  y -= 40;

  page.drawText("Empresa:", { x: 50, y, size: 10, font: helvetica, color: mutedColor });
  y -= 20;
  page.drawText(data.companyName.toUpperCase(), { x: 50, y, size: 18, font: helveticaBold, color: rgb(0, 0, 0) });
  y -= 28;

  page.drawText(`Ciclo: ${data.cycleTitle}`, { x: 50, y, size: 12, font: helvetica, color: textColor });
  y -= 16;
  page.drawText(`Emitido em ${data.issuedAt.toLocaleDateString("pt-BR")}`, { x: 50, y, size: 10, font: helvetica, color: mutedColor });
  y -= 30;

  const intro =
    `Este documento declara, com base nas evidências registradas na plataforma Sentinel, que a empresa\n` +
    `conduziu o processo de gerenciamento de riscos psicossociais nos termos da NR-1 (Gerenciamento de\n` +
    `Riscos Ocupacionais) e da Lei 14.831/2024, correspondente ao nível "${TIER_TITLE[data.tier]}".`;
  page.drawText(intro, { x: 50, y, size: 10, font: helvetica, color: textColor, lineHeight: 14 });
  y -= 70;

  page.drawText(`EVIDÊNCIAS (${data.doneChecks} de ${data.totalChecks} — ${data.conformityPct}% do ciclo completo)`, {
    x: 50, y, size: 11, font: helveticaBold, color: primaryColor,
  });
  y -= 22;

  const relevantStages =
    data.tier === 1 ? data.stages.slice(0, 1) : data.tier === 2 ? data.stages.slice(0, 2) : data.stages.slice(0, 3);

  for (const stage of relevantStages) {
    page.drawText(`Etapa ${stage.number} — ${stage.label}`, { x: 50, y, size: 11, font: helveticaBold, color: textColor });
    y -= 16;
    for (const check of stage.checks) {
      // Na etapa 3, "Certificado emitido" não faz sentido listar dentro do
      // próprio certificado — é auto-referente.
      if (stage.number === "3" && check.title === "Certificado emitido") continue;
      // Helvetica padrao (WinAnsi) nao codifica os simbolos Unicode de check
      // e circulo vazio — usar so ASCII evita o crash "WinAnsi cannot encode"
      // que travava toda emissao.
      const mark = check.done ? "[x]" : "[ ]";
      page.drawText(`${mark} ${check.title} — ${check.detail}`, {
        x: 65, y, size: 9.5, font: helvetica, color: check.done ? textColor : mutedColor, maxWidth: width - 130, lineHeight: 12,
      });
      y -= 15;
    }
    y -= 8;
  }

  if (data.showsImprovement && data.healthDelta !== null) {
    y -= 6;
    page.drawRectangle({ x: 50, y: y - 34, width: width - 100, height: 40, color: rgb(0.93, 0.98, 0.96) });
    page.drawText(
      `MELHORA COMPROVADA: índice de saúde variou +${data.healthDelta} pontos entre ${data.firstStageLabel} e ${data.lastStageLabel}.`,
      { x: 62, y: y - 16, size: 10, font: helveticaBold, color: emerald, maxWidth: width - 124, lineHeight: 13 }
    );
    y -= 50;
  }

  // Ressalva legal — declaração baseada em evidência, não substitui laudo
  // técnico nem dispensa as demais exigências do PGR.
  const disclaimer =
    "Este certificado é uma declaração baseada nos dados registrados na plataforma Sentinel e não substitui\n" +
    "laudo técnico de profissional habilitado, nem dispensa as demais exigências do Programa de\n" +
    "Gerenciamento de Riscos (PGR) da empresa.";
  page.drawText(disclaimer, { x: 50, y: 120, size: 8, font: helveticaOblique, color: mutedColor, lineHeight: 11 });

  page.drawLine({ start: { x: 50, y: 95 }, end: { x: 260, y: 95 }, thickness: 1, color: textColor });
  page.drawText("Plataforma Sentinel", { x: 50, y: 80, size: 10, font: helveticaBold, color: textColor });
  page.drawText("Declaração automática baseada em dados", { x: 50, y: 68, size: 8, font: helveticaOblique, color: mutedColor });

  // Hash e QR na mesma coluna de 80pt, hash quebrado em 2 linhas — um UUID
  // inteiro numa linha só (36 caracteres) vazava por cima do QR.
  const qrX = width - 130;
  const qrImageBytes = Buffer.from(data.qrCodeDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawText("Validar em:", { x: qrX, y: 148, size: 8, font: helveticaBold, color: textColor });
  page.drawText(data.uniqueHash.slice(0, 18), { x: qrX, y: 137, size: 7, font: helvetica, color: mutedColor });
  page.drawText(data.uniqueHash.slice(18), { x: qrX, y: 127, size: 7, font: helvetica, color: mutedColor });
  page.drawImage(qrImage, { x: qrX, y: 40, width: 80, height: 80 });

  return pdfDoc.save();
}
