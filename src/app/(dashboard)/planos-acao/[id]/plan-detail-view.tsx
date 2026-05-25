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
  APPROVED: { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Aprovado", icon: "check_circle" },
  REJECTED: { cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Rejeitado", icon: "cancel" },
};

interface Props {
  planId: string;
  riskLevel: "RED" | "YELLOW";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  dimensionName: string;
  surveyTitle: string;
  timeframe: string | null;
  targetDepartment: string | null;
  recommendation: AIRecommendation;
  canManage: boolean;
  references: KbReferenceWithRelevance[];
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
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("plano");
  const [isPending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const risk = RISK[riskLevel];
  const stat = STATUS[status];

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
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="check_circle" size={12} />
              Tarefa no Kanban
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
          } min-h-0 flex-1 flex-col overflow-y-auto bg-muted/20 px-4 py-6 sm:px-6 lg:flex lg:basis-[65%]`}
        >
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
