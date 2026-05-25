import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { AccountDataActions } from "./actions-client";

export default async function MeusDadosPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("name, email, role, lgpd_consent_at, lgpd_consent_version, created_at")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!userData) redirect("/entrar");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Minha conta
        </p>
        <h1 className="text-3xl font-black tracking-tight">Meus dados</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Você pode exportar todos os seus dados ou solicitar a exclusão da
          sua conta a qualquer momento (Art. 18 LGPD).
        </p>
      </div>

      {/* Resumo da conta */}
      <Card className="p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Conta
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nome</dt>
            <dd className="text-sm font-medium">{userData.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">E-mail</dt>
            <dd className="text-sm font-medium">{userData.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Função</dt>
            <dd>
              <Badge variant="outline">{userData.role}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Conta criada em</dt>
            <dd className="text-sm font-medium">
              {new Date(userData.created_at).toLocaleDateString("pt-BR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Consentimento LGPD</dt>
            <dd className="text-sm font-medium">
              {userData.lgpd_consent_at ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  ✓{" "}
                  {new Date(userData.lgpd_consent_at).toLocaleDateString(
                    "pt-BR"
                  )}{" "}
                  (v. {userData.lgpd_consent_version ?? "—"})
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">
                  pendente
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Ações */}
      <AccountDataActions />

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/40 p-5 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <Icon
            name="info"
            size={20}
            className="mt-0.5 text-amber-700 dark:text-amber-400"
          />
          <div className="text-sm leading-relaxed">
            <p className="font-bold">
              Sobre a exclusão (Art. 16 e Art. 18, VI LGPD)
            </p>
            <p className="mt-1 text-muted-foreground">
              Quando você exclui sua conta:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Seu nome, e-mail e função são removidos.</li>
              <li>Mensagens individuais de chat são anonimizadas.</li>
              <li>
                <strong>Planos aprovados, ações concluídas e scores de
                pesquisa permanecem</strong> (registros de cumprimento de NR-1 e
                Lei 14.831 — base legal: obrigação legal).
              </li>
              <li>
                Pesquisas que você respondeu <strong>já são anônimas por
                design</strong> — não é possível identificá-las nem incluí-las
                no export.
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Cross-links */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href="/sobre/privacidade"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🔒 Política de privacidade
        </Link>
        <Link
          href="/sobre/seguranca"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          🛡 Segurança técnica
        </Link>
      </div>
    </div>
  );
}
