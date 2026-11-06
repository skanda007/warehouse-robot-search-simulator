import { describe, expect, it } from "vitest";
import { applyTool, blankModel, fromWire, resizeModel, toWire, validateModel } from "../warehouse";

const opts = { cost: 3, brush: 1 };

describe("warehouse editing rules", () => {
  it("places and removes obstacles", () => {
    const m = blankModel(5, 5);
    const a = applyTool(m, "obstacle", [2, 2], opts);
    expect(a.changed).toBe(true);
    expect(a.model.tiles[2][2]).toBe("obstacle");
    expect(m.tiles[2][2]).toBe("floor"); // input never mutated
    const b = applyTool(a.model, "remove_obstacle", [2, 2], opts);
    expect(b.model.tiles[2][2]).toBe("floor");
  });

  it("protects start and goal", () => {
    const m = blankModel(5, 5);
    expect(applyTool(m, "obstacle", m.start, opts).error).toBeTruthy();
    expect(applyTool(m, "rack", m.goal, opts).changed).toBe(false);
    expect(applyTool(m, "goal", m.start, opts).error).toMatch(/overlap/);
    expect(applyTool(m, "start", m.goal, opts).error).toMatch(/overlap/);
  });

  it("moves start and goal; goal picks adjacent shelf as target", () => {
    let m = blankModel(5, 5);
    m = applyTool(m, "shelf", [3, 3], opts).model;
    m = applyTool(m, "goal", [4, 3], opts).model;
    expect(m.goal).toEqual([4, 3]);
    expect(m.target).toEqual([3, 3]);
    m = applyTool(m, "start", [1, 1], opts).model;
    expect(m.start).toEqual([1, 1]);
    expect(applyTool(m, "goal", [3, 3], opts).error).toBeTruthy(); // goal cannot be on a shelf
  });

  it("applies weighted terrain only to floor and supports brushes", () => {
    let m = blankModel(5, 5);
    m = applyTool(m, "obstacle", [2, 2], opts).model;
    expect(applyTool(m, "terrain", [2, 2], opts).error).toMatch(/floor/);
    m = applyTool(m, "terrain", [1, 1], { cost: 5, brush: 2 }).model;
    expect(m.costs[1][1]).toBe(5);
    expect(m.costs[1][2]).toBe(5);
    expect(m.tiles[2][2]).toBe("obstacle");
    expect(m.costs[2][2]).toBe(1);
  });

  it("round-trips through the wire format", () => {
    let m = blankModel(6, 7, "RT");
    m = applyTool(m, "rack", [2, 2], opts).model;
    m = applyTool(m, "terrain", [3, 3], { cost: 2, brush: 1 }).model;
    m = applyTool(m, "loading", [5, 0], opts).model;
    const wire = toWire(m);
    expect(wire.racks).toEqual([[2, 2]]);
    expect(wire.terrain_costs).toEqual({ "3,3": 2 });
    expect(wire.loading).toEqual([[5, 0]]);
    expect(fromWire(wire)).toEqual(m);
  });

  it("validates dimensions and resizes safely", () => {
    const m = blankModel(5, 5);
    expect(resizeModel(m, 1, 5).error).toBeTruthy();
    expect(resizeModel(m, 5, 99).error).toBeTruthy();
    const r = resizeModel(m, 3, 3).model;
    expect(r.rows).toBe(3);
    expect(r.goal).toEqual([2, 2]);
    expect(validateModel(r)).toEqual([]);
    expect(validateModel({ ...m, goal: m.start })[0]).toMatch(/different/);
  });
});
