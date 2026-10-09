"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  KEYED_PROVIDERS,
  PROVIDER_LABELS,
  RECOMMENDED_MODELS,
  modelLabel,
  providerOf,
  type AiPurpose,
  type KeyedProvider,
} from "@/lib/ai/models";

type MaskedKeys = Record<KeyedProvider, string | null>;
type ProviderFlags = Record<KeyedProvider, boolean>;

interface AiSettingsResponse {
  planModel: string | null;
  chatModel: string | null;
  keys: MaskedKeys;
  platformKeys: ProviderFlags;
  canEdit: boolean;
}

const CUSTOM = "__custom__";
const EMPTY_INPUTS: Record<KeyedProvider, string> = { anthropic: "", openai: "", google: "" };
const NO_KEYS: MaskedKeys = { anthropic: null, openai: null, google: null };
const NO_FLAGS: ProviderFlags = { anthropic: false, openai: false, google: false };

const PURPOSE_INFO: Record<AiPurpose, { title: string; hint: string }> = {
  plan: {
    title: "Modelo para gerar planos de ação",
    hint: "Usado poucas vezes (ao encerrar uma pesquisa); vale escolher o mais capaz. Só Claude, GPT ou Gemini.",
  },
  chat: {
    title: "Modelo para o chat do assistente",
    hint: "Usado a cada mensagem; um modelo rápido e barato costuma bastar.",
  },
};

const KEY_FIELDS: Record<KeyedProvider, { placeholder: string; helpUrl: string }> = {
  anthropic: { placeholder: "sk-ant-...", helpUrl: "https://console.anthropic.com/settings/keys" },
  openai: { placeholder: "sk-proj-...", helpUrl: "https://platform.openai.com/api-keys" },
  google: { placeholder: "AIza...", helpUrl: "https://aistudio.google.com/app/apikey" },
};

const isRecommended = (id: string) => RECOMMENDED_MODELS.some((m) => m.id === id);

/**
 * Configuração de IA da empresa (modelo para planos, modelo para chat e chaves).
 * As chaves nunca chegam ao navegador: a rota /api/company/ai-settings devolve só os
 * 4 últimos caracteres. Campo de chave em branco mantém a chave salva.
 */
