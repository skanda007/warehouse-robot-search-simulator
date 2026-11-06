"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Grid3x3, Rocket, Warehouse as WarehouseIcon, ArrowRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { api } from "@/lib/api";
import { ALGO_COLORS } from "@/lib/theme";
import { ALGO_IDS, type AlgoId, type ValidateResponse } from "@/lib/types";
import { toWire, validateModel } from "@/lib/warehouse";
import { Button, Card, Spinner, cx } from "@/components/common/ui";
import { StatusPill } from "@/components/layout/Shell";

const BLURB: Record<AlgoId, { name: string; frontier: string }> = {
  BFS: { name: "Breadth-First Search", frontier: "FIFO queue" },
  DFS: { name: "Depth-First Search", frontier: "LIFO stack" },
  UCS: { name: "Uniform-Cost Search", frontier: "Priority queue" },
};

export function AlgorithmPicker({ compact }: { compact?: boolean }) {
  const algo = useStore((s) => s.algo);
  const setAlgo = useStore((s) => s.setAlgo);
  return (
    <div className={cx("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1")} role="radiogroup" aria-label="Algorithm">
      {ALGO_IDS.map((a) => {
        const active = algo === a;
        return (
          <button
            key={a}
            role="radio"
            aria-checked={active}
            onClick={() => setAlgo(a)}
            data-testid={`algo-${a}`}
            className={cx(
              "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition duration-150",
              active ? "border-volt bg-raised shadow-lg shadow-volt/10" : "border-line bg-surface hover:border-[#38414a]",
            )}
            style={active ? { borderColor: ALGO_COLORS[a] } : undefined}
          >
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: ALGO_COLORS[a] }} />
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-ink">{compact ? a : `${a} · ${BLURB[a].name}`}</span>
              {!compact && <span className="block text-xs font-semibold text-muted uppercase tracking-wider mt-0.5">{BLURB[a].frontier}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function useBackendValidation() {
  const model = useStore((s) => s.model);
  const ready = useStore((s) => s.ready);
  const [state, setState] = useState<ValidateResponse | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setChecking(true);
    const id = window.setTimeout(async () => {
      try {
        const res = await api.validate(toWire(model));
        if (!cancelled) setState(res);
      } catch {
        if (!cancelled) setState(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [model, ready]);
  return { validation: state, checking };
}

export function MissionControl() {
  const algo = useStore((s) => s.algo);
  const running = useStore((s) => s.running);
  const result = useStore((s) => s.result);
  const model = useStore((s) => s.model);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const runSearch = useStore((s) => s.runSearch);
  const searchError = useStore((s) => s.searchError);
  const { validation, checking } = useBackendValidation();
  const local = validateModel(model);
  const errors = local.length ? local : (validation?.errors ?? []);
  const warnings = validation?.warnings ?? [];

  return (
    <Card title="Mission Control" subtitle="Dispatch search engine" icon={<Rocket className="h-5 w-5" />}>
      <AlgorithmPicker />
      <Button
        variant="primary"
        className="mt-4 w-full !py-3 text-sm font-black uppercase tracking-wider"
        icon={<Rocket className="h-4 w-4" />}
        disabled={running || errors.length > 0}
        onClick={() => void runSearch()}
        data-testid="run-search"
      >
        {running ? "Searching…" : `Run ${algo} Search`}
      </Button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusPill />
        {checking && <Spinner label="Validating…" />}
      </div>
      {(errors.length > 0 || searchError) && (
        <ul className="mt-3 space-y-1 rounded-xl border border-[#ff5a63]/50 bg-[#ff5a63]/10 p-3 text-xs font-semibold text-[#fca5a5]" role="alert" data-testid="validation-errors">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
          {searchError && !errors.includes(searchError) && <li>• {searchError}</li>}
        </ul>
      )}
      {errors.length === 0 && warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl border border-[#ffd23e]/50 bg-[#ffd23e]/10 p-3 text-xs font-semibold text-[#fef08a]" data-testid="validation-warnings">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ffd23e]" /> {w}
            </li>
          ))}
        </ul>
      )}
      {result && (
        <div className="mt-4 rounded-xl border border-line bg-raised p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase text-ink">{result.algorithm}</span>
            <span className={result.success ? "text-[#38c982] font-black" : "text-[#ff5a63] font-black"}>
              {result.success ? `${result.path_length} moves · cost ${result.total_cost}` : "no route found"}
            </span>
          </div>
          <div className="text-muted leading-relaxed">
            {result.expanded_nodes} expanded · {result.generated_nodes} generated · max frontier {result.max_frontier_size}
          </div>
          <Link href="/visualization" className="inline-flex items-center gap-1 font-bold text-volt hover:underline pt-1">
            Open in Algorithm Visualization <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      <div className="mt-5 border-t border-line/50 pt-4 flex items-center gap-2" role="group" aria-label="Display mode">
        <span className="text-xs font-extrabold uppercase tracking-wider text-muted">View Mode:</span>
        <Button active={viewMode === "warehouse"} icon={<WarehouseIcon className="h-3.5 w-3.5" />} onClick={() => setViewMode("warehouse")} data-testid="view-warehouse" className="!px-3 !py-1.5 text-xs">
          Warehouse
        </Button>
        <Button active={viewMode === "grid"} icon={<Grid3x3 className="h-3.5 w-3.5" />} onClick={() => setViewMode("grid")} data-testid="view-grid" className="!px-3 !py-1.5 text-xs">
          Grid Debug
        </Button>
      </div>
    </Card>
  );
}
