"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { findSimilarCompany, matchCompanies } from "@/lib/third-party/company-names";

interface ThirdPartyFieldsProps {
  isThirdParty: boolean;
  company: string;
  onThirdPartyChange: (value: boolean) => void;
  onCompanyChange: (value: string) => void;
  /** Empresas prestadoras já cadastradas, para o autocomplete. */
  knownCompanies: string[];
}

/** Marcação de colaborador terceirizado + empresa prestadora (opcional). */
export function ThirdPartyFields({
  isThirdParty,
  company,
  onThirdPartyChange,
  onCompanyChange,
  knownCompanies,
}: ThirdPartyFieldsProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const suggestions = matchCompanies(company, knownCompanies);
  const similar = findSimilarCompany(company, knownCompanies);
  const showList = open && suggestions.length > 0;

  function choose(name: string) {
    onCompanyChange(name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[highlight] ?? suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

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
          <div className="relative">
            <Input
              id="third-party-company"
              placeholder="Ex.: Limpa Bem Serviços Ltda."
              value={company}
              onChange={(e) => {
                onCompanyChange(e.target.value);
                setOpen(true);
                setHighlight(0);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={handleKeyDown}
              maxLength={120}
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls="third-party-company-list"
              aria-autocomplete="list"
              className="rounded-lg"
            />
            {showList && (
              <ul
                id="third-party-company-list"
                role="listbox"
                className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
              >
                {suggestions.map((name, i) => (
                  <li key={name} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      // onMouseDown: escolhe antes do blur do campo fechar a lista.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        choose(name);
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
                        i === highlight ? "bg-accent text-foreground" : "text-foreground/85"
                      )}
                    >
                      <Icon name="domain" size={14} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {similar && !showList && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <Icon name="lightbulb" size={14} className="shrink-0" />
              <span>
                Já existe <strong>{similar}</strong>. É a mesma empresa?
              </span>
              <button
                type="button"
                onClick={() => choose(similar)}
                className="font-bold text-primary hover:underline"
              >
                Usar este nome
              </button>
            </div>
          )}
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
