"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FlaskConical, Play } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { fromWire } from "@/lib/warehouse";
import { ALGO_IDS, type AlgoId, type ExperimentDef, type ExperimentRun } from "@/lib/types";
import { Button, Card, PageHeader, Pill, Spinner, cx } from "@/components/common/ui";
import { WarehouseView, type RouteOverlay } from "@/features/warehouse/WarehouseView";
import { AlgoLegend, ChartCard, MetricBar, SizeLines } from "./Charts";

const COST_PRESETS: Record<string, { label: string; dist: Record<string, number> }> = {
  uniform: { label: "Uniform (all cost 1)", dist: { "1": 1 } },
  mixed: { label: "Mixed (1, 2, 3, 5)", dist: { "1": 5, "2": 2, "3": 2, "5": 1 } },
  heavy: { label: "Heavy (1, 3, 5, 8)", dist: { "1": 3, "3": 2, "5": 2, "8": 1 } },
};

const METRICS: { key: string; label: string; decimals: number }[] = [
  { key: "expanded_nodes", label: "Nodes expanded", decimals: 1 },
  { key: "generated_nodes", label: "Nodes generated", decimals: 1 },
  { key: "max_frontier_size", label: "Max frontier size", decimals: 1 },
  { key: "execution_time_ms", label: "Execution time (ms)", decimals: 3 },
  { key: "path_length", label: "Path length (moves)", decimals: 2 },
  { key: "total_cost", label: "Total cost", decimals: 2 },
  { key: "cost_gap_vs_ucs", label: "Cost gap vs UCS", decimals: 2 },
];

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const fmt = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? "—" : Number(v).toFixed(d));

function distKey(d: Record<string, number>) {
  const hit = Object.entries(COST_PRESETS).find(([, p]) => JSON.stringify(p.dist) === JSON.stringify(d));
  return hit ? hit[0] : "mixed";
}

