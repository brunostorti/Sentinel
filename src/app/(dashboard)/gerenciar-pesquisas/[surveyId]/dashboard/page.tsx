import DashboardPage from "../../../painel/page";

export default async function SurveyDashboardPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return DashboardPage({
    searchParams: Promise.resolve({ surveyId }),
  });
}
