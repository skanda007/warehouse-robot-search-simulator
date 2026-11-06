"use client";

import React from "react";
import { Check, Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, Pill, cx } from "@/components/common/ui";

export function PresetSelector() {
  const presets = useStore((s) => s.presets);
  const presetsError = useStore((s) => s.presetsError);
  const active = useStore((s) => s.activePreset);
  const loading = useStore((s) => s.loadingPreset);
  const modified = useStore((s) => s.modified);
  const loadPreset = useStore((s) => s.loadPreset);

  return (
    <Card
      title="Warehouse Presets"
      subtitle={active ? `Active: ${presets.find((p) => p.id === active)?.name ?? active}${modified ? " (edited)" : ""}` : "Custom warehouse"}
      bodyClassName="p-3"
    >
      {presetsError && <p className="mb-2 rounded-lg bg-[#ff5a63]/15 p-2 text-xs font-semibold text-[#fca5a5]">{presetsError}</p>}
      <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1" data-testid="preset-list">
        {presets.map((p) => {
          const isActive = active === p.id;
          return (
            <li key={p.id}>
              <button
                onClick={() => void loadPreset(p.id)}
                disabled={!!loading}
                data-testid={`preset-${p.id}`}
                aria-pressed={isActive}
                className={cx(
                  "w-full rounded-xl border p-3 text-left transition duration-150 disabled:opacity-60",
                  isActive
                    ? "border-volt bg-raised shadow-md shadow-volt/10"
                    : "border-line bg-surface hover:border-[#38414a] hover:bg-raised",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cx("text-sm font-extrabold", isActive ? "text-volt" : "text-ink")}>{p.name}</span>
                  {loading === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-volt" />
                  ) : (
                    isActive && <Check className="h-3.5 w-3.5 text-volt" />
                  )}
                  <span className="ml-auto font-mono text-xs font-bold text-muted">
                    {p.rows}×{p.cols}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{p.description}</p>
                {!p.reachable && (
                  <Pill tone="bad" className="mt-2 !py-0 !text-[10px]">
                    goal unreachable
                  </Pill>
                )}
              </button>
            </li>
          );
        })}
        {presets.length === 0 && !presetsError && <li className="p-3 text-xs text-muted">Loading presets from engine…</li>}
      </ul>
    </Card>
  );
}
