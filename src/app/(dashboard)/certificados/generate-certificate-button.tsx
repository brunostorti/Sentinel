"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";

interface GenerateCertificateButtonProps {
  cycleId: string;
  cycleTitle: string;
  disabled?: boolean;
}

export function GenerateCertificateButton({
  cycleId,
  cycleTitle,
  disabled,
}: GenerateCertificateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const toastId = toast.loading("Gerando certificado...", {
      description: "Montando o PDF com as evidências deste ciclo.",
    });
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao emitir certificado.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${cycleTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Certificado emitido.", { id: toastId, duration: 4000 });
      router.refresh();
    } catch (err: unknown) {
      toast.error("Falha ao gerar certificado", {
        id: toastId,
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        duration: 10000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={disabled || loading} className="shrink-0 gap-1.5">
      {loading ? (
        <Icon name="progress_activity" size={16} className="animate-spin" />
      ) : (
        <Icon name="verified" size={16} />
      )}
      {loading ? "Gerando..." : "Emitir certificado"}
    </Button>
  );
}
