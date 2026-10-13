import Link from "next/link";
import { Icon } from "@/components/icon";
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

export default async function ActionPlansPage(props: {
  searchParams?: Promise<{ cycleId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const cycleId = searchParams?.cycleId ?? null;

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

  // Contexto do ciclo se filtrado
  let cycleInfo: { id: string; title: string } | null = null;
  if (cycleId) {
    const { data: c } = await supabase
      .from("survey_cycles")
      .select("id, title")
      .eq("id", cycleId)
      .eq("company_id", companyId)
      .maybeSingle();
    cycleInfo = c;
  }

  // Planos (leves — só o necessário para contagem por status)
  const { data: planRows } = await supabase
    .from("action_plans")
    .select("id, status, survey_id, surveys (id, title, status)")
    .eq("company_id", companyId);
  const plans = (planRows ?? []) as unknown as PlanCountRow[];

  // Pesquisas que viram card: CLOSED + ACTIVE
  let surveyQuery = supabase
    .from("surveys")
    .select("id, title, status, created_at, instrument_id, cycle_id, questionnaire_instruments (name)")
    .eq("company_id", companyId)
    .in("status", ["CLOSED", "ACTIVE"]);

  if (cycleId) {
    surveyQuery = surveyQuery.eq("cycle_id", cycleId);
  }

  const { data: surveyRows } = await surveyQuery;

  // Mapa de pesquisas-card: começa pelas CLOSED/ACTIVE e garante que
  // qualquer pesquisa referenciada por um plano também apareça.
  const surveyMap = new Map<string, { id: string; title: string; status: string; created_at?: string; instrument_id?: string; instrument_name?: string }>();
  for (const s of surveyRows ?? []) {
    const inst = Array.isArray(s.questionnaire_instruments)
      ? s.questionnaire_instruments[0]
      : (s.questionnaire_instruments as { name?: string } | null);
    const instName = inst?.name || "";
    surveyMap.set(s.id, { id: s.id, title: s.title, status: s.status, created_at: s.created_at, instrument_id: s.instrument_id, instrument_name: instName });
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
      instrumentName: s.instrument_name || "",
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
        {cycleInfo && (
          <div className="mb-2 flex items-center gap-2">
            <Link
              href={`/gerenciar-pesquisas/ciclo/${cycleInfo.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon name="arrow_back" size={14} />
              {cycleInfo.title}
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Link
              href="/planos-acao"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Ver todas as pesquisas
            </Link>
          </div>
        )}
        <h1 className="text-3xl font-black tracking-tight">
          {cycleInfo ? `Planos de Ação — ${cycleInfo.title}` : "Planos de Ação IA"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {cycleInfo
            ? `Pesquisas e planos de intervenção correspondentes ao ciclo ${cycleInfo.title}.`
            : "Escolha uma pesquisa para revisar os planos gerados por inteligência artificial a partir dos seus resultados psicossociais."}
        </p>
      </div>

      <SurveyCardsGrid
        cards={cards}
        canManage={canManage}
        hasAnySurveys={surveyList.length > 0}
      />
    </div>
  );
}
