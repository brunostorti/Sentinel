import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { fetchCyclesWithSurveys, getStageShortLabel } from "@/lib/surveys/cycle";
import type { CycleSurvey } from "@/lib/surveys/cycle";
import { CreateSurveyButton } from "./create-survey-button";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline"; dot: string }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary", dot: "bg-gray-400" },
  ACTIVE: { label: "Em coleta", variant: "default", dot: "bg-emerald-500" },
  CLOSED: { label: "Encerrada", variant: "outline", dot: "bg-muted-foreground" },
};

const VERSION_LABELS: Record<string, string> = {
  SHORT: "Curta (41 perguntas)",
  MEDIUM: "Média (76 perguntas)",
  LONG: "Longa (119 perguntas)",
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

/**
 * Linha do tempo das pesquisas do ciclo.
 *
 * Um ciclo raramente passa de tres pesquisas, entao cada etapa ganha espaco
 * para mostrar rotulo, status e adesao em vez de virar so um ponto colorido.
 * O estagio vem do rotulo (bandeira para a base, R1/R2 para reavaliacoes) e o
 * status vem da cor do no, entao os dois eixos nunca disputam a mesma cor.
 */
function CycleTimeline({ surveys }: { surveys: CycleSurvey[] }) {
  return (
    <div className="flex items-start">
      {surveys.map((survey, index) => {
        const status = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.DRAFT;
        const isActive = survey.status === "ACTIVE";
        return (
          <div
            key={survey.id}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            {index > 0 && (
              <span
                className="absolute right-1/2 top-[19px] h-0.5 w-full bg-border"
                aria-hidden
              />
            )}

            <span
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-xs font-black text-white ring-4 ring-card ${status.dot} ${
                isActive ? "shadow-md shadow-emerald-500/25" : ""
              }`}
            >
              {index === 0 ? (
                <Icon name="flag" size={17} className="text-white" />
              ) : (
                getStageShortLabel(index)
              )}
            </span>

            <p className="mt-2 text-xs font-bold leading-tight">
              {survey.stageLabel}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
              {status.label}
            </p>
            <p className="mt-1 text-sm font-black tabular-nums leading-none">
              {survey.invited > 0 ? `${survey.responseRate}%` : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black leading-none">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export default async function SurveyCyclesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) redirect("/entrar");

  const cycles = await fetchCyclesWithSurveys(supabase, userData.company_id);

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", userData.company_id)
    .order("name");

  const { data: instruments } = await supabase
    .from("questionnaire_instruments")
    .select("id, code, name, description, total_questions, estimated_minutes")
    .eq("is_active", true)
    .order("created_at");

  const canCreate = userData.role === "HR" || userData.role === "ADMIN";

  // Ciclos com coleta aberta primeiro — é onde há ação pendente.
  const sorted = [...cycles].sort((a, b) => {
    const priority = (status: string) =>
      status === "ACTIVE" ? 0 : status === "DRAFT" ? 1 : 2;
    const diff =
      priority(a.latestSurvey.status) - priority(b.latestSurvey.status);
    if (diff !== 0) return diff;
    return (
      new Date(b.latestSurvey.created_at).getTime() -
      new Date(a.latestSurvey.created_at).getTime()
    );
  });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Ciclos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada ciclo começa com uma pesquisa base e acompanha o mesmo grupo ao
            longo do tempo, para comprovar se os riscos diminuíram.
          </p>
        </div>
        {canCreate && (
          <CreateSurveyButton
            companyId={userData.company_id}
            departments={departments ?? []}
            instruments={instruments ?? []}
          />
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Icon name="account_tree" size={32} className="text-primary/40" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            Nenhum ciclo criado ainda
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Crie o primeiro ciclo para aplicar a pesquisa base e acompanhar as
            reavaliações ao longo do tempo.
          </p>
        </div>
      ) : (
        <div className="stagger-children grid gap-4 xl:grid-cols-2">
          {sorted.map((cycle) => {
            const latest = cycle.latestSurvey;
            const status = STATUS_CONFIG[latest.status] ?? STATUS_CONFIG.DRAFT;
            const isActive = latest.status === "ACTIVE";
            const totalResponses = cycle.surveys.reduce(
              (sum, s) => sum + s.responded,
              0
            );
            const totalPlans = cycle.surveys.reduce(
              (sum, s) => sum + s.planCount,
              0
            );
            const totalInvited = cycle.surveys.reduce(
              (sum, s) => sum + s.invited,
              0
            );
            const version = latest.version
              ? VERSION_LABELS[latest.version] ?? latest.version
              : null;

            return (
              <Card
                key={cycle.id}
                className={`card-hover overflow-hidden ${isActive ? "ring-1 ring-primary/10" : ""}`}
              >
                {isActive && (
                  <div className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg font-bold">
                        {cycle.title}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cycle.surveys.length} pesquisa(s) · última em{" "}
                        {formatDate(latest.created_at)}
                      </p>
                    </div>
                    <Badge variant={status.variant} className="shrink-0 gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot} ${isActive ? "animate-pulse-soft" : ""}`}
                      />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Icon name="assignment" size={15} />
                    {latest.instrumentName ?? "COPSOQ II"}
                    {version ? ` — ${version}` : ""}
                  </p>

                  <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Linha do tempo
                    </p>
                    <CycleTimeline surveys={cycle.surveys} />
                    {/* A adesao por etapa ja aparece na linha do tempo acima,
                        entao aqui ficam so os totais do ciclo. */}
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                      <Metric
                        label="Respostas"
                        value={String(totalResponses)}
                        detail={`de ${totalInvited} convidados`}
                      />
                      <Metric
                        label="Planos de ação"
                        value={String(totalPlans)}
                        detail="no ciclo"
                      />
                    </div>
                  </div>

                  <Link
                    href={`/gerenciar-pesquisas/ciclo/${cycle.id}`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <Icon name="account_tree" size={16} />
                    Abrir ciclo
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
