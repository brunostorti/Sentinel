import { useSyncExternalStore } from "react";

/**
 * Leitura reativa do localStorage para a área do colaborador (rascunhos e protocolos).
 * No servidor não há armazenamento: a primeira renderização usa null e o navegador
 * completa em seguida, sem divergência de hidratação.
 */

const EVENT = "sentinel:local-store";

/** Avisa os componentes desta aba de que o armazenamento mudou. */
export function notifyLocalStore(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Valor atual de uma chave (string), atualizado quando ela muda. */
export function useLocalStorageItem(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => safeGet(key),
    () => null
  );
}

/** Lê várias chaves de uma vez; o resultado é um texto estável (comparável por valor). */
export function useLocalStorageItems(keys: string[], separator = "\u0000"): (string | null)[] {
  const joined = useSyncExternalStore(
    subscribe,
    () => keys.map((k) => safeGet(k) ?? "").join(separator),
    () => null
  );
  return joined === null ? keys.map(() => null) : joined.split(separator).map((v) => v || null);
}
