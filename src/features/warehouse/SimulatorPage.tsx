"use client";

import React from "react";
import { PageHeader, Card } from "@/components/common/ui";
import { LiveWarehouse } from "./LiveWarehouse";
import { MapLegend } from "./MapLegend";
import { PresetSelector } from "./PresetSelector";
import { ConfigPanel, EditorToolbar, MapManager } from "./WarehouseEditor";
import { MissionControl } from "./WarehouseControls";
import { SimulationControls } from "@/features/visualization/SimulationControls";
import { EventExplanation, SearchMetrics } from "@/features/visualization/EventExplanation";
import { usePlayback } from "@/hooks/usePlayback";

export function SimulatorPage() {
  const view = usePlayback();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AUTONOMOUS RETRIEVAL WORKBENCH"
        title="WAREHOUSE SIMULATOR"
        subtitle="Design the warehouse layout, dock the autonomous mobile robot, specify the requested shelf and dispatch search algorithms. Every modification instantly synchronizes with the authoritative Python search grid."
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <Card
            title="WAREHOUSE FLOOR PLAN"
            subtitle="Top-down visual stage generated directly from the logical grid"
            bodyClassName="space-y-6"
          >
            <LiveWarehouse editable />
            <MapLegend search={!!view.frame} />
          </Card>
          <Card
            title="LAYOUT & OBSTACLE EDITOR"
            subtitle="Select a tool, then click or drag across the warehouse floor"
            bodyClassName="space-y-4"
          >
            <EditorToolbar />
          </Card>
          <Card
            title="SEARCH & ROUTE PLAYBACK"
            subtitle="Stage A: search frontier expansion → Stage B: cell-by-cell AMR navigation"
          >
            <SimulationControls />
          </Card>
          {view.frame && (
            <>
              <SearchMetrics />
              <EventExplanation />
            </>
          )}
        </div>
        <div className="space-y-8">
          <MissionControl />
          <PresetSelector />
          <ConfigPanel />
          <MapManager />
        </div>
      </div>
    </div>
  );
}
