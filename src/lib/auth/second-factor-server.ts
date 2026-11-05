import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isExemptDemoAccount,
  SECOND_FACTOR_COOKIE,
  SECOND_FACTOR_TTL_SECONDS,
  secondFactorSecret,
  sessionIdFromAccessToken,
  signSecondFactor,
  verifySecondFactor,
} from "./second-factor";

async function sessionId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return sessionIdFromAccessToken(session?.access_token);
}

/** O login atual já passou pelo segundo fator? */
export async function hasSecondFactor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const sid = await sessionId(supabase);
  if (!sid) return false;
  const store = await cookies();
  const ok = await verifySecondFactor(store.get(SECOND_FACTOR_COOKIE)?.value, {
    userId,
    sessionId: sid,
    secret: secondFactorSecret(),
  });
  if (ok) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isExemptDemoAccount(supabase, userId, user?.email);
}

/** Libera o login atual depois de um segundo fator válido. */
export async function grantSecondFactor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const sid = await sessionId(supabase);
  const secret = secondFactorSecret();
  if (!sid || !secret) return false;
  const store = await cookies();
  store.set(SECOND_FACTOR_COOKIE, await signSecondFactor({ userId, sessionId: sid, secret }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SECOND_FACTOR_TTL_SECONDS,
  });
  return true;
}
