import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DenunciasClient } from "./denuncias-client";

/** Validade dos links dos anexos: o bucket é privado e o link expira. */
const ATTACHMENT_LINK_SECONDS = 60 * 60;

export default async function DenunciasAdminPage() {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData?.company_id) redirect("/painel");
  // Denúncias são restritas a RH/Admin: o gestor pode ser o próprio denunciado.
  if (userData.role !== "HR" && userData.role !== "ADMIN") redirect("/inicio");

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("company_id", userData.company_id)
    .order("created_at", { ascending: false });

  // Os anexos guardam o caminho no bucket privado; geramos links temporários.
  const paths = (reports ?? []).flatMap((r) => (r.attachments as string[] | null) ?? []);
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await createAdminClient()
      .storage.from("reports")
      .createSignedUrls(paths, ATTACHMENT_LINK_SECONDS);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  // Map to matching Report type
  const typedReports = (reports || []).map((r) => ({
    id: r.id,
    company_id: r.company_id,
    protocol: r.protocol,
    occurrence_type: r.occurrence_type,
    description: r.description,
    is_anonymous: r.is_anonymous,
    status: r.status as "PENDING" | "RESOLVED",
    created_at: r.created_at,
    updated_at: r.updated_at,
    attachments: ((r.attachments as string[] | null) ?? [])
      .map((path) => signedByPath.get(path))
      .filter((url): url is string => Boolean(url)),
  }));

  return <DenunciasClient initialReports={typedReports} />;
}
