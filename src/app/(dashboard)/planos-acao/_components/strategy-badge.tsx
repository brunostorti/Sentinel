import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export type RecommendationStatus = "MITIGAR" | "RESOLVER" | "TRANSFERIR" | "ACEITAR";

interface StrategyMeta {
  label: string;
  icon: string;
  /** classes de cor para o Badge (bg/text/border) */
  cls: string;
  /** significado em linguagem clara, mostrado no tooltip */
  meaning: string;
}

export const STRATEGY_META: Record<RecommendationStatus, StrategyMeta> = {
  RESOLVER: {
    label: "Resolver",
    icon: "build",
    cls: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    meaning:
      "Elimina a causa-raiz do risco — mudança no processo, carga, jornada ou gestão.",
  },
  MITIGAR: {
    label: "Mitigar",
    icon: "shield",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    meaning:
      "Reduz a probabilidade ou o impacto do risco sem eliminar a causa (treinos, apoio, controles).",
  },
  TRANSFERIR: {
    label: "Transferir",
    icon: "swap_horiz",
    cls: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
    meaning:
      "Delega a execução a um especialista externo (EAP/PAE, clínica, consultoria, seguro).",
  },
  ACEITAR: {
    label: "Aceitar",
    icon: "check",
    cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    meaning:
      "Risco residual baixo, mantido sob monitoramento, sem ação corretiva imediata.",
  },
};

interface StrategyBadgeProps {
  status?: RecommendationStatus | null;
  /** quando true, envolve o badge num tooltip explicando a estratégia */
  withMeaning?: boolean;
  className?: string;
}

export function StrategyBadge({ status, withMeaning, className }: StrategyBadgeProps) {
  if (!status) return null;
  const meta = STRATEGY_META[status];

  const badge = (
    <Badge
      variant="outline"
      className={`h-5 gap-0.5 text-[10px] ${meta.cls} ${className ?? ""}`}
    >
      <Icon name={meta.icon} size={10} />
      {meta.label}
    </Badge>
  );

  if (!withMeaning) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-semibold">{meta.label}:</span> {meta.meaning}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
