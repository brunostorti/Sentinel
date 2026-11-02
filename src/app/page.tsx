import { homeForRole } from "@/lib/auth/home";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: userData } = await supabase
    .from("users")
    .select("role, is_master")
    .eq("auth_id", user.id)
    .single();

  redirect(homeForRole(userData?.role, userData?.is_master === true));
}
