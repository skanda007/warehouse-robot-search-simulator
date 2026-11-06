"use client";

import React, { useEffect, useRef } from "react";
import { Bot, Brain } from "lucide-react";
import { useStore } from "@/store/useStore";
import { usePlayback } from "@/hooks/usePlayback";
import { explainEvent } from "@/lib/explain";
import { Card, Stat, cx } from "@/components/common/ui";

const toneBorder = {
  info: "border-volt/50",
  select: "border-[#ffd23e]/50",
  goal: "border-[#38c982]/60",
  fail: "border-[#ff5a63]/60",
  warn: "border-line",
} as const;

export function EventExplanation() {
  const result = useStore((s) => s.result);
  const view = usePlayback();
  if (!result) {
    return (
      <Card title="Event Explanation" icon={<Brain className="h-5 w-5" />}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Each search event is explained here in plain language once a search has run.
        </p>
      </Card>
    );
  }
  if (view.inExecution) {
    const i = view.robotIdx;
    const dir = i > 0 ? result.directions[i - 1] : "—";
    const cell = result.path[i];
    const last = i === view.P - 1;
    return (
      <Card title="Stage B · AMR Navigation" icon={<Bot className="h-5 w-5" />} className="border-[#38c982]/50">
        <p className="text-sm leading-relaxed text-ink font-medium" data-testid="event-text">
          {i === 0
            ? "The autonomous mobile robot is docked at the bay and commences navigating the verified route, advancing cell by adjacent cell."
            : last
              ? `Navigated ${dir} to coordinate (${cell[0]}, ${cell[1]}). The AMR has successfully reached the shelf retrieval cell — mission complete.`
              : `Navigating ${dir} to coordinate (${cell[0]}, ${cell[1]}). Following the optimal path discovered by ${result.algorithm}.`}
        </p>
        <p className="mt-2 text-xs font-extrabold uppercase tracking-wider text-muted">
          Waypoint {i} of {result.path_length} · {result.path_length - i} move{result.path_length - i === 1 ? "" : "s"} remaining
        </p>
      </Card>
    );
  }
  const ex = explainEvent(result.algorithm, result.events, view.searchStep);
  return (
    <Card
      title="Event Explanation"
      subtitle={`Step ${view.searchStep + 1} of ${view.E} · ${result.events[view.searchStep].type}`}
      icon={<Brain className="h-5 w-5" />}
      className={cx("border", toneBorder[ex.tone])}
    >
      <h3 className="font-display text-lg uppercase tracking-tight text-ink" data-testid="event-title">
        {ex.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted" data-testid="event-text">
        {ex.text}
      </p>
      {ex.details.length > 0 && (
        <ul className="mt-4 max-h-40 space-y-1.5 overflow-y-auto rounded-xl bg-raised p-3.5 text-xs leading-relaxed text-muted font-mono border border-line">
          {ex.details.map((d, i) => (
            <li key={i} className="font-medium">• {d}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SearchMetrics() {
  const result = useStore((s) => s.result);
  const view = usePlayback();
  const f = view.frame;
  if (!result || !f) return null;
  const ev = f.event;
  const g = ev && ev.type !== "complete" ? ev.g : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" data-testid="search-metrics">
      <Stat label="Expanded Nodes" value={f.expanded} />
      <Stat label="Generated Nodes" value={f.generated} />
      <Stat label="Frontier Size" value={f.frontier.length} />
      <Stat label="Max Frontier" value={f.maxFrontier} />
      <Stat label="Accumulated g" value={g === undefined ? "—" : g} hint="Cost from start" />
      <Stat
        label={f.complete && f.success ? "Final Route" : "Search Status"}
        value={f.complete ? (f.success ? `${result.path_length} moves` : "Unreachable") : "Searching…"}
        hint={f.complete && f.success ? `Path cost ${result.total_cost}` : undefined}
      />
    </div>
  );
}

export function SearchTimeline() {
  const result = useStore((s) => s.result);
  const seek = useStore((s) => s.seek);
  const view = usePlayback();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector('[aria-current="step"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [view.searchStep]);
  if (!result) return null;
  const lo = Math.max(0, view.searchStep - 12);
  const hi = Math.min(result.events.length, view.searchStep + 40);
  return (
    <Card title="Search Event Feed" subtitle="Jump to any historical search state" bodyClassName="p-0">
      <div ref={ref} className="max-h-[340px] overflow-y-auto divide-y divide-line" data-testid="event-history">
        {result.events.slice(lo, hi).map((e) => {
          const cur = e.step === view.searchStep;
          return (
            <button
              key={e.step}
              aria-current={cur ? "step" : undefined}
              onClick={() => seek(e.step)}
              className={cx(
                "flex w-full items-center gap-3 px-4 py-2 text-left text-xs transition duration-150",
                cur
                  ? "bg-raised border-l-2 border-volt text-ink font-bold"
                  : "text-muted hover:bg-raised/60 hover:text-ink",
              )}
            >
              <span className="font-display text-sm w-10 text-volt tabular-nums">#{e.step + 1}</span>
              <span className="w-20 text-[11px] font-extrabold uppercase tracking-wider">{e.type}</span>
              <span className="font-mono text-xs">{e.current ? `(${e.current[0]}, ${e.current[1]})` : e.type === "init" ? `start (${e.start?.[0]}, ${e.start?.[1]})` : e.type === "complete" ? (e.success ? "goal reached" : "unreachable") : ""}</span>
              {e.g !== undefined && <span className="ml-auto font-mono text-xs font-bold text-[#ffd23e]">g={e.g}</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
