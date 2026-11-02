import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMasterAdmin } from "@/lib/sentinel/server";
import { Icon } from "@/components/icon";
import { AuthenticatorSetup } from "./authenticator-setup";

export default async function SecurityPage() {
  const admin = await getMasterAdmin();
  if (!admin) redirect("/inicio");

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasAuthenticator = (factors?.totp?.length ?? 0) > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/empresas" className="text-xs font-semibold text-primary hover:underline">
          ← Painel Sentinel
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Segurança do acesso Master</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo login do Master pede um segundo fator. Você pode usar o código enviado por e-mail ou um app autenticador.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Icon name="mail" size={20} className="text-primary" />
          <h2 className="font-bold">Código por e-mail</h2>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">Ativo</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Enviado para o e-mail da conta a cada login.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Icon name="shield" size={20} className="text-primary" />
          <h2 className="font-bold">App autenticador</h2>
          {hasAuthenticator && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">Ativo</span>
          )}
        </div>
        <div className="mt-3">
          {hasAuthenticator ? (
            <p className="text-sm text-muted-foreground">
              Configurado. Na tela de verificação, escolha &quot;App autenticador&quot; para entrar sem esperar o e-mail.
            </p>
          ) : (
            <AuthenticatorSetup />
          )}
        </div>
      </div>
    </div>
  );
}
