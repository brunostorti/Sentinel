import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import crypto from "crypto";
import { networkInterfaces } from "os";

function getBaseUrl(req: Request) {
  // If production env var is set, use it
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In development, try to get local network IP so mobile phones can scan the QR code
  if (process.env.NODE_ENV === "development") {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      if (nets[name]) {
        for (const net of nets[name]!) {
          // Skip internal (i.e. 127.0.0.1) and non-ipv4 addresses
          if (net.family === "IPv4" && !net.internal) {
            return `http://${net.address}:3000`;
          }
        }
      }
    }
  }

  // Fallback to request host or localhost
  const host = req.headers.get("host");
  if (host) return `http://${host}`;
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    // 1. Validate auth
    const { data: { user }, error: authError } = await (await supabase).auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { surveyId } = await req.json();
    if (!surveyId) {
      return NextResponse.json({ error: "Survey ID required" }, { status: 400 });
    }

    // 2. Gatekeeper: Fetch survey and verify
    const { data: survey, error: surveyError } = await (await supabase)
      .from("surveys")
      .select("*, companies(name)")
      .eq("id", surveyId)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (survey.status !== "CLOSED") {
      return NextResponse.json({ error: "Survey is not closed. Gatekeeper blocked." }, { status: 403 });
    }

    // 3. Gatekeeper: Check > 50% participation
    const { count: participantsCount } = await (await supabase)
      .from("survey_participants")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", surveyId);

    const { count: responsesCount } = await (await supabase)
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", surveyId);

    if (participantsCount === null || participantsCount === 0 || responsesCount === null) {
      return NextResponse.json({ error: "Missing participation data." }, { status: 400 });
    }

    const ratio = responsesCount / participantsCount;
    if (ratio <= 0.5) {
      return NextResponse.json({ error: `Participation must be > 50%. Found ${(ratio*100).toFixed(1)}%. Gatekeeper blocked.` }, { status: 403 });
    }

    // 4. Gatekeeper: Action plans approved
    const { data: actionPlans, error: actionPlansError } = await (await supabase)
      .from("action_plans")
      .select("status")
      .eq("survey_id", surveyId);

    if (actionPlansError) {
      return NextResponse.json({ error: "Error checking action plans." }, { status: 500 });
    }
    
    // We assume there must be at least one action plan (optional, but let's just check if ANY is not approved)
    if (actionPlans && actionPlans.length > 0) {
      const allApproved = actionPlans.every(ap => ap.status === "APPROVED");
      if (!allApproved) {
        return NextResponse.json({ error: "Not all AI action plans are approved by HR. Gatekeeper blocked." }, { status: 403 });
      }
    }

    // 5. Generate Hash & Store Certificate
    const uniqueHash = crypto.randomUUID();
    const baseUrl = getBaseUrl(req);
    const validationUrl = `${baseUrl}/validacao/${uniqueHash}`;

    const { error: insertError } = await (await supabase)
      .from("certificates")
      .insert({
        company_id: survey.company_id,
        survey_id: surveyId,
        unique_hash: uniqueHash,
        validation_url: validationUrl,
      });

    if (insertError) {
      return NextResponse.json({ error: "Error saving certificate record" }, { status: 500 });
    }

    // 6. Generate QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      margin: 1,
      width: 150,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // 7. Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
    const { width, height } = page.getSize();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const primaryColor = rgb(0.05, 0.35, 0.65); // #0D59A6
    const textColor = rgb(0.2, 0.2, 0.2);

    // External Border
    page.drawRectangle({
      x: 20, y: 20, width: width - 40, height: height - 40,
      borderColor: primaryColor, borderWidth: 4,
    });
    // Internal Border
    page.drawRectangle({
      x: 24, y: 24, width: width - 48, height: height - 48,
      borderColor: primaryColor, borderWidth: 1,
    });

    // Title
    page.drawText("CERTIFICADO DE CONFORMIDADE E SAÚDE OCUPACIONAL", {
      x: width / 2 - 270, y: height - 90, size: 18, font: helveticaBold, color: primaryColor,
    });

    const companyName = Array.isArray(survey.companies) ? survey.companies[0]?.name : (survey.companies as any)?.name || "Empresa";
    const issuedAt = new Date();
    const validUntil = new Date(issuedAt);
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    
    const formattedValid = validUntil.toLocaleDateString("pt-BR");

    // Body
    page.drawText(`Certificamos para os devidos fins de fiscalização que a empresa:`, { x: 80, y: height - 170, size: 12, font: helvetica, color: textColor });
    page.drawText(companyName.toUpperCase(), { x: 80, y: height - 200, size: 22, font: helveticaBold, color: rgb(0,0,0) });

    const statement = `Concluiu com êxito o ciclo de avaliação de riscos psicossociais referente à pesquisa "${survey.title}".\n\nA auditoria seguiu rigorosamente os padrões estabelecidos pela Norma Regulamentadora 1 (NR1),\naplicando integralmente o instrumento validado COPSOQ II.\n\nForam avaliadas e geradas ações de mitigação para as dimensões de:\n- Exigências Laborais (Quantitativas, Emocionais e Cognitivas)\n- Organização do Trabalho e Influência\n- Relações Sociais e Confiança na Liderança\n- Interface Trabalho-Indivíduo e Saúde Geral.`;
    
    page.drawText(statement, { x: 80, y: height - 250, size: 12, font: helvetica, color: textColor, lineHeight: 18 });

    // Validity & Signatures
    page.drawText("VALIDADE DO CERTIFICADO:", { x: 80, y: 150, size: 10, font: helveticaBold, color: textColor });
    page.drawText(`1 (Um) Ano — Expira em ${formattedValid}`, { x: 80, y: 135, size: 12, font: helveticaBold, color: primaryColor });

    page.drawLine({ start: { x: width / 2 - 50, y: 150 }, end: { x: width / 2 + 150, y: 150 }, thickness: 1, color: textColor });
    page.drawText("Plataforma Sentinel", { x: width / 2 - 10, y: 135, size: 12, font: helveticaBold, color: textColor });
    page.drawText("Auditoria Automática Baseada em Dados", { x: width / 2 - 40, y: 120, size: 9, font: helveticaOblique, color: rgb(0.4, 0.4, 0.4) });

    // QR Code
    const qrImageBytes = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImage, { x: width - 140, y: 40, width: 90, height: 90 });

    page.drawText("Atestado MTE (Online):", { x: width - 425, y: 80, size: 10, font: helveticaBold, color: textColor });
    page.drawText(uniqueHash, { x: width - 425, y: 65, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${survey.company_id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Certificate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
