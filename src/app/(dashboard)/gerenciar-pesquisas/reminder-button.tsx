"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/icon";
import { getReminderMessage } from "./actions";

/**
 * Copia a mensagem de lembrete para o RH enviar pelo e-mail ou chat da empresa.
 * Se o navegador bloquear a área de transferência, abre a mensagem para cópia manual.
 */
export function ReminderButton({
  surveyId,
  size,
  iconSize = 16,
  disabled,
}: {
  surveyId: string;
  size?: "sm" | "default";
  iconSize?: number;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    const result = await getReminderMessage(surveyId);
    setLoading(false);

    if (result.error || !result.message) {
      toast.error(result.error ?? "Não foi possível montar o lembrete.");
      return;
    }
    const pendingNote = `${result.pending} colaborador(es) ainda não responderam.`;
    try {
      await navigator.clipboard.writeText(result.message);
      toast.success("Mensagem copiada", {
        description: `Cole no e-mail ou no chat interno da empresa. ${pendingNote}`,
      });
    } catch {
      setFallbackText(result.message);
    }
  }

  return (
    <>
      <Button size={size} variant="outline" onClick={handleClick} disabled={disabled || loading} className="gap-1.5">
        <Icon name="content_copy" size={iconSize} />
        {loading ? "Preparando..." : "Copiar lembrete"}
      </Button>

      <Dialog open={fallbackText !== null} onOpenChange={(open) => !open && setFallbackText(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Mensagem de lembrete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O navegador não permitiu copiar automaticamente. Selecione o texto abaixo, copie e envie
            pelo e-mail ou chat interno da empresa.
          </p>
          <textarea
            readOnly
            className="h-56 w-full resize-none rounded-lg border bg-muted/40 p-3 text-sm"
            value={fallbackText ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
