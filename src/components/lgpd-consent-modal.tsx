"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

/**
 * Modal de consentimento LGPD. Bloqueia o app no primeiro acesso até o
 * usuário aceitar. Auditável: registra timestamp + versão na tabela users.
 */
export function LgpdConsentModal() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/account/lgpd-status")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && !d.consented && !d.isParticipant) {
          setOpen(true);
        }
      })
      .catch(() => {
        /* fail silently — modal não aparece, app segue */
      });
  }, []);

  function handleAccept() {
    if (!checked) {
      toast.error("Marque que você leu e concorda.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/account/lgpd-consent", { method: "POST" });
      if (!res.ok) {
        toast.error("Falha ao registrar consentimento. Tente recarregar a página.");
        return;
      }
      setOpen(false);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🔒
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Consentimento de uso de dados
              </h2>
              <p className="text-xs text-muted-foreground">
                Lei Geral de Proteção de Dados (Lei 13.709/2018)
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 text-sm leading-relaxed">
          <p>
            Para usar o Sentinel, precisamos do seu consentimento explícito
            para tratar seus dados pessoais conforme descrito a seguir.
          </p>

          <h3 className="mt-4 font-bold">O que coletamos sobre você</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>Nome e e-mail (para autenticação e atribuição de ações)</li>
            <li>Função na plataforma (HR/ADMIN/MANAGER)</li>
            <li>Histórico de aprovações, decisões e interações com a IA</li>
            <li>Empresa à qual você está vinculado</li>
          </ul>

          <h3 className="mt-4 font-bold">O que NÃO coletamos</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>
              <strong>Respostas a pesquisas são anônimas:</strong> não armazenam
              email, IP ou ID de sessão. Não é possível ligá-las a você.
            </li>
            <li>Dados de saúde individual</li>
            <li>Dados sensíveis (gênero, raça, religião) sem que você forneça</li>
          </ul>

          <h3 className="mt-4 font-bold">Seus direitos (Art. 18 LGPD)</h3>
          <p className="mt-2 text-muted-foreground">
            A qualquer momento você pode acessar, retificar, exportar ou
            solicitar a exclusão dos seus dados em{" "}
            <Link
              href="/conta/dados"
              className="text-primary underline"
              onClick={() => setOpen(false)}
            >
              Minha conta &gt; Meus dados
            </Link>
            .
          </p>

          <h3 className="mt-4 font-bold">Bases legais</h3>
          <p className="mt-2 text-muted-foreground">
            Tratamos seus dados com base em: <strong>seu consentimento</strong>{" "}
            (este formulário), <strong>cumprimento de obrigação legal</strong>{" "}
            (NR-1 e Lei 14.831/2024) e{" "}
            <strong>legítimo interesse organizacional</strong> (dados agregados
            de saúde ocupacional).
          </p>

          <h3 className="mt-4 font-bold">Compartilhamento com terceiros</h3>
          <p className="mt-2 text-muted-foreground">
            Hospedagem em Supabase (PostgreSQL no Brasil, AES-256 em repouso) e
            Vercel. Geração de IA via Anthropic Claude (sem envio de PII
            direta). Todos com cláusulas de proteção de dados.
          </p>

          <p className="mt-5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Política completa em{" "}
            <Link
              href="/sobre/privacidade"
              className="text-primary underline"
              target="_blank"
            >
              /sobre/privacidade
            </Link>{" "}
            · Encarregado (DPO):{" "}
            <a href="mailto:dpo@sentinel.local" className="text-primary underline">
              dpo@sentinel.local
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={checked}
              onCheckedChange={(v: boolean | "indeterminate") =>
                setChecked(v === true)
              }
              className="mt-0.5"
            />
            <span>
              Li e concordo com o tratamento dos meus dados conforme descrito
              acima e na{" "}
              <Link
                href="/sobre/privacidade"
                className="text-primary underline"
                target="_blank"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/api/auth/signout";
              }}
            >
              Não concordo — sair
            </Button>
            <Button onClick={handleAccept} disabled={!checked || isPending}>
              {isPending ? "Registrando..." : "Concordo e continuo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
