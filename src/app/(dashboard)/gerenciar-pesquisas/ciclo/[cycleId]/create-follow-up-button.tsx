"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { createFollowUpSurvey } from "../../actions";

/**
 * Cria a próxima reavaliação do ciclo.
 *
 * Quando a coleta mais recente ainda está aberta, mostra o motivo em vez de um
 * botão que falharia — a mesma regra é revalidada no servidor.
 */
export function CreateFollowUpButton({
  cycleId,
  canCreate,
  blockedReason,
}: {
  cycleId: string;
  canCreate: boolean;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!canCreate) {
    return (
      <span
        title={blockedReason}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground"
      >
        <Icon name="lock" size={14} />
        {blockedReason}
      </span>
    );
  }

  async function handleCreate() {
    setLoading(true);
    setError("");
    const result = await createFollowUpSurvey(cycleId);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.surveyId) {
      router.push(`/gerenciar-pesquisas/${result.surveyId}`);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleCreate} disabled={loading} className="gap-1.5 rounded-lg">
        <Icon name="add" size={16} />
        {loading ? "Criando..." : "Nova reavaliação"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
