import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";
import { getMasterAdmin } from "@/lib/sentinel/server";
import { adminActionLabel } from "@/lib/sentinel/audit-labels";

const LIMIT = 300;

/** Tudo o que a equipe Sentinel fez pelo Painel Master, com filtro por empresa. */
export default async function TeamActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const admin = await getMasterAdmin();
  if (!admin) redirect("/inicio");

  const { empresa } = await searchParams;
  const db = createAdminClient();
  let query = db
    .from("admin_audit_log")
    .select("id, action, created_at, target_company_id, users(name)")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (empresa) query = query.eq("target_company_id", empresa);

  const [{ data: rows }, { data: companies }] = await Promise.all([
    query,
    db.from("companies").select("id, name").order("name"),
  ]);
  const names = new Map((companies ?? []).map((c) => [c.id as string, c.name as string]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Painel Sentinel</p>
        <h1 className="text-3xl font-black tracking-tight">Atividade da equipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O que cada pessoa da equipe fez pelo Painel Master: empresas criadas, planos alterados, chaves testadas, notas.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="empresa" className="font-semibold">
          Empresa
        </label>
        <select
          id="empresa"
          name="empresa"
          defaultValue={empresa ?? ""}
          className="h-9 rounded-md border border-border bg-card px-2"
        >
          <option value="">Todas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id as string} value={c.id as string}>
              {c.name as string}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground">
          Filtrar
        </button>
        {empresa && (
          <Link href="/atividade" className="text-xs font-semibold text-primary hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <div className="rounded-xl border border-border bg-card">
        {!rows?.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma ação registrada.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((r) => {
              const companyId = r.target_company_id as string | null;
              return (
                <li key={r.id as string} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5">
                  <span className="w-36 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(r.created_at as string).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Sao_Paulo",
                    })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{(r.users as unknown as { name: string } | null)?.name ?? "—"}</span>{" "}
                    <span className="lowercase">{adminActionLabel(r.action as string)}</span>
                    {companyId && (
                      <>
                        {" · "}
                        <Link href={`/empresas/${companyId}`} className="font-semibold text-primary hover:underline">
                          {names.get(companyId) ?? "empresa removida"}
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {(rows?.length ?? 0) >= LIMIT && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon name="info" size={14} />
          Mostrando as {LIMIT} ações mais recentes. Filtre por empresa para ver mais antigas.
        </p>
      )}
    </div>
  );
}
