"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="relative left-1/2 w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 overflow-hidden rounded-3xl border border-primary/10 bg-card shadow-[0_24px_80px_-28px_rgba(15,42,90,0.28)] sm:w-[calc(100vw-3rem)]">
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        slides={tutorialSlides}
      />

      <div className="grid lg:min-h-[650px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative order-2 flex overflow-hidden bg-[linear-gradient(145deg,#0d3f9e_0%,#155ec9_55%,#2577e5_100%)] p-6 text-white lg:order-1 lg:p-12">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute right-12 top-24 h-24 w-24 rounded-full bg-sky-300/10 blur-2xl" />

          <div className="relative z-10 flex w-full flex-col justify-between gap-6 lg:gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-50 backdrop-blur-sm">
                <Icon name="shield" size={16} filled />
                Ambiente seguro
              </div>

              <h1 className="mt-5 max-w-xl text-xl font-black leading-tight tracking-tight lg:mt-8 lg:text-[2.75rem]">
                Cuidar das pessoas começa por escutar com confiança.
              </h1>
              <p className="mt-3 hidden max-w-lg text-sm leading-6 text-blue-50/85 lg:block lg:text-base">
                Acesse suas pesquisas de bem-estar com privacidade, segurança e
                transparência em cada etapa.
              </p>
            </div>

            {mode === "employee" && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:gap-3 xl:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm lg:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon name="lock" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">100% Anônimo</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-50/80">
                      Suas respostas não podem ser rastreadas.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm lg:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon name="verified" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Conformidade Total</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-50/80">
                      Lei 14.831/2024 e NR-1.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="hidden items-center gap-2 text-xs text-blue-50/75 lg:flex">
              <Icon name="verified_user" size={16} />
              Plataforma protegida para saúde psicossocial
            </p>
          </div>
        </section>

        <section className="relative order-1 flex items-center bg-card p-6 sm:p-10 lg:order-2 lg:p-12">
          <div className="w-full">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                Sentinel
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Bem-vindo
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Escolha seu perfil para acessar o ambiente adequado.
              </p>
            </div>

            <div className="flex rounded-xl border border-border bg-muted/70 p-1">
              <button
                onClick={() => switchMode("employee")}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                  mode === "employee"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Colaborador
              </button>
              <button
                onClick={() => switchMode("admin")}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                  mode === "admin"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Administração
              </button>
            </div>

            <Card className="mt-5 gap-5 border border-border/70 bg-background/45 py-6 shadow-none ring-0">
              <CardHeader className="px-5 text-left">
                <CardTitle className="text-xl font-black tracking-tight">
                  {mode === "employee" ? "Acesso do Colaborador" : "Acesso Administrativo"}
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  {mode === "employee"
                    ? step === "email"
                      ? "Insira o email cadastrado pela sua empresa."
                      : "Verifique sua caixa de entrada."
                    : "Entre com seu email e senha."}
                </p>
              </CardHeader>
              <CardContent className="px-5">
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
                        className="h-11 bg-card px-3"
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="h-11 w-full" disabled={loading}>
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
                      <p className="text-sm font-medium">Link enviado para</p>
                      <p className="text-sm font-semibold text-primary">{email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clique no link que enviamos para acessar suas pesquisas.
                      Verifique também a pasta de spam.
                    </p>
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Usar outro email
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon name="help" size={14} />
                Dúvidas no primeiro acesso?
              </button>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
