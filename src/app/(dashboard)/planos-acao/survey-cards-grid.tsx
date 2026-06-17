"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { getHealthColor } from "@/lib/copsoq/health-index";
import { generatePlansForSurvey } from "./actions";
import { Counter } from "./_components/counter";
import { EmptyState } from "./_components/empty-state";

export interface SurveyCardData {
  surveyId: string;
  title: string;
  status: "CLOSED" | "ACTIVE";
  counts: {
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
    total: number;
  };
  healthIndex: number | null;
  isAnonymized: boolean;
  hasPlans: boolean;
}

const STATUS_LABEL: Record<SurveyCardData["status"], string> = {
  ACTIVE: "Ativa",
  CLOSED: "Encerrada",
};

interface Props {
  cards: SurveyCardData[];
  canManage: boolean;
  hasAnySurveys: boolean;
  hasApiKey: boolean;
}

export function SurveyCardsGrid({ cards, canManage, hasAnySurveys, hasApiKey }: Props) {
  const router = useRouter();
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  async function handleGenerate(surveyId: string) {
    setGeneratingFor(surveyId);
    const result = await generatePlansForSurvey(surveyId);
    setGeneratingFor(null);
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={!hasAnySurveys ? "assignment" : !hasApiKey ? "psychology" : "hourglass_empty"}
        title={
          !hasAnySurveys
            ? "Nenhuma pesquisa disponível"
            : !hasApiKey
              ? "IA não configurada"
              : "Nenhum plano gerado ainda"
        }
        subtitle={
          !hasAnySurveys
            ? "Os planos de ação são gerados a partir de pesquisas com respostas."
            : !hasApiKey
              ? "Configure ANTHROPIC_API_KEY no servidor."
              : "Encerre uma pesquisa com respostas para gerar planos."
        }
      />
    );
  }

  return (
    <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <SurveyCard
          key={card.surveyId}
          card={card}
          canManage={canManage}
          generating={generatingFor === card.surveyId}
          anyGenerating={generatingFor !== null}
          onGenerate={() => handleGenerate(card.surveyId)}
        />
      ))}
    </div>
  );
}

function SurveyCard({
  card,
  canManage,
  generating,
  anyGenerating,
  onGenerate,
}: {
  card: SurveyCardData;
  canManage: boolean;
  generating: boolean;
  anyGenerating: boolean;
  onGenerate: () => void;
}) {
  const health =
    card.healthIndex !== null && !card.isAnonymized ? getHealthColor(card.healthIndex) : null;

  const inner = (
    <>
      {/* Cabeçalho: título + status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-base font-bold leading-snug line-clamp-2">
          {card.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            card.status === "ACTIVE"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {STATUS_LABEL[card.status]}
        </span>
      </div>

      {/* Índice de saúde */}
      <div className="mt-4 flex items-center gap-3">
        {health ? (
          <>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-4 ring-offset-2 ring-offset-card"
              style={{ borderColor: health.color, color: health.color }}
            >
              <span className="text-lg font-black tabular-nums" style={{ color: health.color }}>
                {card.healthIndex}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Índice de Saúde
              </p>
              <p className="text-sm font-black" style={{ color: health.color }}>
                {health.label}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="lock" size={16} />
            <span className="text-xs">Índice indisponível (amostra pequena)</span>
          </div>
        )}
      </div>

      {/* Contagens por status */}
      {card.hasPlans ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Counter label="Pendentes" value={card.counts.pending} accent="amber" />
          <Counter label="Aprovados" value={card.counts.approved} accent="blue" />
          <Counter label="Concluídos" value={card.counts.completed} accent="emerald" />
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Nenhum plano gerado.</p>
      )}
    </>
  );

  // Card com planos → link para a pesquisa
  if (card.hasPlans) {
    return (
      <Card className="card-hover group relative flex flex-col p-5">
        <Link
          href={`/planos-acao/pesquisa/${card.surveyId}`}
          className="flex flex-1 flex-col"
        >
          {inner}
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
            Ver planos
            <Icon
              name="arrow_forward"
              size={14}
              className="transition group-hover:translate-x-0.5"
            />
          </div>
        </Link>
      </Card>
    );
  }

  // Card sem planos → CTA de geração (só CLOSED + canManage)
  return (
    <Card className="flex flex-col p-5">
      {inner}
      <div className="mt-4">
        {canManage && card.status === "CLOSED" ? (
          <Button
            size="sm"
            className="w-full gap-1.5 bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/10 transition-all active:scale-95"
            onClick={onGenerate}
            disabled={anyGenerating}
          >
            <Icon name="auto_awesome" size={14} />
            {generating ? "Gerando..." : "Gerar planos"}
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {card.status === "ACTIVE"
              ? "Encerre a pesquisa para gerar planos."
              : "Sem planos disponíveis."}
          </p>
        )}
      </div>
    </Card>
  );
}
