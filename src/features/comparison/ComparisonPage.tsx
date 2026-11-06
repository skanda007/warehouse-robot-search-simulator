"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lightbulb, RefreshCw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ALGO_COLORS, ALGO_LABELS } from "@/lib/theme";
import { ALGO_IDS, type AlgoId, type ResultCore } from "@/lib/types";
import { Button, Card, EmptyState, PageHeader, Pill, Spinner, Stat, cx } from "@/components/common/ui";
import { WarehouseView, type RouteOverlay } from "@/features/warehouse/WarehouseView";
import { ChartCard, MetricBar, ProgressionLine } from "@/features/analytics/Charts";

function AlgoCard({ id, r, best }: { id: AlgoId; r: ResultCore; best: { moves: number; cost: number; expanded: number } }) {
  const color = ALGO_COLORS[id];
  return (
    <section
      className="rounded-2xl border border-line bg-surface p-6 shadow-xl transition duration-200 hover:-translate-y-1 hover:border-[#38414a]"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
      data-testid={`card-${id}`}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            <h3 className="font-display text-2xl uppercase tracking-tight text-ink">{id}</h3>
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted mt-0.5">{ALGO_LABELS[id]}</div>
        </div>
        <Pill tone={r.success ? "ok" : "bad"} dot>
          {r.success ? "Route found" : "No route"}
        </Pill>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Path Length" value={r.success ? r.path_length : "—"} hint={r.success && r.path_length === best.moves ? "Fewest moves" : "Cell moves"} />
        <Stat label="Total Cost" value={r.success ? r.total_cost : "—"} hint={r.success && r.total_cost === best.cost ? "Lowest cost" : "Sum of cell weights"} />
        <Stat label="Nodes Expanded" value={r.expanded_nodes} hint={r.expanded_nodes === best.expanded ? "Fewest expansions" : undefined} />
        <Stat label="Nodes Generated" value={r.generated_nodes} />
        <Stat label="Peak Frontier" value={r.max_frontier_size} />
        <Stat label="Execution Time" value={`${r.execution_time_ms.toFixed(2)} ms`} hint="Best of 5 runs" />
      </div>
    </section>
  );
}

