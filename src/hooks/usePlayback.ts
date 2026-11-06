"use client";

import { useMemo } from "react";
import { playbackView, useStore, type PlaybackView } from "@/store/useStore";
import { headingFor, type RobotState } from "@/features/warehouse/WarehouseView";
import { EXEC_MS } from "@/lib/playback";
import type { Cell } from "@/lib/types";

export function usePlayback(): PlaybackView {
  const result = useStore((s) => s.result);
  const t = useStore((s) => s.t);
  const ready = useStore((s) => s.ready);
  return useMemo(() => playbackView(result, t, ready), [result, t, ready]);
}

/** Robot pose derived from the timeline: docked while searching, driving the exact path afterwards. */
export function useRobot(view: PlaybackView): RobotState {
  const result = useStore((s) => s.result);
  const start = useStore((s) => s.model.start);
  const speed = useStore((s) => s.speed);
  return useMemo(() => {
    const path: Cell[] | null = result && result.success ? result.path : null;
    const cell: Cell = path && view.inExecution ? path[view.robotIdx] : start;
    const angle = path ? headingFor(path, view.inExecution ? view.robotIdx : 1) : 0;
    return {
      cell,
      angle,
      moveMs: Math.max(40, (EXEC_MS / speed) * 0.92),
      scanning: !!result && !view.inExecution && view.phase === "searching",
    };
  }, [result, view, start, speed]);
}
