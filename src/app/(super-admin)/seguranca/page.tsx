import { createClient } from "@/lib/supabase/server";
import { TwoFactorCard } from "@/components/two-factor-card";

export default async function SecurityPage() {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Segurança da conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Proteja o acesso administrativo ao Sentinel.</p>
      </div>
      <TwoFactorCard hasAuthenticator={(factors?.totp?.length ?? 0) > 0} />
    </div>
  );
}