export function ComparisonPage() {
  const ready = useStore((s) => s.ready);
  const model = useStore((s) => s.model);
  const modelVersion = useStore((s) => s.modelVersion);
  const compare = useStore((s) => s.compare);
  const compareVersion = useStore((s) => s.compareVersion);
  const comparing = useStore((s) => s.comparing);
  const compareError = useStore((s) => s.compareError);
  const runCompare = useStore((s) => s.runCompare);
  const [visible, setVisible] = useState<Record<AlgoId, boolean>>({ BFS: true, DFS: true, UCS: true });

  useEffect(() => {
    if (ready && !comparing && (!compare || compareVersion !== modelVersion) && !compareError) void runCompare();
  }, [ready, compare, compareVersion, modelVersion, comparing, compareError, runCompare]);

  const routes: RouteOverlay[] = useMemo(
    () => (compare ? ALGO_IDS.map((a) => ({ algo: a, path: compare.results[a].path, visible: visible[a] && compare.results[a].success })) : []),
    [compare, visible],
  );

  const best = useMemo(() => {
    if (!compare) return { moves: 0, cost: 0, expanded: 0 };
    const rs = ALGO_IDS.map((a) => compare.results[a]);
    const ok = rs.filter((r) => r.success);
    return {
      moves: ok.length ? Math.min(...ok.map((r) => r.path_length)) : -1,
      cost: ok.length ? Math.min(...ok.map((r) => r.total_cost)) : -1,
      expanded: Math.min(...rs.map((r) => r.expanded_nodes)),
    };
  }, [compare]);

  const bars = (f: (r: ResultCore) => number | null) => ALGO_IDS.map((a) => ({ algorithm: a, value: compare ? f(compare.results[a]) : 0 }));
  const anyRoute = compare ? ALGO_IDS.some((a) => compare.results[a].success) : false;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="EMPIRICAL ALGORITHM BENCHMARK"
        title="ALGORITHM COMPARISON"
        subtitle={`BFS, DFS and Uniform-Cost Search evaluated independently by the authoritative Python search engine on warehouse “${model.name}” (${model.rows}×${model.cols}). Every metric is empirically measured.`}
        actions={
          <Button
            variant="primary"
            icon={<RefreshCw className={cx("h-4 w-4", comparing && "animate-spin")} />}
            disabled={comparing || !ready}
            onClick={() => void runCompare()}
            data-testid="rerun-compare"
          >
            {comparing ? "Evaluating…" : "Re-run Comparison"}
          </Button>
        }
      />
      {compareError && (
        <p className="rounded-xl border border-[#ff5a63]/50 bg-[#ff5a63]/10 p-4 text-xs font-semibold text-[#fca5a5]" role="alert">
          {compareError}
        </p>
      )}
      {!compare ? (
        comparing ? (
          <div className="py-20 text-center"><Spinner label="Evaluating BFS, DFS and UCS on warehouse floor…" /></div>
        ) : (
          <EmptyState title="NO COMPARISON AVAILABLE" text="Load or edit a warehouse in the simulator, then trigger the comparison benchmark." />
        )
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {ALGO_IDS.map((a) => (
              <AlgoCard key={a} id={a} r={compare.results[a]} best={best} />
            ))}
          </div>

          <Card
            title="ROUTE OVERLAY COMPARISON"
            subtitle="All three discovered paths overlaid on the same floor plan. Overlapping segments are offset slightly with white halo indicators."
            bodyClassName="space-y-6"
          >
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Route visibility">
              {ALGO_IDS.map((a) => (
                <label
                  key={a}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-ink transition"
                  style={{
                    borderColor: ALGO_COLORS[a],
                    background: visible[a] ? ALGO_COLORS[a] + "25" : "transparent",
                    opacity: visible[a] ? 1 : 0.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visible[a]}
                    onChange={() => setVisible((v) => ({ ...v, [a]: !v[a] }))}
                    className="h-3.5 w-3.5 accent-[#c8ff2e]"
                    aria-label={`Show ${a} route`}
                  />
                  <span className="inline-block h-1.5 w-4 rounded" style={{ background: ALGO_COLORS[a] }} />
                  {a}
                  {!compare.results[a].success && <span className="text-[10px] font-bold text-[#ff5a63]">(no path)</span>}
                </label>
              ))}
              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted ml-2">
                <span className="inline-block h-2 w-5 rounded bg-white/30" /> Shared Waypoints
              </span>
            </div>
            <WarehouseView model={model} mode="warehouse" routes={routes} maxCell={56} testId="comparison-map" />
            {!anyRoute && <p className="text-xs font-bold text-[#ff5a63]">No algorithm discovered a route — destination is obstructed or unreachable.</p>}
          </Card>

          <Card
            title="EMPIRICAL INTERPRETATION"
            subtitle="Deductions generated from the actual measured search executions"
            icon={<Lightbulb className="h-5 w-5 text-volt" />}
          >
            <ul className="space-y-3 text-sm leading-relaxed text-ink" data-testid="interpretation">
              {compare.interpretation.map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-volt" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <ChartCard title="NODES EXPANDED" subtitle="States popped from frontier and goal-tested">
              <MetricBar data={bars((r) => r.expanded_nodes)} />
            </ChartCard>
            <ChartCard title="NODES GENERATED" subtitle="Distinct states discovered in grid">
              <MetricBar data={bars((r) => r.generated_nodes)} />
            </ChartCard>
            <ChartCard title="PEAK FRONTIER SIZE" subtitle="Maximum simultaneous pending queue/stack/heap entries">
              <MetricBar data={bars((r) => r.max_frontier_size)} />
            </ChartCard>
            <ChartCard title="EXECUTION DURATION" subtitle="Python perf_counter benchmark, best of 5 runs" note="ms">
              <MetricBar data={bars((r) => r.execution_time_ms)} unit=" ms" decimals={3} />
            </ChartCard>
            <ChartCard title="PATH MOVEMENT LENGTH" subtitle="Total cell hops to destination" note={anyRoute ? undefined : "no route"}>
              <MetricBar data={bars((r) => (r.success ? r.path_length : null))} />
            </ChartCard>
            <ChartCard title="ACCUMULATED PATH COST" subtitle="Sum of entered floor cell costs" note={anyRoute ? undefined : "no route"}>
              <MetricBar data={bars((r) => (r.success ? r.total_cost : null))} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="EXPANSION PROGRESSION" subtitle="Cumulative expanded states over search step timeline">
              <ProgressionLine data={compare.progression} field="expanded" label="expanded" />
            </ChartCard>
            <ChartCard title="FRONTIER MEMORY SWELL" subtitle="Active pending frontier entries over search step timeline">
              <ProgressionLine data={compare.progression} field="frontier" label="frontier" />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
