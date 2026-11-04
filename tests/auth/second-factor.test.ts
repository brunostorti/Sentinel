import { describe, expect, it } from "vitest";
import {
  SECOND_FACTOR_TTL_SECONDS,
  sessionIdFromAccessToken,
  signSecondFactor,
  verifySecondFactor,
} from "@/lib/auth/second-factor";

const base = { userId: "user-1", sessionId: "sess-1", secret: "segredo" };

describe("segundo fator do master", () => {
  it("aceita o cookie assinado para o mesmo usuário e a mesma sessão", async () => {
    const token = await signSecondFactor(base);
    expect(await verifySecondFactor(token, base)).toBe(true);
  });

  it("nega em outro login (sessão diferente) e para outro usuário", async () => {
    const token = await signSecondFactor(base);
    expect(await verifySecondFactor(token, { ...base, sessionId: "sess-2" })).toBe(false);
    expect(await verifySecondFactor(token, { ...base, userId: "user-2" })).toBe(false);
  });

  it("nega com outra chave, cookie adulterado, vazio ou mal formado", async () => {
    const token = await signSecondFactor(base);
    expect(await verifySecondFactor(token, { ...base, secret: "outro" })).toBe(false);
    const last = token.slice(-1);
    expect(await verifySecondFactor(token.slice(0, -1) + (last === "0" ? "1" : "0"), base)).toBe(false);
    expect(await verifySecondFactor(undefined, base)).toBe(false);
    expect(await verifySecondFactor("abc", base)).toBe(false);
    expect(await verifySecondFactor(token, { ...base, secret: "" })).toBe(false);
  });

  it("vence depois do prazo", async () => {
    const now = Date.now();
    const token = await signSecondFactor({ ...base, now });
    const later = now + (SECOND_FACTOR_TTL_SECONDS + 1) * 1000;
    expect(await verifySecondFactor(token, { ...base, now: later })).toBe(false);
    expect(await verifySecondFactor(token, { ...base, now: now + 1000 })).toBe(true);
  });

  it("lê o session_id do JWT", () => {
    const payload = Buffer.from(JSON.stringify({ session_id: "abc-123" })).toString("base64url");
    expect(sessionIdFromAccessToken(`h.${payload}.s`)).toBe("abc-123");
    expect(sessionIdFromAccessToken("lixo")).toBeNull();
    expect(sessionIdFromAccessToken(null)).toBeNull();
  });
});
