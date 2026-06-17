import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSurveyDimensionScores } from "@/lib/copsoq/dashboard";
import { computeHealthIndex } from "@/lib/copsoq/health-index";
import { SurveyCardsGrid, type SurveyCardData } from "./survey-cards-grid";

type PlanCountRow = {
  id: string;
  status: string;
  survey_id: string;
  surveys: { id: string; title: string; status: string } | null;
};

export default async function ActionPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("id, company_id, role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) redirect("/entrar");

  const companyId = userData.company_id;
  const canManage = userData.role === "HR" || userData.role === "ADMIN";

  // Planos (leves — só o necessário para contagem por status)
  const { data: planRows } = await supabase
    .from("action_plans")
    .select("id, status, survey_id, surveys (id, title, status)")
    .eq("company_id", companyId);
  const plans = (planRows ?? []) as unknown as PlanCountRow[];

  // Pesquisas que viram card: CLOSED + ACTIVE (não filtrar CLOSED-only,
  // senão pesquisas ACTIVE com planos sumiriam).
  const { data: surveyRows } = await supabase
    .from("surveys")
    .select("id, title, status, created_at, instrument_id")
    .eq("company_id", companyId)
    .in("status", ["CLOSED", "ACTIVE"]);

  // Mapa de pesquisas-card: começa pelas CLOSED/ACTIVE e garante que
  // qualquer pesquisa referenciada por um plano também apareça.
  const surveyMap = new Map<string, { id: string; title: string; status: string; created_at?: string; instrument_id?: string }>();
  for (const s of surveyRows ?? []) {
    surveyMap.set(s.id, { id: s.id, title: s.title, status: s.status, created_at: s.created_at, instrument_id: s.instrument_id });
  }
  for (const p of plans) {
    if (p.surveys && !surveyMap.has(p.surveys.id)) {
      surveyMap.set(p.surveys.id, {
        id: p.surveys.id,
        title: p.surveys.title,
        status: p.surveys.status,
      });
    }
  }

  // Contagens por status, agrupadas por survey
  const countsBySurvey = new Map<
    string,
    SurveyCardData["counts"]
  >();
  for (const p of plans) {
    const c =
      countsBySurvey.get(p.survey_id) ?? {
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        total: 0,
      };
    c.total++;
    if (p.status === "PENDING_REVIEW") c.pending++;
    else if (p.status === "APPROVED") c.approved++;
    else if (p.status === "COMPLETED") c.completed++;
    else if (p.status === "REJECTED") c.rejected++;
    countsBySurvey.set(p.survey_id, c);
  }

  const surveyList = Array.from(surveyMap.values());

  // Índice de saúde por pesquisa — concorrente (poucas pesquisas por empresa).
  // TODO: se uma empresa tiver muitas pesquisas, trocar por um RPC batched.
  const healthBySurvey = await Promise.all(
    surveyList.map(async (s) => {
      const { scores, isAnonymized } = await fetchSurveyDimensionScores(supabase, s.id);
      const healthIndex =
        isAnonymized || scores.length === 0 ? null : computeHealthIndex(scores);
      return { surveyId: s.id, healthIndex, isAnonymized };
    })
  );
  const healthMap = new Map(healthBySurvey.map((h) => [h.surveyId, h]));

  const cards: SurveyCardData[] = surveyList.map((s) => {
    const counts =
      countsBySurvey.get(s.id) ?? {
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        total: 0,
      };
    const health = healthMap.get(s.id);
    return {
      surveyId: s.id,
      title: s.title,
      status: s.status as "CLOSED" | "ACTIVE",
      createdAt: s.created_at || new Date().toISOString(),
      instrumentId: s.instrument_id || "",
      counts,
      healthIndex: health?.healthIndex ?? null,
      isAnonymized: health?.isAnonymized ?? false,
      hasPlans: counts.total > 0,
    };
  });

  // A ordenação inicial será feita no Client Component (SurveyCardsGrid)
  // pois agora temos opções de ordenação. Passaremos a lista desordenada ou
  // apenas uma ordenação default (ex: pendentes).
  cards.sort((a, b) => {
    if (b.counts.pending !== a.counts.pending) return b.counts.pending - a.counts.pending;
    return b.counts.total - a.counts.total;
  });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight">Planos de Ação IA</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha uma pesquisa para revisar os planos gerados por inteligência
          artificial a partir dos seus resultados psicossociais.
        </p>
      </div>

      <SurveyCardsGrid
        cards={cards}
        canManage={canManage}
        hasAnySurveys={surveyList.length > 0}
        hasApiKey={!!process.env.ANTHROPIC_API_KEY}
      />
    </div>
  );
}
