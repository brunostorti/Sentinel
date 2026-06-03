"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Icon } from "@/components/icon";
import { bulkApproveActionPlans, generatePlansForSurvey } from "./actions";
import type { PlanView } from "./types";

interface ActionPlansListProps {
  plans: PlanView[];
  surveysWithoutPlans: { id: string; title: string }[];
  canManage: boolean;
  hasAnySurveys: boolean;
  hasApiKey: boolean;
}

const PRIORITY_ORDER: Record<string, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

type SortBy = "priority" | "risk" | "date";

const PRIORITY_BADGE: Record<string, { cls: string; label: string; icon: string }> = {
  critica: { cls: "bg-red-500 text-white", label: "Crítica", icon: "emergency" },
  alta: { cls: "bg-orange-500 text-white", label: "Alta", icon: "priority_high" },
  media: { cls: "bg-blue-500 text-white", label: "Média", icon: "drag_handle" },
  baixa: { cls: "bg-muted text-muted-foreground", label: "Baixa", icon: "arrow_downward" },
};

const RISK_COLOR: Record<string, string> = {
  RED: "bg-red-500",
  YELLOW: "bg-amber-500",
};

export function ActionPlansList({
  plans: allPlans,
  surveysWithoutPlans,
  canManage,
  hasAnySurveys,
  hasApiKey,
}: ActionPlansListProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["PENDING_REVIEW"])
  );
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [generatingForSurvey, setGeneratingForSurvey] = useState<string | null>(
    null
  );

  const pending = allPlans.filter((p) => p.status === "PENDING_REVIEW");
  const approved = allPlans.filter((p) => p.status === "APPROVED");
  const completed = allPlans.filter((p) => p.status === "COMPLETED");
  const rejected = allPlans.filter((p) => p.status === "REJECTED");

  function sortPlans(arr: PlanView[]) {
    return [...arr].sort((a, b) => {
      if (sortBy === "priority")
        return (
          (PRIORITY_ORDER[a.priority ?? "media"] ?? 2) -
          (PRIORITY_ORDER[b.priority ?? "media"] ?? 2)
        );
      if (sortBy === "risk")
        return a.riskLevel === "RED" ? -1 : b.riskLevel === "RED" ? 1 : 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleBulkApprove() {
    setBulkLoading(true);
    const ids = pending.map((p) => p.id);
    const result = await bulkApproveActionPlans(ids);
    setBulkLoading(false);
    setShowBulkConfirm(false);
    if (!result.error) router.refresh();
  }

  async function handleGenerate(surveyId: string) {
    setGeneratingForSurvey(surveyId);
    const result = await generatePlansForSurvey(surveyId);
    setGeneratingForSurvey(null);
    if (result.error) {
      // mostra erro mais explícito no banner
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  // ─── Empty states ─────────────────────────────────────────
  if (allPlans.length === 0 && surveysWithoutPlans.length === 0) {
    return (
      <EmptyState
        icon={!hasAnySurveys ? "assignment" : !hasApiKey ? "psychology" : "hourglass_empty"}
        title={
          !hasAnySurveys
            ? "Nenhuma pesquisa encerrada"
            : !hasApiKey
              ? "IA não configurada"
              : "Nenhum plano gerado ainda"
        }
        subtitle={
          !hasAnySurveys
            ? "Os planos de ação são gerados ao encerrar uma pesquisa."
            : !hasApiKey
              ? "Configure ANTHROPIC_API_KEY no servidor."
              : "Encerre uma pesquisa com respostas para gerar planos."
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header compacto: 3 contadores + sort ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Counter label="Pendentes" value={pending.length} accent="amber" />
          <Counter label="Aprovados" value={approved.length} accent="blue" />
          <Counter label="Concluídos" value={completed.length} accent="emerald" />
          {rejected.length > 0 && (
            <Counter label="Rejeitados" value={rejected.length} accent="zinc" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-md border border-input bg-card px-2 py-1 text-xs"
          >
            <option value="priority">Prioridade</option>
            <option value="risk">Risco</option>
            <option value="date">Data</option>
          </select>
        </div>
      </div>

      {/* ─── Banner pesquisas sem planos ─── */}
      {canManage && surveysWithoutPlans.length > 0 && (
        <Card className="border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="auto_awesome" size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">
                {surveysWithoutPlans.length === 1
                  ? "1 pesquisa encerrada sem planos"
                  : `${surveysWithoutPlans.length} pesquisas encerradas sem planos`}
              </p>
              <div className="mt-2 space-y-1.5">
                {surveysWithoutPlans.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-1.5"
                  >
                    <span className="truncate text-xs">{s.title}</span>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 gap-1 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm shadow-primary/10 transition-all active:scale-95"
                      onClick={() => handleGenerate(s.id)}
                      disabled={generatingForSurvey !== null}
                    >
                      <Icon name="auto_awesome" size={12} />
                      {generatingForSurvey === s.id ? "Gerando..." : "Gerar planos"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Grupo: Pendentes (sempre destacado, ação primária) ─── */}
      <Group
        title="Aguardando revisão"
        icon="schedule"
        accent="amber"
        count={pending.length}
        open={openGroups.has("PENDING_REVIEW")}
        onToggle={() => toggleGroup("PENDING_REVIEW")}
        action={
          canManage && pending.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setShowBulkConfirm(true);
              }}
            >
              <Icon name="done_all" size={12} />
              Aprovar todos
            </Button>
          ) : null
        }
      >
        {pending.length === 0 ? (
          <EmptyGroup text="Nenhum plano aguardando revisão." />
        ) : (
          sortPlans(pending).map((p) => <CompactPlanRow key={p.id} plan={p} />)
        )}
      </Group>

      {/* ─── Grupo: Aprovados ─── */}
      <Group
        title="Aprovados"
        icon="play_circle"
        accent="blue"
        count={approved.length}
        open={openGroups.has("APPROVED")}
        onToggle={() => toggleGroup("APPROVED")}
      >
        {approved.length === 0 ? (
          <EmptyGroup text="Ainda não aprovou nenhum plano." />
        ) : (
          sortPlans(approved).map((p) => <CompactPlanRow key={p.id} plan={p} />)
        )}
      </Group>

      {/* ─── Grupo: Concluídos ─── */}
      <Group
        title="Concluídos"
        icon="check_circle"
        accent="emerald"
        count={completed.length}
        open={openGroups.has("COMPLETED")}
        onToggle={() => toggleGroup("COMPLETED")}
      >
        {completed.length === 0 ? (
          <EmptyGroup text="Nenhum plano concluído ainda." />
        ) : (
          sortPlans(completed).map((p) => <CompactPlanRow key={p.id} plan={p} />)
        )}
      </Group>

      {/* ─── Grupo: Rejeitados (só mostra se houver) ─── */}
      {rejected.length > 0 && (
          <Group
            title="Rejeitados"
            icon="cancel"
            accent="zinc"
            count={rejected.length}
            open={openGroups.has("REJECTED")}
            onToggle={() => toggleGroup("REJECTED")}
          >
            {sortPlans(rejected).map((p) => (
              <CompactPlanRow key={p.id} plan={p} />
            ))}
          </Group>
      )}

      {/* ─── Bulk approve dialog ─── */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar aprovação em massa</DialogTitle>
            <DialogDescription>
              {pending.length} plano(s) pendente(s) serão aprovados e virarão
              tarefa(s) no Kanban. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkApprove} disabled={bulkLoading}>
              {bulkLoading ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Subcomponents
   ───────────────────────────────────────────────────────────────── */

function Counter({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "emerald" | "zinc" | "blue";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    emerald:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400",
  };
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors[accent]}`}
    >
      <span className="tabular-nums text-sm font-black">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

function Group({
  title,
  icon,
  accent,
  count,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  icon: string;
  accent: "amber" | "emerald" | "zinc" | "blue";
  count: number;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = {
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    zinc: "text-zinc-500",
  };
  const hasItems = count > 0;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={hasItems ? onToggle : undefined}
        disabled={!hasItems}
        className={`flex w-full items-center gap-3 px-4 py-3 transition ${
          hasItems ? "hover:bg-accent/40 cursor-pointer" : "cursor-default opacity-80"
        }`}
      >
        {hasItems ? (
          <Icon
            name={open ? "expand_more" : "chevron_right"}
            size={20}
            className="text-muted-foreground transition-transform duration-200"
          />
        ) : (
          <div className="w-5 h-5 shrink-0" />
        )}
        <Icon name={icon} size={18} className={colors[accent]} />
        <p className="flex-1 text-left text-sm font-bold">
          {title} <span className="font-normal text-muted-foreground text-xs ml-1.5">({count})</span>
        </p>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </button>
      {hasItems && open && (
        <div className="border-t border-border divide-y divide-border">
          {children}
        </div>
      )}
    </Card>
  );
}

function EmptyGroup({ text }: { text: string }) {
  return (
    <p className="px-4 py-6 text-center text-xs text-muted-foreground">{text}</p>
  );
}

function CompactPlanRow({ plan }: { plan: PlanView }) {
  const priority = PRIORITY_BADGE[plan.priority ?? "media"] ?? PRIORITY_BADGE.media;
  const riskColor = RISK_COLOR[plan.riskLevel] ?? "bg-zinc-400";
  const rec = plan.recommendation;

  return (
    <Link
      href={`/planos-acao/${plan.id}`}
      className="group flex items-start gap-3 px-4 py-3 transition hover:bg-accent/30"
    >
      {/* Barra de cor (risk) à esquerda */}
      <div className={`mt-1 h-12 w-1 shrink-0 rounded-full ${riskColor}`} />

      {/* Conteúdo principal */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={`h-5 gap-0.5 text-[10px] ${priority.cls}`}>
            <Icon name={priority.icon} size={10} />
            {priority.label}
          </Badge>
          {rec.nr1_compliance && (
            <Badge variant="outline" className="h-5 gap-0.5 text-[10px]">
              <Icon name="gavel" size={10} />
              NR-1
            </Badge>
          )}
          {plan.status === "COMPLETED" && plan.outcome && (
            <Badge variant="outline" className="h-5 gap-0.5 text-[10px] border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon name="check" size={10} />
              {plan.outcome === "successful"
                ? "Funcionou bem"
                : plan.outcome === "partial"
                ? "Parcial"
                : plan.outcome === "unsuccessful"
                ? "Não funcionou"
                : "Em andamento"}
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            {plan.dimensionName}
          </span>
        </div>

        <h3 className="mt-1 line-clamp-1 text-sm font-bold leading-snug">
          {rec.title}
        </h3>

        {rec.quick_action && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            ⚡ {rec.quick_action}
          </p>
        )}

        {/* Footer de KPIs em linha */}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {rec.investment?.total_annual && rec.investment.total_annual !== "N/D" && (
            <span className="inline-flex items-center gap-1">
              <Icon name="payments" size={12} className="text-blue-500" />
              {rec.investment.total_annual}
            </span>
          )}
          {rec.expected_return?.payback_period &&
            rec.expected_return.payback_period !== "N/D" && (
              <span className="inline-flex items-center gap-1">
                <Icon name="timer" size={12} className="text-emerald-500" />
                {rec.expected_return.payback_period}
              </span>
            )}
          {plan.timeframe && (
            <span className="inline-flex items-center gap-1">
              <Icon name="schedule" size={12} className="text-violet-500" />
              {plan.timeframe}
            </span>
          )}
          {rec.vendors && rec.vendors.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="store" size={12} className="text-cyan-500" />
              {rec.vendors.length} fornecedor{rec.vendors.length > 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Chevron à direita */}
      <Icon
        name="chevron_right"
        size={18}
        className="mt-3 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground/70"
      />
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-transparent p-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10">
        <Icon name={icon} size={32} className="text-primary/40" />
      </div>
      <p className="mt-4 text-base font-bold text-foreground/70">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
