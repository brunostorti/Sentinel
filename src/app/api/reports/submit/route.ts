import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { generateProtocol } from "@/lib/reports/protocol";
import { isOccurrenceType } from "@/lib/reports/occurrence-types";
import {
  ATTACHMENT_TYPES,
  AttachmentError,
  sanitizeAttachment,
} from "@/lib/reports/sanitize-attachment";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 10_000;
const PROTOCOL_ATTEMPTS = 3;

/** Dia de hoje em Brasília (AAAA-MM-DD), o mesmo que o banco grava. */
function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  try {
    // O login do colaborador só libera o envio: e-mail e usuário NÃO são gravados.
    const employee = await getEmployeeContext();
    if (!employee) {
      return fail("Sua sessão expirou. Entre novamente pelo link enviado ao seu e-mail.", 401);
    }
    if (employee.companies.length === 0) {
      return fail(
        "Seu e-mail não está no cadastro de colaboradores de nenhuma empresa. Fale com o RH.",
        403
      );
    }

    const formData = await req.formData();
    const requestedCompany = String(formData.get("companyId") ?? "").trim();
    const occurrenceType = String(formData.get("occurrenceType") ?? "");
    const description = String(formData.get("description") ?? "").trim();
    const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

    // A empresa vem do cadastro da pessoa; o navegador só escolhe entre as dela.
    const company = requestedCompany
      ? employee.companies.find((c) => c.id === requestedCompany)
      : employee.companies.length === 1
        ? employee.companies[0]
        : undefined;
    if (!company) return fail("Escolha uma das empresas em que você trabalha.", 400);

    if (!isOccurrenceType(occurrenceType)) return fail("Escolha o tipo de ocorrência.", 400);
    if (description.length < MIN_DESCRIPTION) {
      return fail(`Descreva o ocorrido com pelo menos ${MIN_DESCRIPTION} caracteres.`, 400);
    }
    if (description.length > MAX_DESCRIPTION) {
      return fail("O relato está muito longo. Resuma em até 10 mil caracteres.", 400);
    }

    if (files.length > MAX_ATTACHMENTS) return fail(`Envie no máximo ${MAX_ATTACHMENTS} anexos.`, 400);
    for (const file of files) {
      if (!ATTACHMENT_TYPES[file.type]) return fail("Anexos aceitos: PDF, JPG ou PNG.", 400);
      if (file.size > MAX_ATTACHMENT_BYTES) return fail("Cada anexo pode ter no máximo 10 MB.", 400);
    }

    // Anexos sem dados escondidos (GPS, aparelho, autor) antes de qualquer gravação.
    const cleaned: { bytes: Uint8Array; type: string }[] = [];
    for (const file of files) {
      try {
        cleaned.push({
          bytes: await sanitizeAttachment(new Uint8Array(await file.arrayBuffer()), file.type),
          type: file.type,
        });
      } catch (e) {
        if (e instanceof AttachmentError) return fail(e.message, 400);
        throw e;
      }
    }

    const admin = createAdminClient();

    // Bucket privado: guardamos só o caminho (nome aleatório); o RH gera links temporários.
    const attachments: string[] = [];
    for (const file of cleaned) {
      const path = `${company.id}/${crypto.randomUUID()}.${ATTACHMENT_TYPES[file.type]}`;
      const { error } = await admin.storage
        .from("reports")
        .upload(path, file.bytes, { contentType: file.type });
      if (error) {
        console.error("Report attachment upload error:", error);
        if (attachments.length) await admin.storage.from("reports").remove(attachments);
        return fail("Não foi possível enviar um dos anexos. Tente novamente.", 500);
      }
      attachments.push(path);
    }

    // Data e hora são cortadas para o dia (trigger reports_day_only) e is_anonymous = true.
    let protocol = "";
    for (let attempt = 0; attempt < PROTOCOL_ATTEMPTS && !protocol; attempt++) {
      const candidate = generateProtocol();
      const { error } = await admin.from("reports").insert({
        company_id: company.id,
        protocol: candidate,
        occurrence_type: occurrenceType,
        description,
        attachments,
        is_anonymous: true,
        status: "PENDING",
      });
      if (!error) protocol = candidate;
      else if (error.code !== "23505") {
        console.error("Report insert error:", error);
        break;
      }
    }

    if (!protocol) {
      if (attachments.length) await admin.storage.from("reports").remove(attachments);
      return fail("Erro ao registrar a denúncia. Tente novamente.", 500);
    }

    return NextResponse.json({ protocol, type: occurrenceType, sentOn: todayInBrazil() });
  } catch (error: unknown) {
    console.error("Report submission error:", error);
    return fail("Erro ao enviar a denúncia. Tente novamente.", 500);
  }
}
