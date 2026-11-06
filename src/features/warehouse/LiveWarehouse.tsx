"use client";

import React, { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { usePlayback, useRobot } from "@/hooks/usePlayback";
import { nextInFrontier } from "@/features/visualization/FrontierPanel";
import { WarehouseView } from "./WarehouseView";

/** The warehouse bound to the global store: model + search overlay + route + robot. */
export function LiveWarehouse({ editable = false, maxCell = 54 }: { editable?: boolean; maxCell?: number }) {
  const model = useStore((s) => s.model);
  const viewMode = useStore((s) => s.viewMode);
  const result = useStore((s) => s.result);
  const ready = useStore((s) => s.ready);
  const beginStroke = useStore((s) => s.beginStroke);
  const paint = useStore((s) => s.paint);
  const endStroke = useStore((s) => s.endStroke);
  const view = usePlayback();
  const robot = useRobot(view);

  const frame = view.frame;
  const nextCell = useMemo(() => (frame && result && !frame.complete && !view.inExecution ? nextInFrontier(result.structure, frame) : null), [frame, result, view.inExecution]);

  if (!ready) {
    return <div className="flex h-72 animate-pulse items-center justify-center rounded-xl bg-panel-2 text-sm font-semibold text-muted">Loading warehouse from the engine…</div>;
  }
  return (
    <WarehouseView
      model={model}
      mode={viewMode}
      frame={frame}
      nextCell={nextCell}
      path={view.showRoute && result ? result.path : null}
      pathProgress={view.inExecution ? view.robotIdx : 0}
      robot={robot}
      editable={editable}
      maxCell={maxCell}
      onCellDown={(c) => {
        beginStroke();
        paint(c);
      }}
      onCellEnter={(c) => paint(c)}
      onPointerEnd={endStroke}
    />
  );
}
