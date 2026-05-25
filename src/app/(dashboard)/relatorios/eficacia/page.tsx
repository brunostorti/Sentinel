import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ATTRIBUTION_LABEL: Record<string, { label: string; class: string }> = {
  high: { label: "Alta", class: "text-green-600" },
  medium: { label: "Média", class: "text-amber-600" },
  low: { label: "Baixa", class: "text-zinc-500" },
  none: { label: "Nenhuma", class: "text-red-600" },
  cannot_tell: { label: "Não dá pra dizer", class: "text-zinc-400" },
};

const STATUS_LABEL: Record<string, { icon: string; class: string }> = {
  computed: { icon: "•", class: "" },
  unmeasurable: { icon: "—", class: "text-zinc-400" },
  anonymity_blocked: { icon: "🔒", class: "text-zinc-400" },
  pending: { icon: "⋯", class: "text-amber-500" },
};

export default async function EficaciaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();
  if (!userData) redirect("/entrar");

  const { data: outcomes } = await supabase
    .from("action_outcomes")
    .select(`
      id, intervention_id, score_before, score_after, delta, outcome_status,
      hr_attribution, hr_notes, delta_computed_at, created_at,
      questionnaire_scales(name),
      action_plans(ai_recommendation)
    `)
    .eq("company_id", userData.company_id!)
    .order("delta_computed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = outcomes ?? [];
  const completed = rows.filter((r) => r.hr_attribution != null);
  const highImpact = completed.filter((r) => r.hr_attribution === "high");
  const avgDelta = highImpact.length
    ? Math.round(
        (highImpact.reduce((s, r) => s + (r.delta ?? 0), 0) / highImpact.length) *
          10
      ) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Eficácia das ações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o impacto medido das ações já tomadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/relatorios/eficacia/export?format=csv"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            ⬇ CSV
          </a>
          <a
            href="/api/relatorios/eficacia/export?format=pdf"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            ⬇ PDF
          </a>
          <Link
            href="/relatorios"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            ← Relatórios
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Total
          </p>
          <p className="text-3xl font-black">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Alto impacto
          </p>
          <p className="text-3xl font-black text-green-600">{highImpact.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Δ médio (sucessos)
          </p>
          <p className="text-3xl font-black">
            {avgDelta > 0 ? "+" : ""}
            {avgDelta} pts
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Ação</th>
                <th className="px-4 py-3 text-left font-bold">Dimensão</th>
                <th className="px-4 py-3 text-right font-bold">Antes</th>
                <th className="px-4 py-3 text-right font-bold">Depois</th>
                <th className="px-4 py-3 text-right font-bold">Δ</th>
                <th className="px-4 py-3 text-left font-bold">Atribuição</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Nenhuma ação medida ainda. Os outcomes aparecem aqui após a
                    próxima pesquisa fechar.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const dim = (r.questionnaire_scales as { name?: string } | null)?.name;
                const rec = (r.action_plans as { ai_recommendation?: { title?: string } } | null)
                  ?.ai_recommendation;
                const attrInfo = r.hr_attribution
                  ? ATTRIBUTION_LABEL[r.hr_attribution]
                  : null;
                const statusInfo = r.outcome_status
                  ? STATUS_LABEL[r.outcome_status]
                  : STATUS_LABEL.pending;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{rec?.title ?? r.intervention_id}</p>
                      <p className="text-xs text-muted-foreground">{r.intervention_id}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{dim ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.score_before}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.score_after ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${
                        r.delta != null && r.delta > 0
                          ? "text-green-600"
                          : r.delta != null && r.delta < 0
                            ? "text-red-600"
                            : ""
                      }`}
                    >
                      {r.delta != null ? (r.delta > 0 ? `+${r.delta}` : r.delta) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {attrInfo ? (
                        <span className={attrInfo.class}>{attrInfo.label}</span>
                      ) : (
                        <Badge variant="outline">pendente</Badge>
                      )}
                    </td>
                    <td className={`px-4 py-3 ${statusInfo.class}`}>
                      {statusInfo.icon}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
