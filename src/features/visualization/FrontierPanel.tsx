"use client";

import React from "react";
import type { Frame, FrontierEntry } from "@/lib/replay";
import type { Cell } from "@/lib/types";
import { ALGO_COLORS } from "@/lib/theme";
import { useStore } from "@/store/useStore";
import { usePlayback } from "@/hooks/usePlayback";
import { Card, Pill } from "@/components/common/ui";

type Structure = "queue" | "stack" | "priority_queue";

export function isStale(structure: Structure, frame: Frame, e: FrontierEntry): boolean {
  const i = frame.idx(e.state);
  if (structure === "queue") return false;
  if (frame.status[i] === 2) return true;
  return structure === "priority_queue" && e.g > frame.g[i] + 1e-9;
}

/** Ordered view of the real frontier: queue front→back, stack top→bottom, heap lowest cost first (sorted COPY). */
export function orderedFrontier(structure: Structure, frame: Frame): FrontierEntry[] {
  if (structure === "queue") return frame.frontier.slice();
  if (structure === "stack") return frame.frontier.slice().reverse();
  return frame.frontier.slice().sort((a, b) => a.g - b.g || a.id - b.id);
}

/** The cell that the algorithm will pop next (first non-stale entry in pop order). */
export function nextInFrontier(structure: Structure, frame: Frame): Cell | null {
  const ordered = orderedFrontier(structure, frame);
  const hit = ordered.find((e) => !isStale(structure, frame, e)) ?? ordered[0];
  return hit ? hit.state : null;
}

const META: Record<Structure, { title: string; first: string; last: string; blurb: string }> = {
  queue: { title: "FIFO QUEUE", first: "NEXT POP", last: "BACK", blurb: "Dequeue from the front, enqueue at the back." },
  stack: { title: "LIFO STACK", first: "TOP OF STACK", last: "BOTTOM", blurb: "Pop and push at the top — the newest entry is expanded first." },
  priority_queue: { title: "PRIORITY QUEUE (MIN-HEAP)", first: "LOWEST COST NEXT", last: "", blurb: "Lowest accumulated cost g first. Sorted copy shown for inspection." },
};

const MAX_ROWS = 60;

export function FrontierPanel() {
  const result = useStore((s) => s.result);
  const view = usePlayback();
  const frame = view.frame;
  if (!result || !frame) {
    return (
      <Card title="FRONTIER CONTAINER" subtitle="Queue / stack / priority queue live memory">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Run a search to watch the frontier evolve event by event.</p>
      </Card>
    );
  }
  const structure = result.structure;
  const meta = META[structure];
  const ordered = orderedFrontier(structure, frame);
  const firstLive = ordered.findIndex((e) => !isStale(structure, frame, e));
  const color = ALGO_COLORS[result.algorithm];
  return (
    <Card
      title={`LIVE FRONTIER · ${meta.title}`}
      subtitle={meta.blurb}
      actions={
        <Pill tone={result.algorithm === "BFS" ? "bfs" : result.algorithm === "DFS" ? "dfs" : "ucs"}>
          {frame.frontier.length} {frame.frontier.length === 1 ? "STATE" : "STATES"} · PEAK {frame.maxFrontier}
        </Pill>
      }
      bodyClassName="p-0"
    >
      {ordered.length === 0 ? (
        <p className="p-6 text-xs font-extrabold uppercase tracking-widest text-muted">The frontier is currently empty.</p>
      ) : (
        <ol className="max-h-[360px] overflow-y-auto divide-y divide-line" data-testid="frontier-list" aria-label={meta.title}>
          {ordered.slice(0, MAX_ROWS).map((e, i) => {
            const stale = isStale(structure, frame, e);
            const tag = i === firstLive ? meta.first : structure !== "priority_queue" && i === ordered.length - 1 ? meta.last : null;
            const isNext = i === firstLive;
            return (
              <li
                key={e.id}
                data-testid="frontier-row"
                className={`flex items-center gap-4 px-4 py-2.5 transition duration-150 ${
                  isNext ? "bg-raised" : "hover:bg-raised/60"
                } ${stale ? "opacity-50" : "opacity-100"}`}
                style={isNext ? { borderLeft: `3px solid ${color}` } : { borderLeft: "3px solid transparent" }}
              >
                {/* Keel-style large condensed index */}
                <span className="font-display text-xl sm:text-2xl w-8 text-volt tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-bold text-ink ${stale ? "line-through text-muted" : ""}`}>
                      ({e.state[0]}, {e.state[1]})
                    </span>
                    <span className="font-mono text-xs font-black text-[#ffd23e]">
                      cost g={Number.isInteger(e.g) ? e.g : e.g.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    depth {e.depth}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {e.kind === "repush" && <Pill tone="warn" className="!px-2 !py-0.5 !text-[10px]">re-push</Pill>}
                  {e.kind === "relaxed" && <Pill tone="warn" className="!px-2 !py-0.5 !text-[10px]">relaxed</Pill>}
                  {stale && <Pill tone="neutral" className="!px-2 !py-0.5 !text-[10px]">stale</Pill>}
                  {tag && (
                    <Pill
                      tone={result.algorithm === "BFS" ? "bfs" : result.algorithm === "DFS" ? "dfs" : "ucs"}
                      className="!px-2.5 !py-0.5 !text-[10px]"
                    >
                      {tag}
                    </Pill>
                  )}
                </div>
              </li>
            );
          })}
          {ordered.length > MAX_ROWS && (
            <li className="px-4 py-3 text-xs font-bold text-muted">
              … and {ordered.length - MAX_ROWS} more pending entries in container
            </li>
          )}
        </ol>
      )}
    </Card>
  );
}
