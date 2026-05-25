import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Footer global do dashboard. Aparece no fim do scroll de cada página
 * (exceto rotas fullscreen como /planos-acao/[id]).
 */
export function DashboardFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-6 pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Logo + identidade */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="shield" size={14} filled className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">Sentinel</p>
            <p className="text-[10px] text-muted-foreground">
              Plataforma de saúde ocupacional psicossocial · Beta acadêmico
            </p>
          </div>
        </div>

        {/* Links de transparência */}
        <nav className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            href="/sobre/metodologia"
            className="text-muted-foreground hover:text-foreground"
          >
            📚 Metodologia
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/sobre/privacidade"
            className="text-muted-foreground hover:text-foreground"
          >
            🔒 Privacidade
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/sobre/seguranca"
            className="text-muted-foreground hover:text-foreground"
          >
            🛡 Segurança
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/conta/dados"
            className="text-muted-foreground hover:text-foreground"
          >
            💾 Meus dados
          </Link>
        </nav>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
        <span>Conformidade:</span>
        <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">
          NR-1 (Portaria MTE 1.419/2024)
        </span>
        <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">
          Lei 14.831/2024
        </span>
        <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">
          LGPD (Lei 13.709/2018)
        </span>
        <span className="ml-auto italic">
          Recomendações geradas por IA assistida — sempre revise com profissional habilitado.
        </span>
      </div>
    </footer>
  );
}
