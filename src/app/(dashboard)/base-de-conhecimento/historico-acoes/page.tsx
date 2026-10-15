import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { HistoricoList } from "./historico-list";

export default async function HistoricoAcoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/base-de-conhecimento"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon name="arrow_back" size={14} />
              Voltar à Base de conhecimento
            </Link>
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Histórico de ações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Intervenções anteriores e programas já tentados pela empresa. A IA consulta essas informações para não sugerir abordagens ineficazes nos novos planos de ação.
          </p>
        </div>
        <Link
          href="/base-de-conhecimento"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Icon name="arrow_back" size={16} />
          Voltar à Base de conhecimento
        </Link>
      </div>

      <HistoricoList
        initialActions={(actions ?? []) as never[]}
        categories={(categories ?? []) as never[]}
      />
    </div>
  );
}
