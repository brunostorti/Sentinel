"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmAuthenticatorSetup, startAuthenticatorSetup } from "@/lib/auth/authenticator-actions";

interface Setup {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function AuthenticatorSetup() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function start() {
    setError("");
    setLoading(true);
    const result = await startAuthenticatorSetup();
    setLoading(false);
    if ("error" in result && result.error) return setError(result.error);
    if ("factorId" in result) setSetup(result as Setup);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setError("");
    setLoading(true);
    const result = await confirmAuthenticatorSetup(setup.factorId, code);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        <Button type="button" onClick={start} disabled={loading}>
          {loading ? "Gerando..." : "Configurar app autenticador"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Abra o Google Authenticator (ou Microsoft Authenticator, Authy).</li>
        <li>Escaneie o QR code abaixo, ou digite a chave manualmente.</li>
        <li>Digite o código de 6 dígitos que o app mostrar.</li>
      </ol>
      {/* QR em data URI gerado pelo Supabase: next/image não ajuda aqui. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={setup.qrCode} alt="QR code do app autenticador" className="h-56 w-56 rounded-lg border border-border bg-white p-3" />
      <p className="break-all text-xs text-muted-foreground">
        Chave manual: <span className="font-mono font-semibold text-foreground">{setup.secret}</span>
      </p>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="setup-code">Código do app</Label>
        <Input
          id="setup-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
          required
        />
      </div>
      <Button type="submit" disabled={loading || code.replace(/\s/g, "").length < 6}>
        {loading ? "Confirmando..." : "Confirmar e ativar"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
