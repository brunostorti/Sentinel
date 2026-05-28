import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY on the server for operations that must not carry user context
 * (e.g., writing anonymous survey responses).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    console.warn("Warning: Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key || "placeholder-key",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
