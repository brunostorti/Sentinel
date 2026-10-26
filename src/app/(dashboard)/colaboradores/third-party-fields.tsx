"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";

interface ThirdPartyFieldsProps {
  isThirdParty: boolean;
  company: string;
  onThirdPartyChange: (value: boolean) => void;
  onCompanyChange: (value: string) => void;
}

/** Marcação de colaborador terceirizado + empresa prestadora (opcional). */
export function ThirdPartyFields({
  isThirdParty,
  company,
  onThirdPartyChange,
  onCompanyChange,
}: ThirdPartyFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={isThirdParty}
          onChange={(e) => onThirdPartyChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon name="badge" size={16} className="text-amber-600" />
            Colaborador terceirizado
          </span>
          <span className="block text-xs text-muted-foreground">
            Presta serviço à empresa por meio de outra empresa.
          </span>
        </span>
      </label>

      {isThirdParty && (
        <div className="space-y-1.5">
          <Label
            htmlFor="third-party-company"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Empresa prestadora
            <span className="ml-1 font-normal normal-case text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="third-party-company"
            placeholder="Ex.: Limpa Bem Serviços Ltda."
            value={company}
            onChange={(e) => onCompanyChange(e.target.value)}
            maxLength={120}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

/** Etiqueta "Terceiro" exibida na lista de colaboradores. */
export function ThirdPartyBadge({ company }: { company: string | null }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"
      title={company ? `Terceiro · ${company}` : "Terceiro"}
    >
      <Icon name="badge" size={12} />
      <span className="truncate">Terceiro{company ? ` · ${company}` : ""}</span>
    </span>
  );
}
