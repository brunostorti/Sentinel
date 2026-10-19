"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definePassword } from "./actions";

export default function DefinePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await definePassword(password, confirmation);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace(result.redirect ?? "/inicio");
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-black tracking-tight">Crie sua senha</CardTitle>
        <p className="text-sm text-muted-foreground">
          Nos próximos acessos, entre pela aba &quot;Administração&quot; com seu e-mail e esta senha.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoFocus
              className="h-11 bg-card px-3"
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirme a senha</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              minLength={8}
              required
              className="h-11 bg-card px-3"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar senha e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
