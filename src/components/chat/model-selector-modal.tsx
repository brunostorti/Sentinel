"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
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

export function ModelSelectorModal({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-3-5-sonnet-latest");
  const [customModelName, setCustomModelName] = useState("");
  const [apiKeys, setApiKeys] = useState({ anthropic: "", openai: "", google: "" });
  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (initialFetch && companyId) {
      const fetchSettings = async () => {
        const { data, error } = await supabase
          .from("companies")
          .select("ai_model, ai_api_keys")
          .eq("id", companyId)
          .single();

        if (error) {
          toast.error("Erro ao carregar configurações de IA.");
        } else if (data) {
          if (data.ai_model) {
            const isStandard = AI_MODELS.some(m => m.id === data.ai_model && m.id !== "custom");
            if (isStandard) {
              setSelectedModel(data.ai_model);
            } else {
              setSelectedModel("custom");
              setCustomModelName(data.ai_model);
            }
          }
          if (data.ai_api_keys) {
            setApiKeys(data.ai_api_keys as any);
          }
        }
        setInitialFetch(false);
      };
      fetchSettings();
    }
  }, [open, companyId, initialFetch, supabase]);

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Company ID não fornecido.");
      return;
    }
    
    const finalModel = selectedModel === "custom" ? customModelName : selectedModel;
    if (!finalModel.trim()) {
      toast.error("Nome do modelo inválido.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("companies")
      .update({
        ai_model: finalModel,
        ai_api_keys: apiKeys,
      })
      .eq("id", companyId);

    setLoading(false);

    if (error) {
      toast.error("Erro ao salvar configurações.");
    } else {
      toast.success("Configurações de IA salvas com sucesso!");
      setOpen(false);
    }
  };

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
            
            {(!selectedModelObj || selectedModelObj.provider === "anthropic" || selectedModel === "custom") && (
              <div className="space-y-1">
                <Label htmlFor="anthropic-key" className="text-xs text-muted-foreground">Anthropic API Key (Claude)</Label>
                <Input 
                  id="anthropic-key" 
                  type="password"
                  placeholder="sk-ant-..." 
                  value={apiKeys.anthropic || ""}
                  onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                />
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                  Como obter a chave da Anthropic?
                </a>
              </div>
            )}

            {(!selectedModelObj || selectedModelObj.provider === "openai" || selectedModel === "custom") && (
              <div className="space-y-1">
                <Label htmlFor="openai-key" className="text-xs text-muted-foreground">OpenAI API Key (GPT)</Label>
                <Input 
                  id="openai-key" 
                  type="password"
                  placeholder="sk-proj-..." 
                  value={apiKeys.openai || ""}
                  onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                />
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                  Como obter a chave da OpenAI?
                </a>
              </div>
            )}

            {(!selectedModelObj || selectedModelObj.provider === "google" || selectedModel === "custom") && (
              <div className="space-y-1">
                <Label htmlFor="google-key" className="text-xs text-muted-foreground">Google API Key (Gemini)</Label>
                <Input 
                  id="google-key" 
                  type="password"
                  placeholder="AIza..." 
                  value={apiKeys.google || ""}
                  onChange={(e) => setApiKeys({...apiKeys, google: e.target.value})}
                />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                  Como obter a chave do Google?
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
