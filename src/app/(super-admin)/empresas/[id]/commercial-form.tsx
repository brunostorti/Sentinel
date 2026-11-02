"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanyCommercial } from "../actions";

export function CommercialForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: { plan: string; senderName: string; replyToEmail: string };
}) {
  const [plan, setPlan] = useState(initial.plan);
  const [senderName, setSenderName] = useState(initial.senderName);
  const [replyToEmail, setReplyToEmail] = useState(initial.replyToEmail);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCompanyCommercial(companyId, { plan, senderName, replyToEmail });
      if (result.error) toast.error(result.error);
      else toast.success("Configuração salva.");
    });
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="plan">Plano</Label>
          <Input id="plan" list="plan-options-edit" value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={40} />
          <datalist id="plan-options-edit">
            <option value="Piloto" />
            <option value="Contratado" />
            <option value="Encerrado" />
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sender">Nome exibido nos e-mails</Label>
          <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={80} placeholder="RH Empresa via Sentinel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reply">E-mail de resposta</Label>
          <Input id="reply" type="email" value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} maxLength={200} placeholder="rh@empresa.com.br" />
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        O plano é só informativo, sem cobrança. Os e-mails de acesso ainda saem pelo remetente único do
        sistema; nome exibido e e-mail de resposta valem quando o envio passar a sair pelo nosso servidor de e-mail.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
