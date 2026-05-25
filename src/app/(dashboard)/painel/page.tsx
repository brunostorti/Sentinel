import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchDashboardKPIs,
  fetchAllSurveysWithResponses,
  fetchSurveyDimensionScores,
  fetchDepartments,
  fetchDepartmentResponseCounts,
  fetchHistoricalTrends,
  aggregateMultiSurveyScores,
} from "@/lib/copsoq/dashboard";
import { DashboardContent } from "./dashboard-content";
import { SetupCompletenessBanner } from "@/components/painel/setup-banner";
import { AttributionBanner } from "@/components/painel/attribution-banner";
import { NewPlansBanner } from "@/components/painel/new-plans-banner";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_id", user.id)
    .single();

  if (!userData) redirect("/entrar");
  const companyId = userData.company_id;

  const [kpis, allSurveys, departments, trendData] = await Promise.all([
    fetchDashboardKPIs(supabase, companyId),
    fetchAllSurveysWithResponses(supabase, companyId),
    fetchDepartments(supabase, companyId),
    fetchHistoricalTrends(supabase, companyId),
  ]);

  // Only process surveys that have responses
  const surveysWithData = allSurveys.filter((s) => s.responseCount > 0);

  // Build data for each survey
  const surveyDataMap: Record<
    string,
    {
      scores: Awaited<ReturnType<typeof fetchSurveyDimensionScores>>["scores"];
      isAnonymized: boolean;
      responseCount: number;
      participantCount: number;
      responseRate: number;
      departments: { id: string; name: string; responseCount: number; invited: number }[];
      departmentScores: Record<string, { scores: Awaited<ReturnType<typeof fetchSurveyDimensionScores>>["scores"]; isAnonymized: boolean }>;
    }
  > = {};

  // Fetch scores for all surveys in parallel
  const surveyScoreResults = await Promise.all(
    surveysWithData.map(async (survey) => {
      const [scores, deptResponseCounts] = await Promise.all([
        fetchSurveyDimensionScores(supabase, survey.id),
        fetchDepartmentResponseCounts(supabase, survey.id),
      ]);

      const deptScoreResults = await Promise.all(
        departments.map((dept) =>
          fetchSurveyDimensionScores(supabase, survey.id, dept.id)
        )
      );

      const departmentScores: Record<string, { scores: typeof scores.scores; isAnonymized: boolean }> = {};
      for (let i = 0; i < departments.length; i++) {
        departmentScores[departments[i].id] = deptScoreResults[i];
      }

      const deptFilters = departments.map((dept) => {
        const stats = deptResponseCounts.get(dept.id) ?? { invited: 0, responded: 0, responses: 0 };
        return { id: dept.id, name: dept.name, responseCount: stats.responses, invited: stats.invited };
      });

      // Participant counts for this survey
      const totalInvited = Array.from(deptResponseCounts.values()).reduce((sum, s) => sum + s.invited, 0);
      const totalResponded = Array.from(deptResponseCounts.values()).reduce((sum, s) => sum + s.responded, 0);
      const rate = totalInvited > 0 ? Math.round((totalResponded / totalInvited) * 100) : 0;

      return {
        surveyId: survey.id,
        data: {
          scores: scores.scores,
          isAnonymized: scores.isAnonymized,
          responseCount: survey.responseCount,
          participantCount: totalInvited,
          responseRate: rate,
          departments: deptFilters,
          departmentScores,
        },
      };
    })
  );

  for (const result of surveyScoreResults) {
    surveyDataMap[result.surveyId] = result.data;
  }

  // Build "General" aggregated view
  const allScoreResults = surveyScoreResults.map((r) => ({
    scores: r.data.scores,
    isAnonymized: r.data.isAnonymized,
  }));
  const generalScores = aggregateMultiSurveyScores(allScoreResults);

  // Aggregate department data across all surveys for the general view
  const generalDeptScores: Record<string, { scores: typeof generalScores.scores; isAnonymized: boolean }> = {};
  for (const dept of departments) {
    const deptResults = surveyScoreResults.map((r) => r.data.departmentScores[dept.id]).filter(Boolean);
    const aggregated = aggregateMultiSurveyScores(deptResults);
    generalDeptScores[dept.id] = aggregated;
  }

  // Aggregate department stats for general view
  const generalDeptFilters = departments.map((dept) => {
    let totalResponses = 0;
    let totalInvited = 0;
    for (const result of surveyScoreResults) {
      const deptInfo = result.data.departments.find((d) => d.id === dept.id);
      if (deptInfo) {
        totalResponses += deptInfo.responseCount;
        totalInvited += deptInfo.invited;
      }
    }
    return { id: dept.id, name: dept.name, responseCount: totalResponses, invited: totalInvited };
  });

  const generalData = generalScores.scores.length > 0
    ? {
        ...generalScores,
        responseCount: kpis.totalResponses,
        participantCount: kpis.totalParticipants,
        responseRate: kpis.responseRate,
        departments: generalDeptFilters,
        departmentScores: generalDeptScores,
      }
    : null;

  const surveyOptions = surveysWithData.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    instrumentName: s.instrumentName,
    responseCount: s.responseCount,
    created_at: s.created_at,
  }));

  return (
    <div className="space-y-4">
      <SetupCompletenessBanner />
      <NewPlansBanner />
      <AttributionBanner />
      <DashboardContent
        kpis={kpis}
        surveys={surveyOptions}
        surveyDataMap={surveyDataMap}
        generalData={generalData}
        trendData={trendData}
      />
    </div>
  );
}
