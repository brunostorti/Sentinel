import { Icon } from "@/components/icon";
import { AuthenticatorSetup } from "@/components/authenticator-setup";

/** Estado da verificação em duas etapas da conta e o cadastro do app autenticador. */
export function TwoFactorCard({ hasAuthenticator }: { hasAuthenticator: boolean }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-black tracking-tight">Verificação em duas etapas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo login administrativo pede um código, além da senha. Na tela de verificação você escolhe entre o
          código enviado por e-mail e o app autenticador.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Icon name="mail" size={18} className="text-primary" />
        <span className="font-semibold">Código por e-mail</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">Ativo</span>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm">
          <Icon name="shield" size={18} className="text-primary" />
          <span className="font-semibold">App autenticador</span>
          {hasAuthenticator && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">Ativo</span>
          )}
        </div>
        <div className="mt-3">
          {hasAuthenticator ? (
            <p className="text-sm text-muted-foreground">
              Configurado. No próximo login, escolha &quot;App autenticador&quot; para entrar sem esperar o e-mail.
            </p>
          ) : (
            <AuthenticatorSetup />
          )}
        </div>
      </div>
    </div>
  );
}
