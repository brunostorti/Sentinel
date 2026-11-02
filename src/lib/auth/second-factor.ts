/*
 * Segundo fator do Master Admin. Depois de provar o segundo fator (código por e-mail
 * ou app autenticador), o servidor grava um cookie assinado preso ao usuário e à sessão
 * de login atual. Cada novo login cria outra sessão, então o segundo fator é pedido
 * em todo login. Funciona no middleware (Edge) e no servidor: só usa Web Crypto.
 */

export const SECOND_FACTOR_COOKIE = "sentinel_2fa";
export const SECOND_FACTOR_TTL_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();

interface Binding {
  userId: string;
  sessionId: string;
  secret: string;
  now?: number;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Valor do cookie: "<expira em segundos>.<assinatura>". */
export async function signSecondFactor({ userId, sessionId, secret, now = Date.now() }: Binding): Promise<string> {
  const exp = Math.floor(now / 1000) + SECOND_FACTOR_TTL_SECONDS;
  return `${exp}.${await hmacHex(secret, `${userId}.${sessionId}.${exp}`)}`;
}

/** Falha fechado: qualquer dado faltando, adulterado ou vencido nega o acesso. */
export async function verifySecondFactor(
  token: string | undefined | null,
  { userId, sessionId, secret, now = Date.now() }: Binding
): Promise<boolean> {
  if (!token || !userId || !sessionId || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isInteger(exp) || exp <= Math.floor(now / 1000)) return false;
  return safeEqual(parts[1], await hmacHex(secret, `${userId}.${sessionId}.${exp}`));
}

/** `session_id` do JWT do Supabase: muda a cada login e se mantém ao renovar o token. */
export function sessionIdFromAccessToken(token: string | null | undefined): string | null {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const id = JSON.parse(atob(padded)).session_id;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

/** Chave de assinatura (só no servidor). Sem ela, ninguém passa no segundo fator. */
export function secondFactorSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? `sentinel-2fa:${key}` : "";
}
