import React from "react";
import { STATE_COLORS } from "@/lib/theme";
import { LegendGroup, LegendItem } from "@/components/common/ui";

/** Warehouse-state legend (algorithm identity colours have their own legend on comparison views). */
export function MapLegend({ search = true }: { search?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line/50 pt-4" data-testid="map-legend">
      <LegendGroup title="Warehouse objects">
        <LegendItem color="#181e24" label="Rack / shelf (blocked)" />
        <LegendItem color="#343b40" label="Obstacle / pallet" />
        <LegendItem color="#ffd23e" label="Weighted terrain (cost n)" />
        <LegendItem color="#38c982" label="Load / unload dock" />
      </LegendGroup>
      <LegendGroup title="Mission">
        <LegendItem color={STATE_COLORS.robot} label="Robot / dock" shape="circle" />
        <LegendItem color={STATE_COLORS.destination} label="Destination shelf" shape="circle" />
        <LegendItem color={STATE_COLORS.route} label="Final route" shape="line" />
      </LegendGroup>
      {search && (
        <LegendGroup title="Search state">
          <LegendItem color={STATE_COLORS.current} label="Current expansion" />
          <LegendItem color={STATE_COLORS.frontier} label="Frontier" />
          <LegendItem color={STATE_COLORS.explored} label="Explored" />
        </LegendGroup>
      )}
    </div>
  );
}
