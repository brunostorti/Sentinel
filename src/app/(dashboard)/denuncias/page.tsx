import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DenunciasClient } from "./denuncias-client";

export default async function DenunciasAdminPage() {
  const supabase = await createClient();
  
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData?.company_id) redirect("/painel");

  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .eq("company_id", userData.company_id)
    .order("created_at", { ascending: false });

  // Map to matching Report type
  const typedReports = (reports || []).map((r: any) => ({
    id: r.id,
    company_id: r.company_id,
    protocol: r.protocol,
    occurrence_type: r.occurrence_type,
    description: r.description,
    is_anonymous: r.is_anonymous,
    status: r.status as "PENDING" | "RESOLVED",
    created_at: r.created_at,
    updated_at: r.updated_at,
    attachments: r.attachments,
  }));

  return <DenunciasClient initialReports={typedReports} />;
}
