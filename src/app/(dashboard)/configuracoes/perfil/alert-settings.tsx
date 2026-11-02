"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { ALERT_THRESHOLD_RANGE, ALERT_WINDOW_RANGE } from "@/lib/reports/alerts";
import { saveAlertSettings } from "./alert-actions";

export function AlertSettings({
  initialThreshold,
  initialWindowDays,
}: {
  initialThreshold: number;
  initialWindowDays: number;
}) {
  const [threshold, setThreshold] = useState(String(initialThreshold));
  const [windowDays, setWindowDays] = useState(String(initialWindowDays));
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveAlertSettings(Number(threshold), Number(windowDays));
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("settings" in result && result.settings) {
        setThreshold(String(result.settings.threshold));
        setWindowDays(String(result.settings.windowDays));
      }
      toast.success("Alerta atualizado.");
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
          <Icon name="notification_important" size={20} className="text-amber-700 dark:text-amber-300" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold">Alerta por setor</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Avisa o RH quando um setor acumula denúncias do mesmo tipo, ou afastamentos, dentro de
            um período. Só vale para setores com 5 ou mais pessoas.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="alert-threshold" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Casos
          </Label>
          <Input
            id="alert-threshold"
            type="number"
            min={ALERT_THRESHOLD_RANGE.min}
            max={ALERT_THRESHOLD_RANGE.max}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-24 rounded-lg"
          />
        </div>
        <span className="pb-2 text-sm text-muted-foreground">em</span>
        <div className="space-y-1.5">
          <Label htmlFor="alert-window" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Dias
          </Label>
          <Input
            id="alert-window"
            type="number"
            min={ALERT_WINDOW_RANGE.min}
            max={ALERT_WINDOW_RANGE.max}
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
            className="w-24 rounded-lg"
          />
        </div>
        <Button onClick={save} disabled={pending} className="rounded-lg">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Padrão: 3 casos em 90 dias. Faixa aceita: {ALERT_THRESHOLD_RANGE.min} a {ALERT_THRESHOLD_RANGE.max} casos,
        {" "}{ALERT_WINDOW_RANGE.min} a {ALERT_WINDOW_RANGE.max} dias.
      </p>
    </section>
  );
}
