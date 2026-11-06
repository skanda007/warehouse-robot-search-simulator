// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WarehouseView } from "../warehouse/WarehouseView";
import { MapLegend } from "../warehouse/MapLegend";
import { AlgoLegend } from "../analytics/Charts";
import { applyTool, blankModel } from "@/lib/warehouse";

afterEach(cleanup);

describe("components", () => {
  it("renders the warehouse from the logical grid (warehouse and grid modes)", () => {
    let m = blankModel(4, 6);
    m = applyTool(m, "rack", [1, 1], { cost: 1, brush: 1 }).model;
    const { rerender, container } = render(<WarehouseView model={m} mode="warehouse" />);
    expect(screen.getByRole("img", { name: "Warehouse 4 by 6" })).toBeTruthy();
    expect(container.textContent).toContain("PICK");
    rerender(<WarehouseView model={m} mode="grid" />);
    expect(container.textContent).toContain("R"); // rack letter in debug grid
  });

  it("draws the robot only when provided", () => {
    const m = blankModel(3, 3);
    const { container, rerender } = render(<WarehouseView model={m} mode="warehouse" />);
    expect(container.textContent).not.toContain("AMR-01");
    rerender(<WarehouseView model={m} mode="warehouse" robot={{ cell: [0, 0], angle: 0, moveMs: 100, scanning: false }} />);
    expect(container.textContent).toContain("AMR-01");
  });

  it("legends are bold and include all algorithm / state labels", () => {
    render(
      <div>
        <AlgoLegend />
        <MapLegend />
      </div>,
    );
    for (const a of ["BFS", "DFS", "UCS"]) expect(screen.getByText(a).className).toMatch(/font-extrabold/);
    for (const l of ["Frontier", "Explored", "Current expansion", "Final route"]) expect(screen.getByText(l).className).toMatch(/font-bold/);
  });
});
