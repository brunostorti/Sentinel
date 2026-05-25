import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssistantView } from "./assistant-view";

export default async function AssistentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role, name")
    .eq("auth_id", user.id)
    .single();
  if (!userData) redirect("/entrar");

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", userData.company_id!)
    .single();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight">Assistente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Converse com a IA da {company?.name ?? "empresa"} sobre saúde organizacional.
        </p>
      </div>

      <AssistantView userName={userData.name} />
    </div>
  );
}
