"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function NovaDenunciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [accessSent, setAccessSent] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    companyId: "",
    occurrenceType: "Assédio",
    description: "",
    isAnonymous: true,
  });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    }

    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setVerifiedEmail(user?.email ?? null);
      setCheckingAccess(false);
    }

    const companyIdFromUrl = new URLSearchParams(window.location.search).get("companyId");
    if (companyIdFromUrl) {
      setFormData((current) => ({ ...current, companyId: companyIdFromUrl }));
    }

    fetchCompanies();
    checkSession();
  }, []);

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.companyId) {
      toast.error("Selecione a empresa para validar seu vínculo.");
      return;
    }

    setRequestingAccess(true);
    try {
      const res = await fetch("/api/reports/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accessEmail, companyId: formData.companyId }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Não foi possível validar o colaborador.");
        return;
      }

      setAccessSent(true);
      toast.success("Link de acesso enviado para seu email.");
    } catch {
      toast.error("Erro de conexão ao solicitar acesso.");
    } finally {
      setRequestingAccess(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.companyId) {
      toast.error("Por favor, selecione a empresa.");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("companyId", formData.companyId);
      data.append("occurrenceType", formData.occurrenceType);
      data.append("description", formData.description);
      data.append("isAnonymous", String(formData.isAnonymous));
      files.forEach((file) => data.append("files", file));

      const res = await fetch("/api/reports/submit", {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      if (result.protocol) {
        setProtocol(result.protocol);
        setSubmitted(true);
        toast.success("Denúncia enviada com sucesso!");
      } else {
        toast.error(result.error || "Erro ao enviar denúncia");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-12 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <Icon name="check_circle" size={40} filled />
          </div>
          <h2 className="mb-2 text-2xl font-black">Denúncia Enviada</h2>
          <p className="mb-8 text-muted-foreground">
            Sua denúncia foi registrada com sucesso. Guarde o protocolo abaixo para acompanhar o andamento.
          </p>

          <div className="mb-8 rounded-2xl bg-muted p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Protocolo</p>
            <p className="text-3xl font-black tracking-tighter text-primary">{protocol}</p>
          </div>

          <Button
            className="h-12 w-full rounded-xl text-base font-bold"
            onClick={() => router.push("/denuncia")}
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Icon name="refresh" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!verifiedEmail) {
    return (
      <div className="flex min-h-screen flex-col bg-background p-6">
        <div className="mx-auto w-full max-w-2xl space-y-8 py-12">
          <div className="space-y-2">
            <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => router.back()}>
              <Icon name="arrow_back" size={20} className="mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-black tracking-tight">Validar vínculo</h1>
            <p className="text-muted-foreground">
              A validação serve apenas para confirmar que você pertence à empresa selecionada. O sistema não salva seu email, ID de colaborador ou identidade junto ao relato.
            </p>
          </div>

          <form onSubmit={handleRequestAccess} className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <select
                id="company"
                className="h-10 w-full rounded-lg border border-input bg-background px-3"
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                required
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-email">Email cadastrado como colaborador</Label>
              <Input
                id="access-email"
                type="email"
                placeholder="seu@email.com"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {accessSent && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">
                Link enviado. Abra o email neste mesmo navegador para liberar o formulário de denúncia.
              </div>
            )}

            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
              <div className="flex gap-3">
                <Icon name="shield" size={20} className="shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-primary/80">
                  O link de validação funciona como uma barreira de entrada: ele comprova o vínculo com a empresa, mas a denúncia é registrada sem email, employee_id, auth_id ou qualquer identificador pessoal.
                </p>
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl font-bold" disabled={requestingAccess}>
              {requestingAccess ? "Enviando..." : "Enviar link de validação"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-6">
      <div className="mx-auto w-full max-w-2xl space-y-8 py-12">
        <div className="space-y-2">
          <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => router.back()}>
            <Icon name="arrow_back" size={20} className="mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-black tracking-tight">Nova Denúncia</h1>
          <p className="text-muted-foreground">
            Acesso validado para {verifiedEmail}. Esse email não será salvo junto ao relato.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa alvo da denúncia</Label>
              <select
                id="company"
                className="h-10 w-full rounded-lg border border-input bg-background px-3"
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                required
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Ocorrência</Label>
              <select
                id="type"
                className="h-10 w-full rounded-lg border border-input bg-background px-3"
                value={formData.occurrenceType}
                onChange={(e) => setFormData({ ...formData, occurrenceType: e.target.value })}
              >
                <option value="Assédio">Assédio</option>
                <option value="Discriminação">Discriminação</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Relato dos Fatos</Label>
              <textarea
                id="description"
                placeholder="Descreva o ocorrido com o máximo de detalhes..."
                className="flex min-h-[150px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Anexos (Opcional)</Label>
              <Input
                id="files"
                type="file"
                multiple
                className="cursor-pointer rounded-lg"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <p className="text-[10px] text-muted-foreground">
                Formatos aceitos: Imagens, PDF, Documentos. Máx 5MB por arquivo.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="anonymous"
                checked={formData.isAnonymous}
                onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked as boolean })}
              />
              <Label htmlFor="anonymous" className="cursor-pointer text-sm font-medium leading-none">
                Desejo permanecer anônimo
              </Label>
            </div>
          </div>

          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex gap-3">
              <Icon name="info" size={20} className="shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-primary/80">
                <strong>Confidencialidade Garantida:</strong> o sistema validou seu vínculo, mas não salva seu email ou ID de colaborador na denúncia.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-bold"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar Denúncia"}
          </Button>
        </form>
      </div>
    </div>
  );
}
