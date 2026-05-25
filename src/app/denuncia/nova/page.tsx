"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function NovaDenunciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      const supabase = createClient();
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .gt("employee_count", 20);
      
      if (data) setCompanies(data);
    }
    fetchCompanies();
  }, []);

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
    } catch (error) {
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
            className="w-full h-12 rounded-xl text-base font-bold"
            onClick={() => router.push("/denuncia")}
          >
            Voltar ao Início
          </Button>
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
            Preencha os campos abaixo com o máximo de detalhes possível.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa alvo da denúncia</Label>
              <select
                id="company"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background"
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
                className="w-full h-10 px-3 rounded-lg border border-input bg-background"
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
              <Textarea
                id="description"
                placeholder="Descreva o ocorrido com o máximo de detalhes..."
                className="min-h-[150px] rounded-xl"
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
                className="rounded-lg cursor-pointer"
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
              <Label htmlFor="anonymous" className="text-sm font-medium leading-none cursor-pointer">
                Desejo permanecer anônimo
              </Label>
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
            <div className="flex gap-3">
              <Icon name="info" size={20} className="text-primary shrink-0" />
              <p className="text-xs text-primary/80 leading-relaxed">
                <strong>Confidencialidade Garantida:</strong> Todas as informações enviadas são criptografadas e tratadas 
                com sigilo absoluto. Se optar pelo anonimato, seus dados de identificação não serão armazenados.
              </p>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl font-bold text-base"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar Denúncia"}
          </Button>
        </form>
      </div>
    </div>
  );
}
