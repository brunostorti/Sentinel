"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { createCompany } from "./actions";

export function CreateCompanyButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [workRegime, setWorkRegime] = useState("");
  const [plan, setPlan] = useState("Piloto");
  const [senderName, setSenderName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createCompany({
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      industry: industry.trim() || null,
      employeeCount: employeeCount ? parseInt(employeeCount, 10) : null,
      workRegime: (workRegime as "presencial" | "remoto" | "hibrido") || null,
      plan,
      senderName,
      replyToEmail,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setName("");
    setCnpj("");
    setIndustry("");
    setEmployeeCount("");
    setWorkRegime("");
    setPlan("Piloto");
    setSenderName("");
    setReplyToEmail("");
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Icon name="add" size={18} />
        Nova Empresa
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Nova Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da empresa</Label>
              <Input
                id="name"
                placeholder="Ex: Empresa ABC Ltda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (opcional)</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Setor (opcional)</Label>
              <Input
                id="industry"
                placeholder="Ex: Tecnologia, Saúde, Educação"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Nº de funcionários (opcional)</Label>
              <Input
                id="employeeCount"
                type="number"
                min="1"
                placeholder="Ex: 150"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workRegime">Regime de trabalho (opcional)</Label>
              <select
                id="workRegime"
                value={workRegime}
                onChange={(e) => setWorkRegime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione...</option>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contrato e e-mails
              </p>
              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Input
                  id="plan"
                  list="plan-options"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  maxLength={40}
                />
                <datalist id="plan-options">
                  <option value="Piloto" />
                  <option value="Contratado" />
                  <option value="Encerrado" />
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderName">Nome exibido nos e-mails (opcional)</Label>
                <Input
                  id="senderName"
                  placeholder="Ex.: RH Osborne via Sentinel"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replyTo">E-mail de resposta (opcional)</Label>
                <Input
                  id="replyTo"
                  type="email"
                  placeholder="rh@empresa.com.br"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Criando..." : "Criar Empresa"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
