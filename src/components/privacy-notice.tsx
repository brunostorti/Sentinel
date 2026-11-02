import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Aviso de sigilo exibido ao colaborador (denúncia, feedback e afastamento).
 * Só afirma o que o sistema garante: nome, e-mail e hora exata não vão para o registro.
 * Não citar lei aqui sem validação jurídica; não citar IP antes de conferir os logs.
 */
export function PrivacyNotice({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-950 dark:text-emerald-100",
        className
      )}
      role="note"
    >
      <Icon name="verified_user" size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="space-y-1 leading-6">
        <p className="font-bold">Seu envio é sigiloso</p>
        <p>
          O Sentinel não grava seu nome, seu e-mail nem a hora exata no registro, só o dia. A empresa
          recebe apenas o que você escrever e escolher aqui, sem saber quem enviou.
        </p>
        {!compact && (
          <p className="text-emerald-900/80 dark:text-emerald-100/80">
            Para continuar anônimo(a), evite detalhes que só você saberia, como seu nome ou o de quem
            estava com você.
          </p>
        )}
      </div>
    </div>
  );
}
