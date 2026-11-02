import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSecondFactor } from "@/lib/auth/second-factor-server";
import { homeForRole } from "@/lib/auth/home";
import { VerifyForm } from "./verify-form";

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

export default async function VerifyAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await supabase
    .from("users")
    .select("role, is_master")
    .eq("auth_id", user.id)
    .single();
  if (!data || data.is_master !== true) redirect("/entrar");
  if (await hasSecondFactor(supabase, user.id)) redirect(homeForRole(data.role, true));

  const { data: factors } = await supabase.auth.mfa.listFactors();
  return <VerifyForm email={maskEmail(user.email ?? "")} hasAuthenticator={(factors?.totp?.length ?? 0) > 0} />;
}