export function ModelSelectorModal() {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<Record<AiPurpose, string>>({ plan: "", chat: "" });
  const [customMode, setCustomMode] = useState<Record<AiPurpose, boolean>>({ plan: false, chat: false });
  const [keyInputs, setKeyInputs] = useState(EMPTY_INPUTS);
  const [savedKeys, setSavedKeys] = useState<MaskedKeys>(NO_KEYS);
  const [platformKeys, setPlatformKeys] = useState<ProviderFlags>(NO_FLAGS);
  const [keysToRemove, setKeysToRemove] = useState<KeyedProvider[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [remote, setRemote] = useState<{ provider: KeyedProvider; models: string[] } | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  function applySettings(data: AiSettingsResponse) {
    const next = { plan: data.planModel ?? "", chat: data.chatModel ?? "" };
    setModels(next);
    setCustomMode({ plan: !isRecommended(next.plan), chat: !isRecommended(next.chat) });
    setSavedKeys(data.keys);
    setPlatformKeys(data.platformKeys);
    setCanEdit(data.canEdit);
    setKeyInputs(EMPTY_INPUTS);
    setKeysToRemove([]);
  }

  useEffect(() => {
    if (loaded) return;
    (async () => {
      const res = await fetch("/api/company/ai-settings");
      if (res.ok) applySettings(await res.json());
      else toast.error("Erro ao carregar configurações de IA.");
      setLoaded(true);
    })();
  }, [loaded]);

  /** Há chave utilizável para o provedor (salva, digitada agora ou da plataforma)? */
  function hasKey(provider: KeyedProvider): boolean {
    const saved = savedKeys[provider] && !keysToRemove.includes(provider);
    return Boolean(saved || keyInputs[provider].trim() || platformKeys[provider]);
  }

  function status(purpose: AiPurpose, modelId: string): { ok: boolean; text: string } {
    const provider = providerOf(modelId);
    const isPlan = purpose === "plan";
    if (!modelId.trim()) return { ok: false, text: "Escolha um modelo." };
    if (!provider) {
      return {
        ok: false,
        text: isPlan ? "ID não reconhecido: use um modelo de Claude, GPT ou Gemini." : "ID não reconhecido. Vai usar a IA da Mauá.",
      };
    }
    if (provider === "maua") {
      return isPlan
        ? { ok: false, text: "A IA da Mauá é usada só no chat." }
        : { ok: true, text: "Gratuita, sem chave." };
    }
    if (!hasKey(provider)) {
      return {
        ok: false,
        text: isPlan
          ? `Sem chave de ${PROVIDER_LABELS[provider]}: cadastre a chave abaixo para gerar planos.`
          : `Sem chave de ${PROVIDER_LABELS[provider]}. Vai usar a IA da Mauá.`,
      };
    }
    const source = savedKeys[provider] || keyInputs[provider].trim() ? "chave da empresa" : "chave da plataforma (fase de testes)";
    return { ok: true, text: `Usa a ${source}.` };
  }

  async function loadRemote(provider: KeyedProvider) {
    setRemoteLoading(true);
    const res = await fetch(`/api/company/ai-models?provider=${provider}`);
    const body = await res.json().catch(() => null);
    setRemoteLoading(false);
    if (!res.ok) {
      toast.error(body?.error ?? "Não foi possível listar os modelos.");
      return;
    }
    setRemote({ provider, models: (body.models as { id: string }[]).map((m) => m.id) });
  }

  async function handleSave() {
    for (const purpose of ["plan", "chat"] as AiPurpose[]) {
      if (!models[purpose].trim()) {
        toast.error(`Escolha o ${PURPOSE_INFO[purpose].title.toLowerCase()}.`);
        return;
      }
    }

    const keys: Partial<Record<KeyedProvider, string | null>> = {};
    for (const p of keysToRemove) keys[p] = null;
    for (const p of KEYED_PROVIDERS) {
      if (keyInputs[p].trim()) keys[p] = keyInputs[p].trim();
    }

    setLoading(true);
    const res = await fetch("/api/company/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planModel: models.plan.trim(), chatModel: models.chat.trim(), keys }),
    });
    setLoading(false);

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(body?.error ?? "Erro ao salvar configurações.");
      return;
    }
    applySettings(body);
    toast.success("Configurações de IA salvas.");
    setOpen(false);
  }

  function modelPicker(purpose: AiPurpose) {
    const value = models[purpose];
    const st = status(purpose, value);
    // Planos só com provedores externos; a Mauá aparece apenas no chat.
    const providers = purpose === "plan" ? KEYED_PROVIDERS : (["maua", ...KEYED_PROVIDERS] as const);
    return (
      <div className="space-y-2" key={purpose}>
        <Label>{PURPOSE_INFO[purpose].title}</Label>
        <p className="text-[11px] text-muted-foreground">{PURPOSE_INFO[purpose].hint}</p>
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
          disabled={!canEdit}
          value={customMode[purpose] ? CUSTOM : value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM) {
              setCustomMode({ ...customMode, [purpose]: true });
            } else {
              setCustomMode({ ...customMode, [purpose]: false });
              setModels({ ...models, [purpose]: v });
            }
          }}
        >
          {providers.map((provider) => (
            <optgroup key={provider} label={PROVIDER_LABELS[provider]}>
              {RECOMMENDED_MODELS.filter((m) => m.provider === provider).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.tier === "qualidade" ? " · melhor qualidade" : m.tier === "economico" ? " · econômico" : ""}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>Outro modelo (digitar o ID)…</option>
        </select>

        {customMode[purpose] && (
          <Input
            placeholder="Ex.: gpt-6.1-sol, gemini-3.8-flash, claude-sonnet-5-5"
            disabled={!canEdit}
            value={value}
            list="ai-remote-models"
            onChange={(e) => setModels({ ...models, [purpose]: e.target.value })}
          />
        )}

        <p className={`flex items-center gap-1.5 text-[11px] ${st.ok ? "text-emerald-600" : "text-amber-600"}`}>
          {st.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {st.text}
        </p>
      </div>
    );
  }

  function keyField(provider: KeyedProvider) {
    const saved = keysToRemove.includes(provider) ? null : savedKeys[provider];
    const field = KEY_FIELDS[provider];
    return (
      <div className="space-y-1" key={provider}>
        <Label htmlFor={`${provider}-key`} className="text-xs text-muted-foreground">
          {PROVIDER_LABELS[provider]}
          {platformKeys[provider] && !saved && " · chave da plataforma disponível (fase de testes)"}
        </Label>
        <Input
          id={`${provider}-key`}
          type="password"
          autoComplete="off"
          disabled={!canEdit}
          placeholder={saved ? `Chave salva (${saved}). Deixe em branco para manter` : field.placeholder}
          value={keyInputs[provider]}
          onChange={(e) => setKeyInputs({ ...keyInputs, [provider]: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <a href={field.helpUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
            Como obter a chave?
          </a>
          {canEdit && hasKey(provider) && (
            <button
              type="button"
              className="text-[10px] text-primary hover:underline disabled:opacity-50"
              disabled={remoteLoading}
              onClick={() => loadRemote(provider)}
            >
              Ver modelos disponíveis
            </button>
          )}
          {canEdit && saved && (
            <button
              type="button"
              className="text-[10px] text-destructive hover:underline"
              onClick={() => setKeysToRemove([...keysToRemove, provider])}
            >
              Remover chave salva
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2 text-xs border-dashed" onClick={() => setOpen(true)}>
        <Settings className="w-3.5 h-3.5" />
        <span className="font-semibold text-primary">Modelos de IA:</span>
        {loaded ? `Planos ${modelLabel(models.plan)} · Chat ${modelLabel(models.chat)}` : "Carregando..."}
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Configurações de IA</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {modelPicker("plan")}
          {modelPicker("chat")}

          <p className="text-xs text-muted-foreground">
            No chat, sem chave do provedor escolhido, o Sentinel usa a IA da Mauá. Os planos usam
            sempre o provedor escolhido, então é preciso ter a chave dele.{" "}
            <Link href="/sobre/modelos-ia" className="text-primary underline" onClick={() => setOpen(false)}>
              Compare os modelos
            </Link>
          </p>

          <div className="space-y-4 border-t pt-4">
            <Label>Chaves de API da empresa</Label>
            {KEYED_PROVIDERS.map((p) => keyField(p))}
            <p className="text-[11px] text-muted-foreground">
              As chaves são testadas no provedor antes de salvar e nunca são exibidas por inteiro.
            </p>
          </div>

          {remote && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold">
                Modelos disponíveis em {PROVIDER_LABELS[remote.provider]} ({remote.models.length})
              </p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Escolha &quot;Outro modelo&quot; acima e digite ou selecione um destes IDs.
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {remote.models.map((id) => (
                  <code key={id} className="rounded bg-background px-1.5 py-0.5 text-[10px]">{id}</code>
                ))}
              </div>
              <datalist id="ai-remote-models">
                {remote.models.map((id) => <option key={id} value={id} />)}
              </datalist>
            </div>
          )}

          {!canEdit && loaded && (
            <p className="text-xs text-muted-foreground">
              Apenas RH e Admin podem alterar os modelos e as chaves de IA.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !canEdit}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
