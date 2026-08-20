"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
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
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao emitir certificado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={handleGenerate} disabled={disabled || loading} className="gap-1.5">
        {loading ? (
          <Icon name="progress_activity" size={16} className="animate-spin" />
        ) : (
          <Icon name="verified" size={16} />
        )}
        {loading ? "Gerando..." : "Emitir certificado"}
      </Button>
      {error && <p className="max-w-[260px] text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
