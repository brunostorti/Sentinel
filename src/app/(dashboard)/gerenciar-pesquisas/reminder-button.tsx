"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/icon";
import { getReminderMessage, sendSurveyReminders } from "./actions";
import { showAccessLinksResult } from "./access-links-toast";

interface ReminderButtonProps {
  surveyId: string;
  size?: "sm" | "default";
  iconSize?: number;
  disabled?: boolean;
}

export function ReminderButton({
  surveyId,
  size,
  iconSize = 16,
  disabled,
}: ReminderButtonProps) {
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  // 1. Disparo de e-mails direto para colaboradores pendentes
  async function handleSendEmail() {
    setSendingEmail(true);
    const result = await sendSurveyReminders(surveyId);
    setSendingEmail(false);

    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }

    showAccessLinksResult(result, "Lembretes enviados com sucesso!");
  }

  // 2. Cópia da mensagem para canais internos (chat/WhatsApp/e-mail corporativo)
  async function handleCopy() {
    setLoadingCopy(true);
    const result = await getReminderMessage(surveyId);
    setLoadingCopy(false);

    if (result.error || !result.message) {
      toast.error(result.error ?? "Não foi possível montar o lembrete.");
      return;
    }

    const pendingNote = `${result.pending} colaborador(es) ainda não responderam.`;
    try {
      await navigator.clipboard.writeText(result.message);
      toast.success("Mensagem copiada", {
        description: `Cole no chat interno ou e-mail da empresa. ${pendingNote}`,
      });
    } catch {
      setFallbackText(result.message);
    }
  }

  const isBusy = disabled || loadingCopy || sendingEmail;

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size={size}
        onClick={handleSendEmail}
        disabled={isBusy}
        className="gap-1.5 font-semibold"
      >
        <Icon name="mail" size={iconSize} />
        {sendingEmail ? "Disparando..." : "Enviar lembrete por e-mail"}
      </Button>

      <Button
        size={size}
        variant="outline"
        onClick={handleCopy}
        disabled={isBusy}
        className="gap-1.5 text-xs"
        title="Copiar texto para colar em canais internos (Teams, WhatsApp, Slack)"
      >
        <Icon name="content_copy" size={iconSize} />
        {loadingCopy ? "Copiando..." : "Copiar texto"}
      </Button>

      <Dialog
        open={fallbackText !== null}
        onOpenChange={(open) => !open && setFallbackText(null)}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Mensagem de lembrete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O navegador não permitiu copiar automaticamente. Selecione o texto
            abaixo, copie e envie pelo e-mail ou chat interno da empresa.
          </p>
          <textarea
            readOnly
            className="h-56 w-full resize-none rounded-lg border bg-muted/40 p-3 text-sm focus:outline-none"
            value={fallbackText ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
