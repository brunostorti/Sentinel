import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/icon";

export default async function SurveyListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/entrar");

  // Use admin client to bypass RLS — safe because we filter by the verified email
  const admin = createAdminClient();
  const { data: participations } = await admin
    .from("survey_participants")
    .select(
      `
      id,
      has_accessed,
      survey_id,
      surveys (
        id,
        title,
        version,
        status,
        expires_at
      )
    `
    )
    .eq("email", user.email)
    .order("invited_at", { ascending: false });

  const activeSurveys = (participations ?? []).filter((p) => {
    const survey = p.surveys as unknown as {
      id: string;
      title: string;
      version: string;
      status: string;
      expires_at: string | null;
    } | null;
    return survey?.status === "ACTIVE";
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight">
          Suas Pesquisas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione uma pesquisa para responder.
        </p>
      </div>

      {activeSurveys.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-center">
            <Icon
              name="clipboard"
              size={40}
              className="mx-auto text-muted-foreground"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma pesquisa disponível no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeSurveys.map((p) => {
            const survey = p.surveys as unknown as {
              id: string;
              title: string;
              version: string;
              expires_at: string | null;
            };

            const expiresAt = survey.expires_at
              ? new Date(survey.expires_at)
              : null;
            const isExpired = expiresAt ? expiresAt < new Date() : false;

            const versionLabels: Record<string, string> = {
              SHORT: "Curta",
              MEDIUM: "Média",
              LONG: "Longa",
            };

            return (
              <Card key={p.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">
                    {survey.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon name="clipboard" size={14} />
                      Versão {versionLabels[survey.version] ?? survey.version}
                    </span>
                    {expiresAt && (
                      <span className="flex items-center gap-1">
                        <Icon name="clock" size={14} />
                        {isExpired
                          ? "Expirada"
                          : `Até ${expiresAt.toLocaleDateString("pt-BR")}`}
                      </span>
                    )}
                  </div>
                  {!isExpired && (
                    <a
                      href={`/responder/${survey.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Responder pesquisa
                    </a>
                  )}
                  {isExpired && (
                    <p className="text-sm text-destructive text-center">
                      Esta pesquisa já expirou.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <form action="/api/auth/signout" method="POST" className="text-center">
        <button
          type="submit"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
