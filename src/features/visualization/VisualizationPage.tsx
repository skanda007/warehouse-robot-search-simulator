"use client";

import React from "react";
import { Rocket } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button, Card, EmptyState, PageHeader } from "@/components/common/ui";
import { LiveWarehouse } from "@/features/warehouse/LiveWarehouse";
import { MapLegend } from "@/features/warehouse/MapLegend";
import { AlgorithmPicker } from "@/features/warehouse/WarehouseControls";
import { SimulationControls } from "./SimulationControls";
import { FrontierPanel } from "./FrontierPanel";
import { EventExplanation, SearchMetrics, SearchTimeline } from "./EventExplanation";
import { SearchTree } from "./SearchTree";

export function VisualizationPage() {
  const result = useStore((s) => s.result);
  const running = useStore((s) => s.running);
  const algo = useStore((s) => s.algo);
  const model = useStore((s) => s.model);
  const runSearch = useStore((s) => s.runSearch);
  const searchError = useStore((s) => s.searchError);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SEARCH ENGINE DEBUGGER"
        title="ALGORITHM VISUALIZATION"
        subtitle="Step through every queue push, pop, expansion and backtracking event. The authoritative Python engine recorded the search history once; this interactive debugger replays it with zero latency or state drift."
      />
      <div className="space-y-8">
        <Card
          title="ACTIVE SEARCH WORKBENCH"
          subtitle={`${model.name} · ${model.rows}×${model.cols} Grid Map`}
          actions={
            <div className="w-[340px] max-w-full">
              <AlgorithmPicker compact />
            </div>
          }
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Rocket className="h-4 w-4" />}
              disabled={running}
              onClick={() => void runSearch()}
              data-testid="viz-run"
            >
              {running ? "Searching…" : result ? `Re-run ${algo} Execution` : `Dispatch ${algo} Search`}
            </Button>
            {searchError && <span className="text-xs font-bold text-[#ff5a63]">{searchError}</span>}
          </div>
          <SimulationControls />
        </Card>

        {!result ? (
          <EmptyState
            title="NO SEARCH HAS BEEN RUN YET"
            text="Select Breadth-First Search, Depth-First Search or Uniform-Cost Search above and press Dispatch. You will be able to step through every frontier change, inspect the search tree, and watch the AMR execute the discovered path."
          />
        ) : (
          <>
            <SearchMetrics />
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(380px,1fr)]">
              <Card
                title="WAREHOUSE SIMULATION STAGE"
                subtitle="Stage A explores states · Stage B navigates the reconstructed route"
                bodyClassName="space-y-6"
              >
                <LiveWarehouse maxCell={60} />
                <MapLegend />
              </Card>
              <div className="space-y-8">
                <EventExplanation />
                <FrontierPanel />
              </div>
            </div>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(380px,1fr)]">
              <SearchTree />
              <SearchTimeline />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
