import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DenunciasClient } from "./denuncias-client";
import { DenunciasTabs, SectorAlerts } from "./sector-alerts";
import { LeaveCasesPanel, type LeaveCaseRow } from "./leave-cases-panel";
import {
  computeSectorAlerts,
  normalizeAlertSettings,
  todayInBrazil,
  windowStart,
  type AlertCase,
} from "@/lib/reports/alerts";
import { LEAVE_ALERT_CATEGORY } from "@/lib/leave-cases/constants";

/** Validade dos links dos anexos: o bucket é privado e o link expira. */
const ATTACHMENT_LINK_SECONDS = 60 * 60;

export default async function DenunciasAdminPage(props: {
  searchParams?: Promise<{ aba?: string; setor?: string }>;
}) {
  const searchParams = await props.searchParams;
  const activeTab = searchParams?.aba === "afastamentos" ? "afastamentos" : "denuncias";

  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData?.company_id) redirect("/painel");
  // Denúncias são restritas a RH/Admin: o gestor pode ser o próprio denunciado.
  if (userData.role !== "HR" && userData.role !== "ADMIN") redirect("/inicio");

  const companyId = userData.company_id as string;

  const [{ data: reports }, { data: departments }, { data: leaveRows }, { data: company }] =
    await Promise.all([
      supabase
        .from("reports")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.from("departments").select("id, name").eq("company_id", companyId),
      supabase
        .from("leave_cases")
        .select("id, department_id, reference_month, reason_code, created_on")
        .eq("company_id", companyId)
        .order("reference_month", { ascending: false }),
      supabase
        .from("companies")
        .select("report_alert_threshold, report_alert_window_days")
        .eq("id", companyId)
        .single(),
    ]);

  const departmentNames: Record<string, string> = {};
  for (const d of departments ?? []) departmentNames[d.id as string] = d.name as string;

  // Alerta por setor: denúncias por tipo e afastamentos, dentro da janela da empresa.
  const settings = normalizeAlertSettings(
    company?.report_alert_threshold,
    company?.report_alert_window_days
  );
  const today = todayInBrazil();
  const since = windowStart(today, settings.windowDays);
  const cases: AlertCase[] = [
    ...(reports ?? [])
      .filter((r) => String(r.created_at).slice(0, 10) >= since)
      .map((r) => ({
        departmentId: (r.department_id as string | null) ?? null,
        category: r.occurrence_type as string,
        date: String(r.created_at),
      })),
    ...(leaveRows ?? []).map((l) => ({
      departmentId: (l.department_id as string | null) ?? null,
      category: LEAVE_ALERT_CATEGORY,
      date: String(l.created_on),
    })),
  ];
  const alerts = computeSectorAlerts(cases, settings, today);

  const topSlot = (
    <div className="space-y-4">
      <DenunciasTabs active={activeTab} leaveCount={(leaveRows ?? []).length} />
      <SectorAlerts
        alerts={alerts}
        departmentNames={departmentNames}
        windowDays={settings.windowDays}
        threshold={settings.threshold}
      />
    </div>
  );

  if (activeTab === "afastamentos") {
    const rows: LeaveCaseRow[] = (leaveRows ?? []).map((l) => ({
      id: l.id as string,
      reference_month: l.reference_month as string,
      reason_code: l.reason_code as string,
      department_name: l.department_id ? departmentNames[l.department_id as string] ?? null : null,
    }));
    return (
      <div className="space-y-8 pb-14">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Canal de Denúncias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Afastamentos informados pelos colaboradores, sem nome e só com mês, motivo e setor.
          </p>
        </div>
        {topSlot}
        <LeaveCasesPanel rows={rows} />
      </div>
    );
  }

  // Os anexos guardam o caminho no bucket privado; geramos links temporários.
  const paths = (reports ?? []).flatMap((r) => (r.attachments as string[] | null) ?? []);
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await createAdminClient()
      .storage.from("reports")
      .createSignedUrls(paths, ATTACHMENT_LINK_SECONDS);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  const typedReports = (reports || []).map((r) => ({
    id: r.id,
    company_id: r.company_id,
    protocol: r.protocol,
    occurrence_type: r.occurrence_type,
    description: r.description,
    status: r.status as "PENDING" | "RESOLVED",
    created_at: r.created_at,
    updated_at: r.updated_at,
    attachments: ((r.attachments as string[] | null) ?? [])
      .map((path) => signedByPath.get(path))
      .filter((url): url is string => Boolean(url)),
    department_name: r.department_id ? departmentNames[r.department_id as string] ?? null : null,
  }));

  return (
    <DenunciasClient
      key={searchParams?.setor ?? "todos"}
      initialReports={typedReports}
      topSlot={topSlot}
      initialDepartment={searchParams?.setor ?? null}
    />
  );
}
