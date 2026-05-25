"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { sendMagicLink } from "./actions";
import { AdminLogin } from "./admin-login";
import { TutorialModal } from "@/components/tutorial-modal";

type LoginMode = "employee" | "admin";
type Step = "email" | "sent";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("employee");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await sendMagicLink(email);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStep("sent");
    setLoading(false);
  }

  function handleBackToEmail() {
    setStep("email");
    setError("");
  }

  function switchMode(newMode: LoginMode) {
    setMode(newMode);
    setError("");
    setStep("email");
  }

  const tutorialSlides = [
    {
      title: "Como acessar?",
      description: "Se você é um colaborador, insira seu email corporativo. Você receberá um link mágico na sua caixa de entrada.",
      icon: "mail",
    },
    {
      title: "Primeiro Acesso",
      description: "Ao clicar no link, você entrará automaticamente. Se for seu primeiro acesso, o sistema pedirá para criar uma senha.",
      icon: "key",
    },
    {
      title: "Anonimato Total",
      description: "Fique tranquilo: sua identidade nunca é vinculada às suas respostas nas pesquisas de bem-estar.",
      icon: "shield",
    },
  ];

  return (
    <div className="space-y-4">
      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
        slides={tutorialSlides} 
      />
      
      {/* Mode switcher */}
      <div className="flex rounded-lg border border-border bg-muted p-1">
        <button
          onClick={() => switchMode("employee")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "employee"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Colaborador
        </button>
        <button
          onClick={() => switchMode("admin")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "admin"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Administração
        </button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black tracking-tight">
            {mode === "employee" ? "Acesso do Colaborador" : "Acesso Administrativo"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "employee"
              ? step === "email"
                ? "Insira o email cadastrado pela sua empresa."
                : "Verifique sua caixa de entrada."
              : "Entre com seu email e senha."}
          </p>
        </CardHeader>
        <CardContent>
          {mode === "admin" ? (
            <AdminLogin />
          ) : step === "email" ? (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de acesso"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon name="mail" size={32} className="text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Link enviado para
                </p>
                <p className="text-sm font-semibold text-primary">
                  {email}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no link que enviamos para acessar suas pesquisas.
                Verifique também a pasta de spam.
              </p>
              <button
                type="button"
                onClick={handleBackToEmail}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Usar outro email
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <button
          onClick={() => setIsTutorialOpen(true)}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
        >
          <Icon name="help" size={14} />
          Dúvidas no primeiro acesso?
        </button>
      </div>

      {/* Info badges — only for employee mode */}
      {mode === "employee" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Icon name="lock" className="text-primary" />
            <div>
              <p className="text-sm font-medium">100% Anônimo</p>
              <p className="text-xs text-muted-foreground">
                Suas respostas não podem ser rastreadas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Icon name="verified" className="text-primary" />
            <div>
              <p className="text-sm font-medium">Conformidade Total</p>
              <p className="text-xs text-muted-foreground">
                Lei 14.831/2024 e NR-1.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
