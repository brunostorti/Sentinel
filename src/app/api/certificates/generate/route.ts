import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";
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
  1: "Avaliação de Riscos Psicossociais",
  2: "Plano de Ação Implementado",
  3: "Ciclo de Melhoria Comprovado",
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

    const { stages } = computeCycleConformity({
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
    const responseRate = totalInvited > 0 ? Math.round((totalResponses / totalInvited) * 100) : 0;

    // O certificado é um diploma, não um relatório de auditoria: só entra o
    // que foi conquistado, uma frase por etapa alcançada — nada de item
    // pendente ou não cumprido aparece aqui (isso fica no hub do ciclo).
    const highlights: string[] = [
      `Avaliação de riscos psicossociais (COPSOQ II) concluída, com ${responseRate}% de adesão dos colaboradores (${totalResponses} de ${totalInvited} convidados).`,
    ];
    if (tier >= 2) {
      highlights.push(
        `${plans.length} plano${plans.length === 1 ? "" : "s"} de ação implementado${plans.length === 1 ? "" : "s"} para mitigação dos riscos identificados, com ${approvedPlans} aprovado${approvedPlans === 1 ? "" : "s"} pela gestão.`
      );
    }
    if (tier === 3) {
      highlights.push(
        showsImprovement && healthDelta !== null
          ? `Reavaliação realizada com melhora comprovada: o índice de saúde ocupacional evoluiu de ${first!.healthIndex} para ${last!.healthIndex} pontos (+${healthDelta}).`
          : "Reavaliação realizada, permitindo comparar o diagnóstico inicial com o acompanhamento posterior."
      );
    }

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
      highlights,
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
  /** Só o que foi conquistado — uma frase por etapa alcançada. Nada de
   *  pendência ou item não cumprido entra no documento; isso é papel do
   *  checklist do hub do ciclo, não do certificado. */
  highlights: string[];
  qrCodeDataUrl: string;
  uniqueHash: string;
}

function centeredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  pageWidth: number
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageWidth - textWidth) / 2, y, size, font, color });
}

/**
 * Diploma em paisagem — mesma borda dupla e QR/hash de sempre, mas
 * tipografia serifada e layout centralizado, no espírito de um diploma
 * formal em vez de um relatório de auditoria. Lista só as conquistas
 * (`highlights`), nunca o que ainda falta.
 */
async function buildCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]); // A4 paisagem
  const { width, height } = page.getSize();
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.05, 0.35, 0.65);
  const textColor = rgb(0.2, 0.2, 0.2);
  const mutedColor = rgb(0.45, 0.45, 0.45);
  const goldLine = rgb(0.62, 0.51, 0.24);

  // Moldura dupla, como antes.
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: primaryColor, borderWidth: 3 });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: primaryColor, borderWidth: 0.75 });
  // Filete fino logo dentro da moldura — dá o acabamento de diploma sem
  // depender de nenhum brasão/imagem.
  page.drawRectangle({ x: 42, y: 42, width: width - 84, height: height - 84, borderColor: goldLine, borderWidth: 0.5 });

  let y = height - 90;

  centeredText(page, "CERTIFICADO", y, 13, helveticaBold, primaryColor, width);
  y -= 8;
  const kickerWidth = helveticaBold.widthOfTextAtSize("CERTIFICADO", 13);
  page.drawLine({
    start: { x: width / 2 - kickerWidth / 2 - 20, y: y + 4 },
    end: { x: width / 2 - kickerWidth / 2 - 6, y: y + 4 },
    thickness: 0.75,
    color: goldLine,
  });
  page.drawLine({
    start: { x: width / 2 + kickerWidth / 2 + 6, y: y + 4 },
    end: { x: width / 2 + kickerWidth / 2 + 20, y: y + 4 },
    thickness: 0.75,
    color: goldLine,
  });
  y -= 32;

  centeredText(page, TIER_TITLE[data.tier].toUpperCase(), y, 24, timesBold, textColor, width);
  y -= 34;

  centeredText(page, "Certificamos que", y, 11, timesItalic, mutedColor, width);
  y -= 30;

  centeredText(page, data.companyName.toUpperCase(), y, 26, timesBold, primaryColor, width);
  y -= 26;

  centeredText(
    page,
    `conduziu, através da plataforma Sentinel, o ciclo "${data.cycleTitle}"`,
    y,
    12,
    times,
    textColor,
    width
  );
  y -= 16;
  centeredText(
    page,
    "de identificação e gerenciamento de riscos psicossociais, nos termos da NR-1 e da Lei 14.831/2024,",
    y,
    12,
    times,
    textColor,
    width
  );
  y -= 16;
  centeredText(page, "com as seguintes evidências registradas:", y, 12, times, textColor, width);
  // Com menos conquistas (nível 1 ou 2) sobra espaço embaixo — respiro extra
  // aqui antes da lista recentraliza o bloco em vez de deixar tudo colado no
  // topo com um vazio grande na parte de baixo.
  y -= 36 + (3 - data.highlights.length) * 20;

  // Só as conquistas — cada uma centralizada, sem grade de checklist.
  for (const highlight of data.highlights) {
    const bulletLine = `•  ${highlight}`;
    page.drawText(bulletLine, {
      x: width / 2 - (width - 220) / 2,
      y,
      size: 11,
      font: times,
      color: textColor,
      maxWidth: width - 220,
      lineHeight: 15,
    });
    // Duas linhas de reserva cobre o texto mais longo (melhora comprovada);
    // frases curtas deixam um respiro extra, que é aceitável num diploma.
    y -= 40;
  }

  y -= 6;
  page.drawText(`Emitido em ${data.issuedAt.toLocaleDateString("pt-BR")}.`, {
    x: width / 2 - 60,
    y,
    size: 10,
    font: timesItalic,
    color: mutedColor,
  });

  // Ressalva legal — declaração baseada em evidência, não substitui laudo
  // técnico nem dispensa as demais exigências do PGR.
  const disclaimer =
    "Este certificado é uma declaração baseada nos dados registrados na plataforma Sentinel e não substitui laudo técnico de\n" +
    "profissional habilitado, nem dispensa as demais exigências do Programa de Gerenciamento de Riscos (PGR) da empresa.";
  centeredText(page, disclaimer.split("\n")[0], 92, 7.5, timesItalic, mutedColor, width);
  centeredText(page, disclaimer.split("\n")[1], 82, 7.5, timesItalic, mutedColor, width);

  page.drawLine({ start: { x: 60, y: 70 }, end: { x: 260, y: 70 }, thickness: 0.75, color: textColor });
  page.drawText("Plataforma Sentinel", { x: 60, y: 55, size: 10, font: helveticaBold, color: textColor });
  page.drawText("Declaração automática baseada em dados", { x: 60, y: 43, size: 8, font: timesItalic, color: mutedColor });

  // Hash e QR na mesma coluna de 80pt, hash quebrado em 2 linhas — um UUID
  // inteiro numa linha só (36 caracteres) vazava por cima do QR.
  const qrX = width - 130;
  const qrImageBytes = Buffer.from(data.qrCodeDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  page.drawText("Validar em:", { x: qrX, y: 128, size: 8, font: helveticaBold, color: textColor });
  page.drawText(data.uniqueHash.slice(0, 18), { x: qrX, y: 117, size: 7, font: helvetica, color: mutedColor });
  page.drawText(data.uniqueHash.slice(18), { x: qrX, y: 107, size: 7, font: helvetica, color: mutedColor });
  page.drawImage(qrImage, { x: qrX, y: 43, width: 60, height: 60 });

  return pdfDoc.save();
}
