import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { CreateSurveyButton } from "./create-survey-button";
import { SurveyActions } from "./survey-actions";

const STATUS_CONFIG = {
  DRAFT: { label: "Rascunho", variant: "secondary" as const, dot: "bg-gray-400" },
  ACTIVE: { label: "Ativa", variant: "default" as const, dot: "bg-emerald-500" },
  CLOSED: { label: "Encerrada", variant: "outline" as const, dot: "bg-muted-foreground" },
};

const VERSION_LABELS: Record<string, string> = {
  SHORT: "Curta (41 perguntas)",
  MEDIUM: "Média (76 perguntas)",
  LONG: "Longa (119 perguntas)",
};

export default async function SurveyManagementPage() {
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

  const { data: surveys } = await supabase
    .from("surveys")
    .select("*, questionnaire_instruments(code, name)")
    .eq("company_id", userData.company_id)
    .order("created_at", { ascending: false });

  const surveyIds = (surveys ?? []).map((s) => s.id);
  let participantCounts: Record<string, { total: number; responded: number }> =
    {};

  if (surveyIds.length > 0) {
    const { data: participants } = await supabase
      .from("survey_participants")
      .select("survey_id, has_accessed")
      .in("survey_id", surveyIds);

    for (const p of participants ?? []) {
      const stats = participantCounts[p.survey_id] ?? {
        total: 0,
        responded: 0,
      };
      stats.total++;
      if (p.has_accessed) stats.responded++;
      participantCounts[p.survey_id] = stats;
    }
  }

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", userData.company_id)
    .order("name");

  let surveyTargets: Record<string, string[]> = {};
  if (surveyIds.length > 0) {
    const { data: targets } = await supabase
      .from("survey_target_departments")
      .select("survey_id, departments(name)")
      .in("survey_id", surveyIds);

    for (const t of (targets ?? []) as unknown as { survey_id: string; departments: { name: string } | null }[]) {
      if (!surveyTargets[t.survey_id]) surveyTargets[t.survey_id] = [];
      if (t.departments?.name) surveyTargets[t.survey_id].push(t.departments.name);
    }
  }

  // Fetch active instruments for survey creation
  const { data: instruments } = await supabase
    .from("questionnaire_instruments")
    .select("id, code, name, description, total_questions, estimated_minutes")
    .eq("is_active", true)
    .order("created_at");

  const canCreate = userData.role === "HR" || userData.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Pesquisas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as pesquisas de saúde psicossocial.
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

      {(surveys ?? []).length === 0 ? (
        <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Icon name="assignment" size={32} className="text-primary/40" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground/70">
            Nenhuma pesquisa criada ainda
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie sua primeira pesquisa para avaliar a saúde psicossocial.
          </p>
        </div>
      ) : (
        <div className="stagger-children space-y-3">
          {(surveys ?? []).map((survey) => {
            const status = STATUS_CONFIG[survey.status as keyof typeof STATUS_CONFIG];
            const counts = participantCounts[survey.id] ?? {
              total: 0,
              responded: 0,
            };
            const rate =
              counts.total > 0
                ? Math.round((counts.responded / counts.total) * 100)
                : 0;
            const isActive = survey.status === "ACTIVE";

            return (
              <Card key={survey.id} className={`card-hover overflow-hidden ${isActive ? "ring-1 ring-primary/10" : ""}`}>
                {/* Subtle top accent for active surveys */}
                {isActive && (
                  <div className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {survey.title}
                    </CardTitle>
                    <Badge variant={status.variant} className="gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${isActive ? "animate-pulse-soft" : ""}`} />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Icon name="assignment" size={15} />
                      {(survey.questionnaire_instruments as unknown as { name: string } | null)?.name ?? "COPSOQ II"}
                      {survey.version ? ` — ${VERSION_LABELS[survey.version] ?? survey.version}` : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="group" size={15} />
                      {counts.responded}/{counts.total} respostas ({rate}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="apartment" size={15} />
                      {surveyTargets[survey.id]?.length
                        ? `${surveyTargets[survey.id].length} setor(es)`
                        : "Todos os setores"}
                    </span>
                    {survey.expires_at && (
                      <span className="flex items-center gap-1.5">
                        <Icon name="schedule" size={15} />
                        Expira em{" "}
                        {new Date(survey.expires_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Icon name="calendar_today" size={15} />
                      Criada em{" "}
                      {new Date(survey.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {counts.total > 0 && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  )}

                  {canCreate && (
                    <SurveyActions
                      surveyId={survey.id}
                      status={survey.status}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
