"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatReportDay } from "@/lib/reports/format";
import { FEEDBACK_RATINGS, isFeedbackRating } from "@/lib/feedback/constants";
import { setFeedbackStatus } from "./actions";

export interface FeedbackItem {
  id: string;
  rating: string;
  message: string;
  status: "NEW" | "READ";
  createdAt: string;
  planId: string | null;
  planTitle: string | null;
  department: string | null;
}

const RATING_STYLE: Record<string, string> = {
  FUNCIONANDO: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  AJUSTAR: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  NAO_FUNCIONA: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

type StatusFilter = "all" | "NEW" | "READ";
const GENERAL = "__general__";

export function FeedbacksClient({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ratingFilter, setRatingFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const plans = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) if (i.planId && i.planTitle) map.set(i.planId, i.planTitle);
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [items]);

  const visible = items.filter(
    (i) =>
      (statusFilter === "all" || i.status === statusFilter) &&
      (!ratingFilter || i.rating === ratingFilter) &&
      (!planFilter || (planFilter === GENERAL ? !i.planId : i.planId === planFilter))
  );

  const counts = {
    total: items.length,
    unread: items.filter((i) => i.status === "NEW").length,
    adjust: items.filter((i) => i.rating !== "FUNCIONANDO").length,
  };

  async function toggle(item: FeedbackItem) {
    const next = item.status === "NEW" ? "READ" : "NEW";
    setBusy(item.id);
    const result = await setFeedbackStatus(item.id, next);
    setBusy(null);
    if (result.error) return toast.error(result.error);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight">Feedbacks dos colaboradores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Opiniões anônimas sobre os planos de ação em andamento. Use-as para repensar e ajustar
          os planos. Só aparecem para departamentos com 5 ou mais pessoas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat value={counts.total} label="Feedbacks recebidos" icon="rate_review" cls="text-blue-600 bg-blue-500/10" />
        <Stat value={counts.unread} label="Não lidos" icon="mark_email_unread" cls="text-violet-600 bg-violet-500/10" />
        <Stat value={counts.adjust} label="Pedem ajustes" icon="tune" cls="text-amber-600 bg-amber-500/10" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "NEW", "READ"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {s === "all" ? "Todos" : s === "NEW" ? "Não lidos" : "Lidos"}
          </button>
        ))}
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold"
          aria-label="Filtrar por avaliação"
        >
          <option value="">Todas as avaliações</option>
          {Object.entries(FEEDBACK_RATINGS).map(([key, r]) => (
            <option key={key} value={key}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="max-w-xs rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold"
          aria-label="Filtrar por plano de ação"
        >
          <option value="">Todos os planos</option>
          <option value={GENERAL}>Sugestões gerais (sem plano)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Icon name="rate_review" size={32} className="text-primary/40" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            {items.length === 0 ? "Nenhum feedback recebido ainda" : "Nenhum feedback neste filtro"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os colaboradores enviam pela aba Feedback, na área deles.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const rating = isFeedbackRating(item.rating) ? FEEDBACK_RATINGS[item.rating] : null;
            return (
              <Card key={item.id} className={cn(item.status === "NEW" && "border-primary/30")}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                        RATING_STYLE[item.rating] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon name={rating?.icon ?? "info"} size={14} />
                      {rating?.label ?? item.rating}
                    </span>
                    {item.status === "NEW" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        Novo
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatReportDay(item.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="lightbulb" size={14} />
                      {item.planId ? (
                        <Link href={`/planos-acao/${item.planId}`} className="font-semibold text-primary hover:underline">
                          {item.planTitle}
                        </Link>
                      ) : (
                        "Sugestão geral"
                      )}
                    </span>
                    {item.department && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="apartment" size={14} />
                        {item.department}
                      </span>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{item.message}</p>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={busy === item.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                    >
                      <Icon name={item.status === "NEW" ? "done" : "mark_email_unread"} size={14} />
                      {item.status === "NEW" ? "Marcar como lido" : "Marcar como não lido"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, icon, cls }: { value: number; label: string; icon: string; cls: string }) {
  return (
    <Card className="border border-border/80 shadow-sm">
      <CardContent className="flex items-center gap-4 px-5 py-5">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", cls)}>
          <Icon name={icon} size={22} />
        </div>
        <div>
          <p className="text-2xl font-black tabular-nums tracking-tight">{value}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
