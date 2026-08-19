"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";

interface CycleTab {
  id: string;
  label: string;
  icon: string;
  content: ReactNode;
}

export function CycleTabs({ tabs }: { tabs: CycleTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
              active === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div key={tab.id} className={active === tab.id ? "block" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
