import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Tipo MIME aceito → extensão gravada (os mesmos tipos do limite do bucket). */
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: "Acesse pelo link enviado ao email cadastrado para enviar a denúncia." },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const companyId = formData.get("companyId") as string;
    const occurrenceType = formData.get("occurrenceType") as string;
    const description = formData.get("description") as string;
    const isAnonymous = formData.get("isAnonymous") === "true";
    const files = formData.getAll("files") as File[];

    if (!companyId || !occurrenceType || !description) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const normalizedEmail = user.email.trim().toLowerCase();
    const { data: employee, error: employeeError } = await admin
      .from("employees")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (employeeError) {
      console.error("Employee validation error:", employeeError);
      return NextResponse.json({ error: "Erro ao validar colaborador" }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Seu email autenticado não pertence à empresa selecionada." },
        { status: 403 }
      );
    }

    // 1. Generate Protocol: PROT-2026-XXXXXX
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const protocol = `PROT-2026-${randomPart}`;

    // 2. Upload attachments if any. O bucket é privado (migração 021): guardamos só o
    // caminho do arquivo; a tela do RH gera links temporários assinados.
    const realFiles = files.filter((f) => f.size > 0);
    if (realFiles.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `Envie no máximo ${MAX_ATTACHMENTS} anexos.` },
        { status: 400 }
      );
    }
    for (const file of realFiles) {
      if (!ALLOWED_TYPES[file.type]) {
        return NextResponse.json(
          { error: "Anexos aceitos: PDF, JPG ou PNG." },
          { status: 400 }
        );
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { error: "Cada anexo pode ter no máximo 10 MB." },
          { status: 400 }
        );
      }
    }

    const attachments: string[] = [];
    for (const file of realFiles) {
      // Extensão derivada do tipo validado, nunca do nome enviado pelo cliente.
      const filePath = `${companyId}/${crypto.randomUUID()}.${ALLOWED_TYPES[file.type]}`;

      const { error: uploadError } = await admin.storage
        .from("reports")
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Não foi possível enviar um dos anexos. Tente novamente." },
          { status: 500 }
        );
      }

      attachments.push(filePath);
    }

    // 3. Insert report. The authenticated email is used only as an access gate;
    // it is intentionally not persisted with the report.
    const { error: insertError } = await admin
      .from("reports")
      .insert({
        company_id: companyId,
        protocol,
        occurrence_type: occurrenceType,
        description,
        is_anonymous: isAnonymous,
        attachments,
        status: "PENDING",
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Erro ao salvar denúncia" }, { status: 500 });
    }

    return NextResponse.json({ protocol });
  } catch (error: unknown) {
    console.error("Report submission error:", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar denúncia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
