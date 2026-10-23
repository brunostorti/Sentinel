import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeContext } from "@/lib/colaborador/session";
import { describeDeadline } from "@/lib/survey/draft";
import { SurveyCards, type EmployeeSurvey } from "./survey-cards";

type SurveyVersion = "SHORT" | "MEDIUM" | "LONG" | null;

type Participation = {
  id: string;
  has_accessed: boolean;
  surveys: {
    id: string;
    title: string;
    version: SurveyVersion;
    status: string;
    expires_at: string | null;
    instrument_id: string | null;
  } | null;
};

const VERSION_COLUMN = {
  SHORT: "short_version",
  MEDIUM: "medium_version",
  LONG: "long_version",
} as const;

export default async function SurveyListPage() {
  const employee = await getEmployeeContext();
  if (!employee) redirect("/entrar");

  // Cliente admin: o colaborador não tem registro em users (RLS). Seguro porque o filtro
  // é o e-mail verificado da sessão.
  const admin = createAdminClient();
  const { data } = await admin
    .from("survey_participants")
    .select("id, has_accessed, surveys (id, title, version, status, expires_at, instrument_id)")
    .eq("email", employee.email)
    .order("invited_at", { ascending: false });

  const active = ((data ?? []) as unknown as Participation[]).filter(
    (p) => p.surveys?.status === "ACTIVE"
  );

  // Nº de perguntas por (instrumento, versão), para o tempo estimado e o progresso.
  const countCache = new Map<string, number>();
  async function questionCount(instrumentId: string | null, version: SurveyVersion) {
    const key = `${instrumentId}:${version}`;
    if (!countCache.has(key)) {
      let query = admin.from("questionnaire_items").select("id", { count: "exact", head: true });
      if (instrumentId) query = query.eq("instrument_id", instrumentId);
      if (version) query = query.eq(VERSION_COLUMN[version], true);
      const { count } = await query;
      countCache.set(key, count ?? 0);
    }
    return countCache.get(key)!;
  }

  const now = new Date();
  const surveys: EmployeeSurvey[] = [];
  for (const p of active) {
    const s = p.surveys!;
    surveys.push({
      id: s.id,
      title: s.title,
      expired: !!s.expires_at && new Date(s.expires_at) < now,
      deadline: describeDeadline(s.expires_at, now),
      answered: p.has_accessed,
      questionCount: await questionCount(s.instrument_id, s.version),
    });
  }

  return <SurveyCards userId={employee.userId} surveys={surveys} />;
}
