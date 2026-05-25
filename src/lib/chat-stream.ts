/**
 * Cliente helper para consumir SSE de /api/chat/send com fallback síncrono.
 *
 * Uso:
 *   await sendChatStream(
 *     { kind: "company", content: "..." },
 *     { onDelta: (text) => ..., onDone: (full) => ..., onError: (msg) => ... }
 *   );
 */

export interface ChatSendBody {
  kind: "plan" | "company";
  resource_id?: string | null;
  content: string;
}

export interface ChatStreamCallbacks {
  onDelta: (chunk: string) => void;
  onDone: (full: string) => void;
  onError: (msg: string) => void;
}

export async function sendChatStream(
  body: ChatSendBody,
  cbs: ChatStreamCallbacks
): Promise<void> {
  const res = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    cbs.onError((data.error as string) ?? "Falha ao consultar IA.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE: linhas separadas por \n\n, prefixo "data: "
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const evt of events) {
        const line = evt.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const payload = line.slice(6);
        try {
          const parsed = JSON.parse(payload) as {
            delta?: string;
            done?: boolean;
            error?: string;
          };
          if (parsed.error) {
            cbs.onError(parsed.error);
            return;
          }
          if (parsed.delta) {
            full += parsed.delta;
            cbs.onDelta(parsed.delta);
          }
          if (parsed.done) {
            cbs.onDone(full);
            return;
          }
        } catch {
          // ignora payloads malformados
        }
      }
    }
    cbs.onDone(full);
  } catch (err) {
    cbs.onError(err instanceof Error ? err.message : "Erro de leitura.");
  }
}
