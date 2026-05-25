"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { PlanV2 } from "@/components/plan/plan-v2";
import { PlanChatDrawer } from "@/components/plan/plan-chat-drawer";
import { toast } from "sonner";
import type { PlanView } from "./types";

const RISK_PILL = {
  RED: {
    cls: "bg-gradient-to-r from-red-500 to-red-600 text-white",
    label: "Risco",
  },
  YELLOW: {
    cls: "bg-gradient-to-r from-amber-400 to-amber-500 text-white",
    label: "Intermédio",
  },
};

const STATUS_PILL: Record<string, { cls: string; label: string; icon: string }> =
  {
    PENDING_REVIEW: {
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      label: "Pendente",
      icon: "schedule",
    },
    APPROVED: {
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      label: "Aprovado",
      icon: "check_circle",
    },
    REJECTED: {
      cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      label: "Rejeitado",
      icon: "cancel",
    },
    AI_GENERATION_FAILED: {
      cls: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400",
      label: "Falha geração",
      icon: "error",
    },
  };

export function PlanDetailSheet({
  plan,
  canManage,
  isLoading,
  onClose,
  onReview,
}: {
  plan: PlanView;
  canManage: boolean;
  isLoading: boolean;
  onClose: () => void;
  onReview: (decision: "APPROVED" | "REJECTED") => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const risk = RISK_PILL[plan.riskLevel] ?? RISK_PILL.YELLOW;
  const status = STATUS_PILL[plan.status] ?? STATUS_PILL.PENDING_REVIEW;

  async function handleApprove() {
    const res = await fetch(`/api/action-plans/${plan.id}/approve`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Falha ao aprovar.");
      return;
    }
    toast.success("Plano aprovado. Task criada no Kanban.");
    onReview("APPROVED");
  }

  async function handleReject() {
    setRejecting(true);
    const res = await fetch(`/api/action-plans/${plan.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: rejectReason || undefined }),
    });
    setRejecting(false);
    setShowRejectModal(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Falha ao rejeitar.");
      return;
    }
    toast.success("Plano rejeitado.");
    onReview("REJECTED");
  }

  return (
    <>
      <Sheet open onOpenChange={() => onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l p-0 sm:max-w-3xl lg:max-w-4xl">
          {/* Header */}
          <div
            className={`shrink-0 px-6 pb-4 pt-6 ${
              plan.riskLevel === "RED"
                ? "bg-gradient-to-br from-red-50 to-card dark:from-red-950/30 dark:to-card"
                : "bg-gradient-to-br from-amber-50 to-card dark:from-amber-950/30 dark:to-card"
            }`}
          >
            <SheetHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold shadow-sm ${risk.cls}`}
                >
                  <Icon
                    name={plan.riskLevel === "RED" ? "error" : "warning"}
                    size={13}
                  />
                  {risk.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${status.cls}`}
                >
                  <Icon name={status.icon} size={13} />
                  {status.label}
                </span>
                {plan.recommendation.nr1_compliance && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                    <Icon name="gavel" size={13} />
                    NR-1
                  </span>
                )}
              </div>

              <SheetTitle className="text-base font-bold leading-tight">
                {plan.recommendation.title}
              </SheetTitle>

              <p className="text-xs text-muted-foreground">
                Dimensão: <span className="font-semibold text-foreground">{plan.dimensionName}</span>
                {plan.timeframe && (
                  <>
                    {" · "}Janela: <span className="font-semibold text-foreground">{plan.timeframe}</span>
                  </>
                )}
              </p>
            </SheetHeader>
          </div>

          {/* Conteúdo — Matriz 5W2H */}
          <div className="flex-1 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6">
            <PlanV2
              recommendation={plan.recommendation}
              timeframe={plan.timeframe}
            />
          </div>

          {/* Footer */}
          {canManage && plan.status === "PENDING_REVIEW" && (
            <SheetFooter className="shrink-0 border-t bg-card px-6 py-4">
              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  disabled={isLoading}
                  onClick={() => setShowRejectModal(true)}
                >
                  <Icon name="close" size={16} />
                  Rejeitar
                </Button>
                <Button
                  className="flex-1 gap-1.5 shadow-md shadow-primary/20"
                  disabled={isLoading}
                  onClick={handleApprove}
                >
                  <Icon name="check" size={16} />
                  {isLoading ? "Processando..." : "Aprovar e criar tarefa"}
                </Button>
              </div>
            </SheetFooter>
          )}

          {plan.status === "APPROVED" && (
            <div className="shrink-0 border-t bg-emerald-50/50 px-6 py-3 text-center dark:bg-emerald-950/20">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <Icon name="check_circle" size={16} />
                Aprovado — tarefa criada no Kanban
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de rejeição */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black">Rejeitar plano</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conte por que esse plano não cabe agora. A IA aprende com isso.
            </p>
            <textarea
              className="mt-4 w-full rounded-md border border-input bg-card p-2 text-sm"
              rows={4}
              placeholder='ex: "ultrapassou o orçamento", "não terceirizamos esse tipo de serviço"'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReject} disabled={rejecting}>
                {rejecting ? "Rejeitando..." : "Confirmar rejeição"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat contextual flutuante (botão + drawer) */}
      <PlanChatDrawer planId={plan.id} />
    </>
  );
}
