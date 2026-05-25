import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Banner que aparece no painel quando setup_completeness < 60.
 * É um Server Component — busca o profile direto. Renderiza nada se completude >= 60%.
 */
export async function SetupCompletenessBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData || !["HR", "ADMIN"].includes(userData.role)) return null;

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("setup_completeness")
    .eq("company_id", userData.company_id!)
    .single();

  const pct = profile?.setup_completeness ?? 0;
  if (pct >= 60) return null;

  return (
    <Link
      href="/configuracoes/perfil"
      className="block rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
    >
      <div className="flex items-center gap-4">
        <div className="text-2xl">⚙</div>
        <div className="flex-1">
          <p className="font-bold">
            Seu perfil está {Math.round(pct)}% completo
          </p>
          <p className="text-sm text-muted-foreground">
            Planos podem ficar genéricos até preencher. Clique para completar agora.
          </p>
        </div>
        <span className="text-sm font-medium">Completar →</span>
      </div>
    </Link>
  );
}
