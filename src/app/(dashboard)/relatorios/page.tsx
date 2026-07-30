import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SurveyContextNav } from "@/components/survey-context-nav";
import {
  fetchSurveyDimensionScores,
  fetchDepartments,
  fetchDepartmentResponseCounts,
} from "@/lib/copsoq/dashboard";
import type { DimensionScore } from "@/lib/copsoq/types";
import { ReportExporter } from "./report-exporter";

export default async function ReportsPage(props: {
  searchParams?: Promise<{ surveyId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const selectedSurveyId = searchParams?.surveyId ?? null;

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

  const companyId = userData.company_id;

  const { data: selectedSurveyContext } = selectedSurveyId
    ? await supabase
        .from("surveys")
        .select("id, title, status")
        .eq("id", selectedSurveyId)
        .eq("company_id", companyId)
        .maybeSingle()
    : { data: null };

  let surveyQuery = supabase
    .from("surveys")
    .select("id, title, version, status, closed_at, created_at")
    .eq("company_id", companyId)
    .in("status", ["CLOSED", "ACTIVE"])
    .order("created_at", { ascending: false });

  if (selectedSurveyId) {
    surveyQuery = surveyQuery.eq("id", selectedSurveyId);
  }

  const { data: closedSurveys } = await surveyQuery;
  const surveys = closedSurveys ?? [];
  const currentSurvey = selectedSurveyContext ?? null;

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  const companyName = company?.name ?? "Empresa";
  const departments = await fetchDepartments(supabase, companyId);

  const surveyReports: Array<{
    surveyId: string;
    surveyTitle: string;
    version: string;
    status: string;
    closedAt: string | null;
    scores: DimensionScore[];
    isAnonymized: boolean;
    departmentStats: Array<{
      departmentName: string;
      invited: number;
      responded: number;
    }>;
  }> = [];

  for (const survey of surveys) {
    const { scores, isAnonymized } = await fetchSurveyDimensionScores(
      supabase,
      survey.id
    );

    const deptCounts = await fetchDepartmentResponseCounts(
      supabase,
      survey.id
    );

    const departmentStats = departments.map((d) => {
      const stats = deptCounts.get(d.id);
      return {
        departmentName: d.name,
        invited: stats?.invited ?? 0,
        responded: stats?.responded ?? 0,
      };
    });

    surveyReports.push({
      surveyId: survey.id,
      surveyTitle: survey.title,
      version: survey.version,
      status: survey.status,
      closedAt: survey.closed_at ?? null,
      scores,
      isAnonymized,
      departmentStats,
    });
  }

  return (
    <div className="space-y-6">
      {currentSurvey && (
        <SurveyContextNav
          surveyId={currentSurvey.id}
          surveyTitle={currentSurvey.title}
          status={currentSurvey.status}
          current="relatorios"
        />
      )}

      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {selectedSurveyId ? "Relatório da pesquisa" : "Relatórios"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {selectedSurveyId
            ? "Exporte os resultados deste ciclo específico em PDF ou CSV."
            : "Exporte os resultados das pesquisas em PDF ou CSV."}
        </p>
      </div>

      {surveyReports.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            Nenhuma pesquisa ativa ou encerrada para exportar.
          </p>
        </div>
      ) : (
        <ReportExporter
          companyName={companyName}
          surveyReports={surveyReports}
        />
      )}
    </div>
  );
}
