"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type {
  CompanyProfile,
  CultureType,
  DecisionSpeed,
  PredominantRoleType,
  BudgetHorizon,
  BudgetFlexibility,
} from "@/lib/ai/profile/schema";
import type { PreFillSuggestion } from "@/lib/ai/profile/pre-fill";

type Tab = "company" | "budget" | "hr" | "people" | "constraints";
type ReviewKey = "regions" | "constraints" | "preferred_modalities" | "workforce_composition";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const WORK_REGIME_LABELS: Record<string, string> = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

export interface CompanyBasics {
  id: string;
  name: string;
  cnpj: string | null;
  industry: string | null;
  employee_count: number | null;
  work_regime: string | null;
}

export function ProfileForm({
  initialProfile,
  initialCompany,
}: {
  initialProfile: CompanyProfile;
  initialCompany: CompanyBasics;
}) {
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile);
  const [company, setCompany] = useState<CompanyBasics>(initialCompany);
  const [tab, setTab] = useState<Tab>("company");
  const [touched, setTouched] = useState<Set<ReviewKey>>(new Set());
  const [suggestion, setSuggestion] = useState<PreFillSuggestion | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setSuggesting] = useState(false);

  function patch<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function patchCompany<K extends keyof CompanyBasics>(key: K, value: CompanyBasics[K]) {
    setCompany((c) => ({ ...c, [key]: value }));
  }

  function touchReview(key: ReviewKey) {
    setTouched((s) => new Set(s).add(key));
  }

  async function handleSuggest() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/profile/suggest-values", { method: "POST" });
      const data = (await res.json()) as { suggestion?: PreFillSuggestion; error?: string };
      if (!res.ok || !data.suggestion) {
        toast.error(data.error ?? "Não foi possível obter sugestão.");
        return;
      }
      setSuggestion(data.suggestion);
      toast.success("Sugestões aplicadas. Revise e ajuste.");
      // Aplica todas as sugestões no estado local (sem salvar — HR clica salvar depois)
      const s = data.suggestion;
      setProfile((p) => ({
        ...p,
        has_dedicated_hr: s.has_dedicated_hr ?? p.has_dedicated_hr,
        decision_speed: s.decision_speed ?? p.decision_speed,
        culture_type: s.culture_type ?? p.culture_type,
        predominant_role_type: s.predominant_role_type ?? p.predominant_role_type,
        has_remote: s.has_remote ?? p.has_remote,
        has_shift_workers: s.has_shift_workers ?? p.has_shift_workers,
        has_unionized_workers: s.has_unionized_workers ?? p.has_unionized_workers,
        regions: s.regions ?? p.regions,
        budget_horizon: s.budget_horizon ?? p.budget_horizon,
        budget_flexibility: s.budget_flexibility ?? p.budget_flexibility,
      }));
    } finally {
      setSuggesting(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          touchedReviewFields: Array.from(touched),
          company: {
            name: company.name,
            industry: company.industry,
            employee_count: company.employee_count,
            work_regime: company.work_regime,
          },
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; setup_completeness?: number };
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Falha ao salvar.");
        return;
      }
      toast.success(`Perfil salvo. Completude: ${data.setup_completeness}%`);
      if (data.setup_completeness !== undefined) {
        patch("setup_completeness", data.setup_completeness);
      }
      setTouched(new Set());
    });
  }

  const completeness = profile.setup_completeness;

  return (
    <div className="space-y-4">
      {/* Header com completeness + sugerir valores */}
      <Card className="flex items-center justify-between p-4">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Perfil
          </p>
          <p className="text-lg font-black">{completeness}% completo</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleSuggest}
          disabled={isSuggesting}
        >
          {isSuggesting ? "Pensando..." : "🪄 Sugerir valores"}
        </Button>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {([
          ["company", "Empresa"],
          ["budget", "Orçamento"],
          ["hr", "Estrutura RH"],
          ["people", "Colaboradores e Região"],
          ["constraints", "Restrições"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-card shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card className="p-6">
        {tab === "company" && (
          <div className="space-y-4">
            <div>
              <Label>Nome da empresa</Label>
              <Input
                value={company.name}
                onChange={(e) => patchCompany("name", e.target.value)}
              />
            </div>
            {company.cnpj && (
              <div>
                <Label>CNPJ (não editável)</Label>
                <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {company.cnpj}
                </p>
              </div>
            )}
            <div>
              <Label>Setor</Label>
              <Input
                placeholder="ex: Tecnologia, Saúde, Educação"
                value={company.industry ?? ""}
                onChange={(e) =>
                  patchCompany("industry", e.target.value || null)
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Número de colaboradores</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="ex: 150"
                  value={company.employee_count ?? ""}
                  onChange={(e) =>
                    patchCompany(
                      "employee_count",
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )
                  }
                />
              </div>
              <div>
                <Label>Regime de trabalho</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  value={company.work_regime ?? ""}
                  onChange={(e) =>
                    patchCompany("work_regime", e.target.value || null)
                  }
                >
                  <option value="">Selecione...</option>
                  {Object.entries(WORK_REGIME_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Esses dados básicos alimentam o pipeline de IA junto com as
              outras abas. Setor, porte e regime são usados pra calibrar
              fornecedores e intervenções.
            </p>
          </div>
        )}

        {tab === "budget" && (
          <div className="space-y-4">
            <div>
              <Label>Orçamento anual para saúde/bem-estar (R$)</Label>
              <Input
                type="number"
                value={profile.annual_budget_brl ?? ""}
                onChange={(e) =>
                  patch("annual_budget_brl", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="ex: 120000"
              />
              {suggestion?.budget_horizon && (
                <Badge variant="secondary" className="mt-1">sugerido pela IA</Badge>
              )}
            </div>
            <div>
              <Label>Horizonte do orçamento</Label>
              <RadioRow
                value={profile.budget_horizon}
                onChange={(v) => patch("budget_horizon", v as BudgetHorizon)}
                options={[
                  ["ano_corrente", "Ano corrente"],
                  ["12_meses", "Próximos 12 meses"],
                  ["bienio", "Biênio"],
                ]}
              />
            </div>
            <div>
              <Label>Flexibilidade</Label>
              <RadioRow
                value={profile.budget_flexibility}
                onChange={(v) => patch("budget_flexibility", v as BudgetFlexibility)}
                options={[
                  ["rigid", "Rígido"],
                  ["flexible", "Flexível"],
                  ["unlocked_for_critical", "Liberado para crítico"],
                ]}
              />
            </div>
            <div>
              <Label>Gasto atual em iniciativas existentes (R$)</Label>
              <Input
                type="number"
                value={profile.existing_wellbeing_spend_brl ?? ""}
                onChange={(e) =>
                  patch(
                    "existing_wellbeing_spend_brl",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              />
            </div>
          </div>
        )}

        {tab === "hr" && (
          <div className="space-y-4">
            <CheckboxRow
              label="RH dedicado?"
              checked={profile.has_dedicated_hr}
              onChange={(v) => patch("has_dedicated_hr", v)}
            />
            <div>
              <Label>Tamanho da equipe RH</Label>
              <Input
                type="number"
                value={profile.hr_team_size ?? ""}
                onChange={(e) =>
                  patch("hr_team_size", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <CheckboxRow
              label="Tem T&D interno?"
              checked={profile.has_internal_training}
              onChange={(v) => patch("has_internal_training", v)}
            />
            <CheckboxRow
              label="Saúde ocupacional in-house?"
              checked={profile.has_occupational_health}
              onChange={(v) => patch("has_occupational_health", v)}
            />
            <CheckboxRow
              label="Compliance/jurídico próprio?"
              checked={profile.has_compliance_officer}
              onChange={(v) => patch("has_compliance_officer", v)}
            />
            <div>
              <Label>Velocidade de decisão</Label>
              <RadioRow
                value={profile.decision_speed}
                onChange={(v) => patch("decision_speed", v as DecisionSpeed)}
                options={[
                  ["fast", "Rápida (startup-like)"],
                  ["normal", "Normal"],
                  ["slow", "Lenta (comitês, conselho)"],
                ]}
              />
            </div>
            <div>
              <Label>Tipo de cultura</Label>
              <RadioRow
                value={profile.culture_type}
                onChange={(v) => patch("culture_type", v as CultureType)}
                options={[
                  ["startup", "Startup"],
                  ["family", "Familiar"],
                  ["corporate", "Corporativa"],
                  ["public", "Pública"],
                  ["multinational", "Multinacional"],
                  ["other", "Outra"],
                ]}
              />
            </div>
          </div>
        )}

        {tab === "people" && (
          <div className="space-y-4">
            <div>
              <Label>Tipo predominante de função</Label>
              <RadioRow
                value={profile.predominant_role_type}
                onChange={(v) => patch("predominant_role_type", v as PredominantRoleType)}
                options={[
                  ["office", "Escritório"],
                  ["industrial", "Industrial"],
                  ["field", "Campo"],
                  ["mixed", "Misto"],
                  ["remote", "Remoto"],
                ]}
              />
            </div>
            <CheckboxRow
              label="Tem trabalho remoto?"
              checked={profile.has_remote}
              onChange={(v) => patch("has_remote", v)}
            />
            <CheckboxRow
              label="Tem turnos/escala?"
              checked={profile.has_shift_workers}
              onChange={(v) => patch("has_shift_workers", v)}
            />
            <CheckboxRow
              label="Tem sindicalização forte?"
              checked={profile.has_unionized_workers}
              onChange={(v) => patch("has_unionized_workers", v)}
            />
            <div>
              <Label>UFs onde opera</Label>
              <div className="flex flex-wrap gap-2 pt-2">
                {UFS.map((uf) => {
                  const sel = profile.regions?.includes(uf);
                  return (
                    <button
                      key={uf}
                      type="button"
                      onClick={() => {
                        const set = new Set(profile.regions ?? []);
                        if (set.has(uf)) set.delete(uf);
                        else set.add(uf);
                        patch("regions", Array.from(set));
                        touchReview("regions");
                      }}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        sel ? "bg-primary text-primary-foreground" : "bg-card"
                      }`}
                    >
                      {uf}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "constraints" && (
          <div className="space-y-4">
            <TagInput
              label="Restrições declaradas"
              placeholder='ex: "não terceirizar", "sem dados sensíveis"'
              value={profile.constraints}
              onChange={(arr) => {
                patch("constraints", arr);
                touchReview("constraints");
              }}
            />
            <TagInput
              label="Modalidades preferidas"
              placeholder="ex: presencial, online, híbrido"
              value={profile.preferred_modalities}
              onChange={(arr) => {
                patch("preferred_modalities", arr);
                touchReview("preferred_modalities");
              }}
            />
            <TagInput
              label="Modalidades a evitar"
              placeholder="ex: app extra, presencial obrigatório"
              value={profile.avoid_modalities}
              onChange={(arr) => patch("avoid_modalities", arr)}
            />
            <TagInput
              label="Valores declarados"
              placeholder='ex: "transparência", "inovação"'
              value={profile.declared_values}
              onChange={(arr) => patch("declared_values", arr)}
            />
          </div>
        )}
      </Card>

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          Mudanças nunca aplicam até você salvar.
        </p>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function RadioRow<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {options.map(([v, label]) => {
        const sel = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              sel ? "border-primary bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Checkbox
        checked={checked ?? false}
        onCheckedChange={(v: boolean | "indeterminate") =>
          onChange(v === true)
        }
      />
      <span>{label}</span>
    </label>
  );
}

function TagInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string[] | null;
  onChange: (arr: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const tags = value ?? [];

  function addTag() {
    const v = input.trim();
    if (!v) return;
    onChange([...tags, v]);
    setInput("");
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 pt-2">
        {tags.map((t, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
          >
            {t} ×
          </Badge>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addTag}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
