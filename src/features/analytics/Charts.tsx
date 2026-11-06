"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Cell as RCell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import { ALGO_COLORS, CHART } from "@/lib/theme";
import { ALGO_IDS, type AlgoId, type ProgressionPoint } from "@/lib/types";

const tick = { fill: CHART.axis, fontSize: 12, fontWeight: 700 };
const tooltipStyle = {
  contentStyle: {
    background: "#121517",
    border: "1px solid #2a2e33",
    borderRadius: 8,
    color: "#f3f4f1",
    fontSize: 13,
    fontWeight: 700,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
  },
  labelStyle: { color: "#f3f4f1", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  itemStyle: { color: "#f3f4f1", fontWeight: 700 },
  cursor: { fill: "rgba(200, 255, 46, 0.06)" },
};

/** High-contrast, bold, consistent algorithm legend (BFS blue · DFS green · UCS red). */
export function AlgoLegend({ only }: { only?: AlgoId[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2" data-testid="algo-legend">
      {(only ?? ALGO_IDS).map((a) => (
        <span key={a} className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink" style={{ fontWeight: 800 }}>
          <span className="inline-block h-3 w-3 rounded-[3px] border border-white/20" style={{ background: ALGO_COLORS[a] }} />
          {a}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, children, note }: { title: string; subtitle?: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/40">
      <h3 className="font-display text-lg uppercase tracking-tight text-ink">{title}</h3>
      {subtitle && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{subtitle}</p>}
      <div className="mt-3 h-[250px]">{children}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-3">
        <AlgoLegend />
        {note && <span className="text-xs font-mono font-bold text-muted">{note}</span>}
      </div>
    </div>
  );
}

export function MetricBar({ data, unit, decimals = 0 }: { data: { algorithm: AlgoId; value: number | null }[]; unit?: string; decimals?: number }) {
  const rows = data.map((d) => ({ ...d, value: d.value ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 22, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#2a2e33" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="algorithm" tick={tick} stroke="#2a2e33" />
        <YAxis tick={tick} stroke="#2a2e33" width={48} allowDecimals={decimals > 0} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${Number(v).toFixed(decimals)}${unit ?? ""}`, "Value"]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {rows.map((r) => (
            <RCell key={r.algorithm} fill={ALGO_COLORS[r.algorithm]} />
          ))}
          <LabelList dataKey="value" position="top" fill="#f3f4f1" fontSize={12} fontWeight={800} formatter={(v: unknown) => Number(v).toFixed(decimals)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressionLine({ data, field, label }: { data: Record<AlgoId, ProgressionPoint[]>; field: "frontier" | "expanded" | "generated"; label: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart margin={{ top: 10, right: 16, left: 0, bottom: 16 }}>
        <CartesianGrid stroke="#2a2e33" strokeDasharray="3 3" />
        <XAxis dataKey="step" type="number" tick={tick} stroke="#2a2e33" domain={[0, "dataMax"]} label={{ value: "SEARCH STEP", position: "insideBottom", offset: -8, fill: CHART.axis, fontSize: 11, fontWeight: 800 }} />
        <YAxis tick={tick} stroke="#2a2e33" width={48} label={{ value: label.toUpperCase(), angle: -90, position: "insideLeft", fill: CHART.axis, fontSize: 11, fontWeight: 800, dx: 6 }} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: CHART.axis }} />
        {ALGO_IDS.map((a) => (
          <Line key={a} data={data[a]} dataKey={field} name={a} stroke={ALGO_COLORS[a]} strokeWidth={2.5} dot={false} type="monotone" isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SizeLines({ rows, xKey, decimals = 1 }: { rows: Record<string, number | string | null>[]; xKey: string; decimals?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 16, right: 20, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#2a2e33" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={tick} stroke="#2a2e33" />
        <YAxis tick={tick} stroke="#2a2e33" width={56} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: CHART.axis }} formatter={(v) => (v === null ? "n/a" : Number(v).toFixed(decimals))} />
        {ALGO_IDS.map((a) => (
          <Line key={a} dataKey={a} stroke={ALGO_COLORS[a]} strokeWidth={2.5} dot={{ r: 4, fill: ALGO_COLORS[a], stroke: "#121517", strokeWidth: 1.5 }} type="monotone" isAnimationActive={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
