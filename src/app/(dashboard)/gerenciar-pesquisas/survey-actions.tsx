"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { activateSurvey, closeSurvey } from "./actions";
import { ReminderButton } from "./reminder-button";

interface SurveyActionsProps {
  surveyId: string;
  status: string;
}

export function SurveyActions({ surveyId, status }: SurveyActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleActivate() {
    setLoading(true);
    setError("");
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
    const result = await closeSurvey(surveyId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
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
            <ReminderButton surveyId={surveyId} size="sm" />
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
    </div>
  );
}
