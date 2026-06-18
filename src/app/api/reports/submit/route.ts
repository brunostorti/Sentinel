import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

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

    // 2. Upload attachments if any
    const attachments: string[] = [];
    for (const file of files) {
      if (file.size === 0) continue;

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${companyId}/${fileName}`;

      const { error: uploadError } = await admin.storage
        .from("reports")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: { publicUrl } } = admin.storage
        .from("reports")
        .getPublicUrl(filePath);

      attachments.push(publicUrl);
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
