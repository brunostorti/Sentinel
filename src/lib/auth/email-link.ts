import type { EmailOtpType } from "@supabase/supabase-js";

/** Tipos de link por e-mail que o app aceita na confirmação de acesso. */
const EMAIL_LINK_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "signup", "invite"];

export function parseEmailLinkType(raw: string | null | undefined): EmailOtpType | null {
  return EMAIL_LINK_TYPES.find((t) => t === raw) ?? null;
}

const BASE = "http://sentinel.local";

/**
 * Destino depois do login, restrito a caminhos internos do app. Bloqueia redirecionamento
 * para outro site ("//site.com", "/\site.com", "https://site.com", "@site.com").
 */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
