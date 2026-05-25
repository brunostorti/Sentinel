import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HistoricoList } from "./historico-list";

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData) redirect("/entrar");
  if (!["HR", "ADMIN"].includes(userData.role)) redirect("/painel");

  const [{ data: actions }, { data: categories }] = await Promise.all([
    supabase
      .from("company_actions_taken")
      .select("*, universal_categories(name, code)")
      .eq("company_id", userData.company_id!)
      .order("year_started", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("universal_categories").select("id, name, code").order("display_order"),
  ]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Histórico de ações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O que essa empresa já tentou. Usado pela IA para evitar repetir o que falhou.
          </p>
        </div>
        <Link
          href="/configuracoes/perfil"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          ← Voltar ao perfil
        </Link>
      </div>

      <HistoricoList
        initialActions={(actions ?? []) as never[]}
        categories={(categories ?? []) as never[]}
      />
    </div>
  );
}