export function ExperimentsPage() {
  const [defs, setDefs] = useState<ExperimentDef[]>([]);
  const [selected, setSelected] = useState<string>("sparse");
  const [trials, setTrials] = useState(20);
  const [rows, setRows] = useState(16);
  const [cols, setCols] = useState(16);
  const [density, setDensity] = useState(0.08);
  const [seed, setSeed] = useState(42);
  const [costKey, setCostKey] = useState("uniform");
  const [sizesText, setSizesText] = useState("8x8, 16x16, 24x24, 32x32");
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState("expanded_nodes");

  const def = defs.find((d) => d.id === selected);

  const execute = useCallback(
    async (id: string, cfg: { trials: number; rows: number; cols: number; density: number; seed: number; costKey: string; sizesText: string }) => {
      setBusy(true);
      setError(null);
      try {
        const sizes =
          id === "grid_sizes"
            ? cfg.sizesText
                .split(/[,;]/)
                .map((s) => s.trim().toLowerCase().split("x").map(Number))
                .filter((p) => p.length === 2)
            : undefined;
        const res = await api.runExperiment({
          experiment_id: id,
          trials: cfg.trials,
          rows: cfg.rows,
          cols: cfg.cols,
          density: cfg.density,
          seed: cfg.seed,
          cost_distribution: COST_PRESETS[cfg.costKey].dist,
          ...(sizes ? { sizes: sizes as [number, number][] } : {}),
        });
        setRun(res);
      } catch (e) {
        setError(e instanceof ApiClientError ? [e.message, ...e.details].join(" · ") : "Experiment failed.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const choose = useCallback(
    (d: ExperimentDef) => {
      setSelected(d.id);
      const k = distKey(d.defaults.cost_distribution);
      setTrials(d.defaults.trials);
      setRows(d.defaults.rows);
      setCols(d.defaults.cols);
      setDensity(d.defaults.density);
      setSeed(d.defaults.seed);
      setCostKey(k);
      const st = d.defaults.sizes ? d.defaults.sizes.map(([r, c]) => `${r}x${c}`).join(", ") : sizesText;
      setSizesText(st);
      void execute(d.id, { trials: d.defaults.trials, rows: d.defaults.rows, cols: d.defaults.cols, density: d.defaults.density, seed: d.defaults.seed, costKey: k, sizesText: st });
    },
    [execute, sizesText],
  );

  useEffect(() => {
    api
      .experimentDefs()
      .then((d) => {
        setDefs(d);
        choose(d[0]);
      })
      .catch(() => setError("Could not load experiment definitions from the engine."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sizes = run ? Array.from(new Set(run.summary.map((s) => s.size))) : [];
  const metricInfo = METRICS.find((m) => m.key === metric)!;
  const valueOf = (size: string, algo: AlgoId) => run?.summary.find((s) => s.size === size && s.algorithm === algo)?.metrics[metric]?.mean ?? null;
  const lineRows = sizes.map((size) => ({ size, ...Object.fromEntries(ALGO_IDS.map((a) => [a, valueOf(size, a)])) })) as Record<string, number | string | null>[];

  const sample = useMemo(() => {
    if (!run?.sample) return null;
    const routes: RouteOverlay[] = ALGO_IDS.map((a) => ({ algo: a, path: run.sample!.paths[a], visible: run.sample!.paths[a].length > 1 }));
    return { model: fromWire(run.sample.warehouse), routes, label: run.sample.label };
  }, [run]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="EMPIRICAL SYNTHETIC EVALUATION"
        title="EXPERIMENTAL ANALYSIS"
        subtitle="Repeatable statistical experiments evaluated on procedurally generated synthetic warehouse grids. Every trial presents the identical environment to BFS, DFS and UCS, with results computed straight from the Python engine."
      />

      {/* Experiment scenario selector cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="tablist" aria-label="Experiments">
        {defs.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={selected === d.id}
            onClick={() => choose(d)}
            data-testid={`exp-${d.id}`}
            className={cx(
              "rounded-xl border p-5 text-left transition duration-150",
              selected === d.id
                ? "border-volt bg-raised shadow-lg shadow-volt/10"
                : "border-line bg-surface hover:border-[#38414a] hover:bg-raised",
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cx("font-display text-lg uppercase tracking-tight", selected === d.id ? "text-volt" : "text-ink")}>
                {d.title}
              </span>
              {selected === d.id && <span className="h-2 w-2 rounded-full bg-volt" />}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{d.description}</p>
          </button>
        ))}
        {defs.length === 0 && <Spinner label="Loading experiment presets…" />}
      </div>

      <Card title="TRIAL PARAMETER CONFIGURATION" subtitle={def ? def.title : ""} icon={<FlaskConical className="h-5 w-5" />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            { label: "Trial Count", v: trials, set: setTrials, min: 1, max: 50, step: 1, id: "trials" },
            { label: "Random Seed", v: seed, set: setSeed, min: 0, max: 2147483647, step: 1, id: "seed" },
            ...(selected !== "grid_sizes"
              ? [
                  { label: "Rows", v: rows, set: setRows, min: 4, max: 48, step: 1, id: "rows" },
                  { label: "Columns", v: cols, set: setCols, min: 4, max: 48, step: 1, id: "cols" },
                ]
              : []),
          ].map((f) => (
            <label key={f.id} className="text-xs font-extrabold uppercase tracking-wider text-muted">
              {f.label}
              <input
                type="number"
                value={f.v}
                min={f.min}
                max={f.max}
                step={f.step}
                data-testid={`cfg-${f.id}`}
                onChange={(e) => f.set(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm font-bold text-ink focus:border-volt focus:outline-none"
              />
            </label>
          ))}
          {selected === "grid_sizes" && (
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted sm:col-span-2">
              Grid Sizes (R × C)
              <input
                value={sizesText}
                onChange={(e) => setSizesText(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm font-bold text-ink focus:border-volt focus:outline-none"
              />
            </label>
          )}
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted">
            Obstacle Density · {(density * 100).toFixed(0)}%
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="mt-3.5 w-full cursor-pointer accent-[#c8ff2e]"
              aria-label="Obstacle density"
            />
          </label>
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted">
            Cost Distribution
            <select
              value={costKey}
              onChange={(e) => setCostKey(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-xs font-bold text-ink focus:border-volt focus:outline-none"
            >
              {Object.entries(COST_PRESETS).map(([k, p]) => (
                <option key={k} value={k}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line/40 pt-4">
          <Button
            variant="primary"
            icon={<Play className="h-4 w-4" />}
            disabled={busy}
            onClick={() => void execute(selected, { trials, rows, cols, density, seed, costKey, sizesText })}
            data-testid="run-experiment"
          >
            {busy ? "Executing Batch Trials…" : "Execute Experiment"}
          </Button>
          {busy && <Spinner />}
          {error && <span className="text-xs font-bold text-[#ff5a63]" role="alert">{error}</span>}
        </div>
      </Card>

      {run && (
        <div className="space-y-8" data-testid="experiment-results">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="warn">Synthetic Batch Results</Pill>
            <span className="text-xs font-semibold text-muted">
              {run.note} Seed {run.config.seed} · {run.config.trials} trial(s) per size · Density {(run.config.density * 100).toFixed(0)}%.
            </span>
            <span className="ml-auto flex gap-2">
              <Button icon={<Download className="h-4 w-4" />} onClick={() => download(`${run.experiment.id}-raw-trials.csv`, run.csv.raw)} data-testid="csv-raw">
                Export Raw CSV
              </Button>
              <Button icon={<Download className="h-4 w-4" />} onClick={() => download(`${run.experiment.id}-summary.csv`, run.csv.summary)} data-testid="csv-summary">
                Export Summary CSV
              </Button>
            </span>
          </div>

          <Card
            title="STATISTICAL METRIC SUMMARY"
            subtitle="Mean ± Standard Deviation (Median in parenthesis). Path metrics evaluate successful trials only."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs" data-testid="summary-table">
                <thead>
                  <tr className="border-b border-line bg-raised text-xs font-extrabold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">Grid</th>
                    <th className="px-3 py-3">Algorithm</th>
                    <th className="px-3 py-3">Success Rate</th>
                    <th className="px-3 py-3">Path Moves</th>
                    <th className="px-3 py-3">Total Cost</th>
                    <th className="px-3 py-3">Expanded</th>
                    <th className="px-3 py-3">Generated</th>
                    <th className="px-3 py-3">Peak Frontier</th>
                    <th className="px-3 py-3">Duration (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {run.summary.map((s) => {
                    const m = s.metrics;
                    const cell = (k: string, d = 1) => (
                      <td className="px-3 py-3 font-semibold tabular-nums text-ink">
                        {fmt(m[k].mean, d)} <span className="text-muted">± {fmt(m[k].std, d)}</span> <span className="text-[11px] text-muted font-mono">({fmt(m[k].median, d)})</span>
                      </td>
                    );
                    const color = s.algorithm === "BFS" ? "#4b8cff" : s.algorithm === "DFS" ? "#38c982" : "#ff5a63";
                    return (
                      <tr key={`${s.size}-${s.algorithm}`} className="hover:bg-raised/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-ink">{s.size}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-2 font-black uppercase text-ink">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                            {s.algorithm}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold tabular-nums text-ink">
                          {(s.success_rate * 100).toFixed(0)}% <span className="text-muted font-normal">({s.successes}/{s.trials})</span>
                        </td>
                        {cell("path_length")}
                        {cell("total_cost")}
                        {cell("expanded_nodes")}
                        {cell("generated_nodes")}
                        {cell("max_frontier_size")}
                        {cell("execution_time_ms", 3)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="COMPARATIVE EVALUATION CHART"
            subtitle={sizes.length > 1 ? "Empirical mean value plotted per grid dimension" : "Empirical mean value per search algorithm"}
            actions={
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                aria-label="Metric"
                className="rounded-lg border border-line bg-raised px-3 py-2 text-xs font-bold text-ink focus:border-volt focus:outline-none"
              >
                {METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            }
          >
            <div className="h-[320px]">
              {sizes.length > 1 ? (
                <SizeLines rows={lineRows} xKey="size" decimals={metricInfo.decimals} />
              ) : (
                <MetricBar data={ALGO_IDS.map((a) => ({ algorithm: a, value: valueOf(sizes[0], a) }))} decimals={Math.min(2, metricInfo.decimals)} />
              )}
            </div>
            <div className="mt-4 border-t border-line/40 pt-3"><AlgoLegend /></div>
          </Card>

          {sample && (
            <Card title="SAMPLE GENERATED FLOOR PLAN" subtitle={`Procedural Environment · ${sample.label}`} bodyClassName="space-y-4">
              <WarehouseView model={sample.model} mode="grid" routes={sample.routes} maxCell={34} testId="experiment-sample" />
              <AlgoLegend />
            </Card>
          )}

          <ChartCard title="AGGREGATE EXPANSION EFFORT" subtitle="Mean nodes expanded across all trial environments in this batch">
            <MetricBar
              data={ALGO_IDS.map((a) => {
                const rowsFor = run.summary.filter((s) => s.algorithm === a);
                const mean = rowsFor.length ? rowsFor.reduce((acc, s) => acc + (s.metrics.expanded_nodes.mean ?? 0), 0) / rowsFor.length : 0;
                return { algorithm: a, value: mean };
              })}
              decimals={1}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
