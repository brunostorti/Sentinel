"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { activateSurvey, closeSurvey, sendReminders } from "./actions";

interface SurveyActionsProps {
  surveyId: string;
  status: string;
}

export function SurveyActions({ surveyId, status }: SurveyActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleActivate() {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    const result = await activateSurvey(surveyId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function handleClose() {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    const result = await closeSurvey(surveyId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function handleReminder() {
    setReminderLoading(true);
    setError("");
    setSuccessMsg("");
    const result = await sendReminders(surveyId);
    setReminderLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.message) {
      setSuccessMsg(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button
            size="sm"
            onClick={handleActivate}
            disabled={loading}
            className="gap-1"
          >
            <Icon name="play_arrow" size={16} />
            {loading ? "Ativando..." : "Ativar Pesquisa"}
          </Button>
        )}
        {status === "ACTIVE" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReminder}
              disabled={reminderLoading}
              className="gap-1"
            >
              <Icon name="mail" size={16} />
              {reminderLoading ? "Enviando..." : "Enviar Lembretes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="gap-1"
            >
              <Icon name="stop" size={16} />
              {loading ? "Encerrando..." : "Encerrar Pesquisa"}
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {successMsg && <p className="text-xs text-green-600 dark:text-green-400">{successMsg}</p>}
    </div>
  );
}
