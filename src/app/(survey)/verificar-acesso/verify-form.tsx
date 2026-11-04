"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelSecondFactor, sendEmailCode, verifyAuthenticator, verifyEmailCode } from "./actions";

type Method = "email" | "app";

export function VerifyForm({
  email,
  home,
  setupHint,
  hasAuthenticator,
}: {
  email: string;
  home: string;
  setupHint: string;
  hasAuthenticator: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMethod(next: Method) {
    setMethod(next);
    setCode("");
    setError("");
    setInfo("");
  }

  async function send() {
    setError("");
    setInfo("");
    setLoading(true);
    const result = await sendEmailCode();
    setLoading(false);
    if (result.error) return setError(result.error);
    setSent(true);
    setInfo(`Código enviado para ${email}.`);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = method === "email" ? await verifyEmailCode(code) : await verifyAuthenticator(code);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace(home);
    router.refresh();
  }

  const tab = (active: boolean) =>
    `flex-1 rounded-md px-4 py-3 text-base font-semibold transition-colors ${
      active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <Card className="shadow-sm md:-mx-24">
      <CardHeader className="space-y-2 p-6 pb-2 sm:p-10 sm:pb-4">
        <CardTitle className="text-3xl font-black tracking-tight">Verificação em duas etapas</CardTitle>
        <p className="text-base text-muted-foreground">
          Confirme que é você para continuar. Isso é pedido em todo login administrativo.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-4 sm:p-10 sm:pt-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button type="button" className={tab(method === "email")} onClick={() => changeMethod("email")}>
            Código por e-mail
          </button>
          <button type="button" className={tab(method === "app")} onClick={() => changeMethod("app")}>
            App autenticador
          </button>
        </div>

        {method === "app" && !hasAuthenticator ? (
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-base text-muted-foreground">
            O app autenticador ainda não foi configurado. Entre agora com o código por e-mail e configure em
            &quot;{setupHint}&quot;. Nos próximos logins você poderá escolher o app.
          </p>
        ) : method === "email" && !sent ? (
          <Button type="button" className="h-14 w-full text-base" onClick={send} disabled={loading}>
            {loading ? "Enviando..." : `Enviar código para ${email}`}
          </Button>
        ) : (
          <form onSubmit={confirm} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-base">
                {method === "email" ? "Código recebido por e-mail" : "Código do app autenticador"}
              </Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
                required
                autoFocus
                className="h-16 bg-card px-3 text-center text-3xl font-bold tracking-[0.5em]"
              />
            </div>
            <Button type="submit" className="h-14 w-full text-base" disabled={loading || code.replace(/\s/g, "").length < 6}>
              {loading ? "Verificando..." : "Confirmar"}
            </Button>
            {method === "email" && (
              <button
                type="button"
                onClick={send}
                disabled={loading}
                className="w-full text-sm font-semibold text-primary hover:underline disabled:opacity-50"
              >
                Reenviar código
              </button>
            )}
          </form>
        )}

        {info && <p className="text-base text-emerald-600">{info}</p>}
        {error && <p className="text-base text-destructive">{error}</p>}

        <form action={cancelSecondFactor}>
          <button type="submit" className="w-full text-sm text-muted-foreground hover:underline">
            Cancelar e sair
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
