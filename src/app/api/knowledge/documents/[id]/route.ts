import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KB_BUCKET } from "@/lib/rag/config";

/** DELETE — apaga um documento da empresa: arquivo, registro e trechos (cascata). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: caller } = await supabase.from("users").select("company_id, role").eq("auth_id", user.id).single();
  if (!caller?.company_id) return NextResponse.json({ error: "Sem empresa." }, { status: 403 });
  if (caller.role !== "HR" && caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Só RH e administradores excluem documentos." }, { status: 403 });
  }

  const admin = createAdminClient();
  // Só documentos da própria empresa (a base global não é editável por aqui).
  const { data: doc } = await admin
    .from("kb_documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("company_id", caller.company_id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

  if (doc.storage_path) {
    const { error } = await admin.storage.from(KB_BUCKET).remove([doc.storage_path]);
    if (error) return NextResponse.json({ error: "Falha ao apagar o arquivo." }, { status: 500 });
  }
  const { error } = await admin.from("kb_documents").delete().eq("id", doc.id);
  if (error) return NextResponse.json({ error: "Falha ao apagar o documento." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** GET — baixa o arquivo original do documento da empresa. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: caller } = await supabase.from("users").select("company_id").eq("auth_id", user.id).single();
  if (!caller?.company_id) return NextResponse.json({ error: "Sem empresa." }, { status: 403 });

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("kb_documents")
    .select("id, storage_path, file_name")
    .eq("id", id)
    .eq("company_id", caller.company_id)
    .maybeSingle();

  if (!doc || !doc.storage_path) {
    return NextResponse.json({ error: "Documento ou arquivo não encontrado." }, { status: 404 });
  }

  const { data: fileBlob, error } = await admin.storage.from(KB_BUCKET).download(doc.storage_path);
  if (error || !fileBlob) {
    return NextResponse.json({ error: "Falha ao baixar arquivo." }, { status: 500 });
  }

  const buffer = await fileBlob.arrayBuffer();
  const encodedName = encodeURIComponent(doc.file_name);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": fileBlob.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
    },
  });
}
