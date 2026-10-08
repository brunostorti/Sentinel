"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AI_MODELS = [
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Excelente equilíbrio entre velocidade e inteligência. Recomendado para a maioria das tarefas.",
    tokenUsage: "Moderado",
    recommended: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Modelo de altíssima capacidade da OpenAI. Ótimo para raciocínio complexo, porém com custo maior.",
    tokenUsage: "Alto",
    recommended: false,
  },
  {
    id: "gemini-1.5-pro-latest",
    name: "Gemini 1.5 Pro",
    provider: "google",
    description: "Excelente para contextos longos. Boa alternativa para processamento de muitos dados.",
    tokenUsage: "Moderado",
    recommended: false,
  },
  {
    id: "custom",
    name: "Personalizado",
    provider: "custom",
    description: "Insira o nome de um modelo compatível e a respectiva chave de API.",
    tokenUsage: "Variável",
    recommended: false,
  },
  {
    id: "maua",
    name: "Mauá Local AI",
    provider: "maua",
    description: "Servidor local e privado (On-Premise). Sem envio externo de dados.",
    tokenUsage: "Baixo",
    recommended: false,
  },
];

type Provider = "anthropic" | "openai" | "google";
type MaskedKeys = Record<Provider, string | null>;

const EMPTY_INPUTS: Record<Provider, string> = { anthropic: "", openai: "", google: "" };
const NO_SAVED_KEYS: MaskedKeys = { anthropic: null, openai: null, google: null };

/**
 * As chaves nunca chegam ao navegador: a rota /api/company/ai-settings devolve só os
 * 4 últimos caracteres. Campo em branco mantém a chave salva.
 */
export function ModelSelectorModal() {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-3-5-sonnet-latest");
  const [customModelName, setCustomModelName] = useState("");
  const [keyInputs, setKeyInputs] = useState(EMPTY_INPUTS);
  const [savedKeys, setSavedKeys] = useState<MaskedKeys>(NO_SAVED_KEYS);
  const [keysToRemove, setKeysToRemove] = useState<Provider[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(true);

  function applySettings(data: { model: string | null; keys: MaskedKeys; canEdit: boolean }) {
    if (data.model) {
      const isStandard = AI_MODELS.some((m) => m.id === data.model && m.id !== "custom");
      if (isStandard) {
        setSelectedModel(data.model);
      } else {
        setSelectedModel("custom");
        setCustomModelName(data.model);
      }
    }
    setSavedKeys(data.keys);
    setCanEdit(data.canEdit);
    setKeyInputs(EMPTY_INPUTS);
    setKeysToRemove([]);
  }

  useEffect(() => {
    if (!initialFetch) return;
    const fetchSettings = async () => {
      const res = await fetch("/api/company/ai-settings");
      if (res.ok) {
        applySettings(await res.json());
      } else {
        toast.error("Erro ao carregar configurações de IA.");
      }
      setInitialFetch(false);
    };
    fetchSettings();
  }, [initialFetch]);

  const handleSave = async () => {
    const finalModel = selectedModel === "custom" ? customModelName : selectedModel;
    if (!finalModel.trim()) {
      toast.error("Nome do modelo inválido.");
      return;
    }

    const keys: Partial<Record<Provider, string | null>> = {};
    for (const p of keysToRemove) keys[p] = null;
    for (const [p, value] of Object.entries(keyInputs) as [Provider, string][]) {
      if (value.trim()) keys[p] = value.trim();
    }

    setLoading(true);
    const res = await fetch("/api/company/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: finalModel, keys }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Erro ao salvar configurações.");
    } else {
      applySettings(await res.json());
      toast.success("Configurações de IA salvas com sucesso!");
      setOpen(false);
    }
  };

  function keyField(provider: Provider, label: string, placeholder: string, helpUrl: string, helpText: string) {
    const saved = keysToRemove.includes(provider) ? null : savedKeys[provider];
    return (
      <div className="space-y-1">
        <Label htmlFor={`${provider}-key`} className="text-xs text-muted-foreground">{label}</Label>
        <Input
          id={`${provider}-key`}
          type="password"
          autoComplete="off"
          disabled={!canEdit}
          placeholder={saved ? `Chave salva (${saved}). Deixe em branco para manter` : placeholder}
          value={keyInputs[provider]}
          onChange={(e) => setKeyInputs({ ...keyInputs, [provider]: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <a href={helpUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
            {helpText}
          </a>
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

  const selectedModelObj = AI_MODELS.find((m) => m.id === selectedModel);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2 text-xs border-dashed" onClick={() => setOpen(true)}>
        <Settings className="w-3.5 h-3.5" />
        <span className="font-semibold text-primary">Modelo da IA:</span> 
        {selectedModel === "custom" ? customModelName || "Personalizado" : selectedModelObj?.name || "Carregando..."}
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurações de IA (Modelos e Chaves)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <Label>Escolha o modelo de Inteligência Artificial</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AI_MODELS.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "relative flex flex-col gap-1 rounded-lg border p-4 cursor-pointer transition-colors",
                    selectedModel === model.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{model.name}</span>
                    {model.recommended && (
                      <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
                    )}
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 cursor-help">
                          <Info className="w-3 h-3" />
                          Uso de tokens: <span className="font-medium">{model.tokenUsage}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>{model.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </div>

          {selectedModel === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-model">Identificador do Modelo</Label>
              <Input 
                id="custom-model" 
                placeholder="Ex: gpt-4-turbo, open-mistral-7b" 
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Insira o ID exato fornecido pelo seu provedor.
              </p>
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <Label>Chaves de API (Insira a correspondente ao provedor do modelo escolhido)</Label>
            
            {(!selectedModelObj || selectedModelObj.provider === "anthropic" || selectedModel === "custom") &&
              keyField("anthropic", "Anthropic API Key (Claude)", "sk-ant-...", "https://console.anthropic.com/settings/keys", "Como obter a chave da Anthropic?")}

            {(!selectedModelObj || selectedModelObj.provider === "openai" || selectedModel === "custom") &&
              keyField("openai", "OpenAI API Key (GPT)", "sk-proj-...", "https://platform.openai.com/api-keys", "Como obter a chave da OpenAI?")}

            {(!selectedModelObj || selectedModelObj.provider === "google" || selectedModel === "custom") &&
              keyField("google", "Google API Key (Gemini)", "AIza...", "https://aistudio.google.com/app/apikey", "Como obter a chave do Google?")}

            {!canEdit && (
              <p className="text-xs text-muted-foreground">
                Apenas RH e Admin podem alterar o modelo e as chaves de IA.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !canEdit}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
