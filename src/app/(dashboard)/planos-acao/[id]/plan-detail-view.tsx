"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { PlanV2 } from "@/components/plan/plan-v2";
import { PlanChatPanel } from "@/components/plan/plan-chat-panel";
import { toast } from "sonner";
import type { AIRecommendation } from "@/lib/ai/pipeline/types";
import type { KbReferenceWithRelevance } from "@/lib/ai/knowledge-base/references";

const RISK = {
  RED: { cls: "bg-red-500 text-white", label: "Risco" },
  YELLOW: { cls: "bg-amber-500 text-white", label: "Intermédio" },
};

const STATUS = {
  PENDING_REVIEW: { cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "Pendente", icon: "schedule" },
  APPROVED: { cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Aprovado", icon: "play_circle" },
  COMPLETED: { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Concluído", icon: "check_circle" },
  REJECTED: { cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Rejeitado", icon: "cancel" },
};

interface Props {
  planId: string;
  riskLevel: "RED" | "YELLOW";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED";
  dimensionName: string;
  surveyTitle: string;
  timeframe: string | null;
  targetDepartment: string | null;
  recommendation: AIRecommendation;
  canManage: boolean;
  references: KbReferenceWithRelevance[];
  initialOutcome?: "successful" | "partial" | "unsuccessful" | "in_progress" | null;
  initialOutcomeNotes?: string | null;
}

type Tab = "plano" | "chat";

export function PlanDetailView({
  planId,
  riskLevel,
  status,
  dimensionName,
  surveyTitle,
  timeframe,
  targetDepartment,
  recommendation,
  canManage,
  references,
  initialOutcome,
  initialOutcomeNotes,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("plano");
  const [isPending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [outcome, setOutcome] = useState(initialOutcome ?? "successful");
  const [notes, setNotes] = useState(initialOutcomeNotes || "");

  const risk = RISK[riskLevel];
  const stat = STATUS[status];

  function handleSaveEfficacy() {
    if (!outcome) return;
    startTransition(async () => {
      const res = await fetch(`/api/action-plans/${planId}/efficacy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Falha ao salvar feedback.");
        return;
      }
      toast.success("Notas de eficácia salvas.");
      router.refresh();
    });
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await fetch(`/api/action-plans/${planId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Falha ao aprovar.");
        return;
      }
      toast.success("Plano aprovado. Task criada no Kanban.");
      router.push("/planos-acao");
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await fetch(`/api/action-plans/${planId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      setShowRejectModal(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Falha ao rejeitar.");
        return;
      }
      toast.success("Plano rejeitado.");
      router.push("/planos-acao");
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* ─── Top bar ─── */}
      <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/planos-acao"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Icon name="arrow_back" size={14} />
            Planos
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`gap-1 ${risk.cls}`}>
                <Icon name={riskLevel === "RED" ? "error" : "warning"} size={11} />
                {risk.label}
              </Badge>
              <Badge className={`gap-1 ${stat.cls}`}>
                <Icon name={stat.icon} size={11} />
                {stat.label}
              </Badge>
              {recommendation.nr1_compliance && (
                <Badge variant="outline" className="gap-1">
                  <Icon name="gavel" size={11} />
                  NR-1
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{dimensionName}</span>
              {surveyTitle && ` · ${surveyTitle}`}
              {timeframe && ` · ${timeframe}`}
            </p>
          </div>

          {/* Ações (sticky, sempre visíveis) */}
          {canManage && status === "PENDING_REVIEW" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={isPending}
              >
                <Icon name="close" size={14} />
                Rejeitar
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isPending}
                className="shadow-sm shadow-primary/20"
              >
                <Icon name="check" size={14} />
                {isPending ? "..." : "Aprovar"}
              </Button>
            </div>
          )}
          {status === "APPROVED" && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Icon name="play_circle" size={12} />
              Tarefa no Kanban
            </Badge>
          )}
          {status === "COMPLETED" && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="check_circle" size={12} />
              Plano Concluído
            </Badge>
          )}
        </div>

        {/* Tabs mobile (some em lg) */}
        <div className="flex gap-1 border-t border-border bg-muted/40 px-4 py-2 lg:hidden">
          <button
            onClick={() => setTab("plano")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              tab === "plano" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            📋 Plano
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              tab === "chat" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            💬 Discutir com IA
          </button>
        </div>
      </div>

      {/* ─── Split view ─── */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Plano */}
        <div
          className={`${
            tab === "plano" ? "flex" : "hidden"
          } min-h-0 flex-1 flex-col overflow-y-auto bg-muted/20 px-4 py-6 sm:px-6 lg:flex lg:basis-[65%] space-y-6`}
        >
          {status === "COMPLETED" && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-55/50 dark:bg-emerald-950/20 p-4 space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <Icon name="verified" size={18} />
                  <span>Avaliação de Eficácia e Aprendizado</span>
                </div>
                <Button
                  onClick={handleSaveEfficacy}
                  disabled={isPending}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-4 rounded-lg"
                >
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Como foi a ação?</label>
                  <select
                    value={outcome || ""}
                    onChange={(e) => setOutcome(e.target.value as any)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    <option value="successful">🟢 Funcionou bem (Alta adesão/impacto)</option>
                    <option value="partial">🟡 Resultado parcial (Adesão média/baixa)</option>
                    <option value="unsuccessful">🔴 Não funcionou (Nenhum impacto)</option>
                    <option value="in_progress">🔵 Ainda em andamento</option>
                  </select>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-muted-foreground">
                    A IA usará o feedback e as notas abaixo como referência para sugerir planos futuros.
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Notas de Aprendizado</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva por que funcionou ou não, detalhes sobre adesão, sugestões para a próxima vez..."
                  className="w-full rounded-md border border-input bg-card p-3 text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}

          <PlanV2
            recommendation={recommendation}
            targetDepartment={targetDepartment}
            timeframe={timeframe}
            references={references}
          />
        </div>

        {/* Chat */}
        <div
          className={`${
            tab === "chat" ? "flex" : "hidden"
          } min-h-0 flex-1 flex-col border-l border-border bg-card lg:flex lg:basis-[35%] lg:min-w-[360px]`}
        >
          <PlanChatPanel planId={planId} />
        </div>
      </div>

      {/* ─── Modal de rejeição ─── */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black">Rejeitar plano</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conte por que esse plano não cabe agora. A IA aprende com isso para
              não repetir essa linha no próximo ciclo.
            </p>
            <textarea
              className="mt-4 w-full rounded-md border border-input bg-card p-2 text-sm"
              rows={4}
              placeholder='ex: "ultrapassou o orçamento", "não terceirizamos esse tipo"'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReject} disabled={isPending}>
                {isPending ? "Rejeitando..." : "Confirmar rejeição"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
