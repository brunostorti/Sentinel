"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AcompanharDenunciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [report, setReport] = useState<any>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!protocol) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/reports/track?protocol=${encodeURIComponent(protocol)}`);
      if (!res.ok) {
        toast.error("Protocolo não encontrado.");
        setReport(null);
      } else {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      toast.error("Erro ao buscar protocolo.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PENDING":
        return { label: "Em Análise", color: "text-amber-500", bg: "bg-amber-500/10", icon: "schedule" };
      case "RESOLVED":
        return { label: "Finalizada", color: "text-green-500", bg: "bg-green-500/10", icon: "check_circle" };
      default:
        return { label: status, color: "text-blue-500", bg: "bg-blue-500/10", icon: "info" };
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background p-6">
      <div className="mx-auto w-full max-w-lg space-y-8 py-12">
        <div className="space-y-2">
          <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => router.push("/denuncia")}>
            <Icon name="arrow_back" size={20} className="mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-black tracking-tight">Acompanhar Denúncia</h1>
          <p className="text-muted-foreground">
            Insira o seu código de protocolo para ver o status atual.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="protocol">Código de Protocolo</Label>
            <div className="flex gap-2">
              <Input
                id="protocol"
                placeholder="PROT-2026-XXXXXX"
                className="h-12 rounded-xl text-lg font-mono uppercase"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value.toUpperCase())}
                required
              />
              <Button type="submit" className="h-12 px-6 rounded-xl font-bold" disabled={loading}>
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </form>

        {report && (
          <div className="animate-fade-in space-y-6 rounded-3xl border border-border bg-card p-8 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status Atual</p>
                <div className={cn("flex items-center gap-2 font-black text-xl", getStatusDisplay(report.status).color)}>
                  <Icon name={getStatusDisplay(report.status).icon} size={24} filled />
                  {getStatusDisplay(report.status).label}
                </div>
              </div>
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", getStatusDisplay(report.status).bg)}>
                <Icon name={getStatusDisplay(report.status).icon} size={28} className={getStatusDisplay(report.status).color} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo</p>
                <p className="font-bold">{report.occurrence_type}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data de Envio</p>
                <p className="font-bold">{new Date(report.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
              Para garantir a sua segurança, detalhes do relato não são exibidos nesta página de acompanhamento público. 
              Caso tenha novas informações, realize um novo envio citando este protocolo.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
