import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedbacksClient, type FeedbackItem } from "./feedbacks-client";

export default async function FeedbacksPage() {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData?.company_id) redirect("/painel");
  // Mesmo critério das denúncias: só RH/Admin (o gestor pode ser alvo da crítica).
  if (userData.role !== "HR" && userData.role !== "ADMIN") redirect("/inicio");

  const { data } = await supabase
    .from("action_plan_feedback")
    .select(
      "id, rating, message, status, created_at, action_plan_id, action_plans (ai_recommendation), departments (name)"
    )
    .eq("company_id", userData.company_id)
    .order("created_at", { ascending: false });

  const items: FeedbackItem[] = (data ?? []).map((f) => {
    const plan = f.action_plans as unknown as { ai_recommendation: { title?: string } | null } | null;
    const dept = f.departments as unknown as { name: string } | null;
    return {
      id: f.id,
      rating: f.rating,
      message: f.message,
      status: f.status as "NEW" | "READ",
      createdAt: f.created_at,
      planId: f.action_plan_id,
      planTitle: f.action_plan_id ? plan?.ai_recommendation?.title?.trim() || "Plano sem título" : null,
      department: dept?.name ?? null,
    };
  });

  return <FeedbacksClient initialItems={items} />;
}
