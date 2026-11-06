import type { Cell, WireWarehouse } from "./types";

export type TileKind = "floor" | "obstacle" | "rack" | "shelf" | "pallet" | "loading" | "unloading";

export interface WarehouseModel {
  name: string;
  rows: number;
  cols: number;
  tiles: TileKind[][];
  costs: number[][];
  start: Cell;
  goal: Cell;
  /** Physical shelf (blocked cell) the goal retrieval cell serves. */
  target: Cell | null;
}

export const MIN_DIM = 2;
export const MAX_DIM = 60;

export const isBlockedKind = (k: TileKind) => k === "obstacle" || k === "rack" || k === "shelf" || k === "pallet";
export const isBlocked = (m: WarehouseModel, [r, c]: Cell) => isBlockedKind(m.tiles[r][c]);
export const inBounds = (m: WarehouseModel, [r, c]: Cell) => r >= 0 && c >= 0 && r < m.rows && c < m.cols;
export const sameCell = (a: Cell | null | undefined, b: Cell | null | undefined) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

export function blankModel(rows: number, cols: number, name = "New warehouse"): WarehouseModel {
  return {
    name,
    rows,
    cols,
    tiles: Array.from({ length: rows }, () => Array<TileKind>(cols).fill("floor")),
    costs: Array.from({ length: rows }, () => Array<number>(cols).fill(1)),
    start: [0, 0],
    goal: [rows - 1, cols - 1],
    target: null,
  };
}

export function cloneModel(m: WarehouseModel): WarehouseModel {
  return { ...m, tiles: m.tiles.map((r) => [...r]), costs: m.costs.map((r) => [...r]), start: [...m.start], goal: [...m.goal], target: m.target ? [...m.target] : null };
}

export function fromWire(w: WireWarehouse): WarehouseModel {
  const m = blankModel(w.rows, w.cols, w.name);
  const put = (cells: Cell[], kind: TileKind) => cells.forEach(([r, c]) => (m.tiles[r][c] = kind));
  put(w.obstacles, "obstacle");
  put(w.racks, "rack");
  put(w.shelves, "shelf");
  put(w.pallets, "pallet");
  put(w.loading, "loading");
  put(w.unloading, "unloading");
  for (const [key, cost] of Object.entries(w.terrain_costs)) {
    const [r, c] = key.split(",").map(Number);
    if (m.costs[r]?.[c] !== undefined) m.costs[r][c] = cost;
  }
  m.start = [...w.start];
  m.goal = [...w.goal];
  m.target = w.target_shelf ? [...w.target_shelf] : null;
  return m;
}

export function toWire(m: WarehouseModel): WireWarehouse {
  const lists: Record<TileKind, Cell[]> = { floor: [], obstacle: [], rack: [], shelf: [], pallet: [], loading: [], unloading: [] };
  const terrain: Record<string, number> = {};
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      lists[m.tiles[r][c]].push([r, c]);
      if (m.costs[r][c] !== 1) terrain[`${r},${c}`] = m.costs[r][c];
    }
  }
  return {
    name: m.name,
    rows: m.rows,
    cols: m.cols,
    start: m.start,
    goal: m.goal,
    obstacles: lists.obstacle,
    racks: lists.rack,
    shelves: lists.shelf,
    pallets: lists.pallet,
    loading: lists.loading,
    unloading: lists.unloading,
    terrain_costs: terrain,
    target_shelf: m.target,
  };
}

export type Tool =
  | "start"
  | "goal"
  | "obstacle"
  | "remove_obstacle"
  | "rack"
  | "shelf"
  | "floor"
  | "terrain"
  | "loading"
  | "unloading"
  | "erase";

export interface ToolOptions {
  cost: number;
  brush: number;
}

export interface ToolResult {
  model: WarehouseModel;
  changed: boolean;
  error?: string;
}

const NEIGHBOURS: Cell[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function adjacentShelf(m: WarehouseModel, [r, c]: Cell): Cell | null {
  const cand = NEIGHBOURS.map(([dr, dc]) => [r + dr, c + dc] as Cell).filter((x) => inBounds(m, x));
  return cand.find((x) => m.tiles[x[0]][x[1]] === "shelf") ?? cand.find((x) => m.tiles[x[0]][x[1]] === "rack") ?? null;
}

/** Apply one editing tool at a cell. Never mutates the input; returns the same object when nothing changed. */
export function applyTool(m: WarehouseModel, tool: Tool, cell: Cell, opts: ToolOptions): ToolResult {
  if (!inBounds(m, cell)) return { model: m, changed: false, error: "That cell is outside the warehouse." };
  const [r, c] = cell;
  const kind = m.tiles[r][c];
  const fail = (error: string): ToolResult => ({ model: m, changed: false, error });

  if (tool === "start") {
    if (isBlockedKind(kind)) return fail("The robot cannot start on a blocked cell.");
    if (sameCell(cell, m.goal)) return fail("Start and goal cannot overlap.");
    if (sameCell(cell, m.start)) return { model: m, changed: false };
    const n = cloneModel(m);
    n.start = [r, c];
    return { model: n, changed: true };
  }
  if (tool === "goal") {
    if (isBlockedKind(kind)) return fail("The goal must be an accessible retrieval cell, not a rack or obstacle.");
    if (sameCell(cell, m.start)) return fail("Start and goal cannot overlap.");
    const n = cloneModel(m);
    n.goal = [r, c];
    n.target = adjacentShelf(n, [r, c]);
    return { model: n, changed: true };
  }
  if (tool === "loading" || tool === "unloading") {
    if (isBlockedKind(kind)) return fail("Stations must be placed on traversable floor.");
    if (kind === tool) return { model: m, changed: false };
    const n = cloneModel(m);
    n.tiles[r][c] = tool;
    return { model: n, changed: true };
  }

  const size = Math.max(1, Math.min(4, Math.floor(opts.brush)));
  const targets: Cell[] = [];
  for (let dr = 0; dr < size; dr++) for (let dc = 0; dc < size; dc++) if (inBounds(m, [r + dr, c + dc])) targets.push([r + dr, c + dc]);

  const n = cloneModel(m);
  let changed = false;
  let protectedHit = false;
  for (const [tr, tc] of targets) {
    const here = n.tiles[tr][tc];
    const isEndpoint = sameCell([tr, tc], n.start) || sameCell([tr, tc], n.goal);
    switch (tool) {
      case "obstacle":
      case "rack":
      case "shelf": {
        if (isEndpoint) {
          protectedHit = true;
          break;
        }
        const next: TileKind = tool;
        if (here !== next || n.costs[tr][tc] !== 1) {
          n.tiles[tr][tc] = next;
          n.costs[tr][tc] = 1;
          changed = true;
        }
        break;
      }
      case "remove_obstacle":
        if (here === "obstacle" || here === "pallet") {
          n.tiles[tr][tc] = "floor";
          changed = true;
        }
        break;
      case "floor":
        if (here !== "floor" || n.costs[tr][tc] !== 1) {
          n.tiles[tr][tc] = "floor";
          n.costs[tr][tc] = 1;
          changed = true;
        }
        break;
      case "terrain":
        if (isBlockedKind(here)) break;
        if (n.costs[tr][tc] !== opts.cost) {
          n.costs[tr][tc] = opts.cost;
          changed = true;
        }
        break;
      case "erase":
        if (isEndpoint) {
          protectedHit = true;
          break;
        }
        if (here !== "floor" || n.costs[tr][tc] !== 1) {
          n.tiles[tr][tc] = "floor";
          n.costs[tr][tc] = 1;
          changed = true;
        }
        break;
    }
  }
  if (!changed) {
    if (protectedHit) return fail("The start and goal cells are protected — move them with the Start/Goal tools.");
    if (tool === "remove_obstacle") return fail("There is no obstacle on that cell (use Erase for racks and shelves).");
    if (tool === "terrain" && targets.every(([tr, tc]) => isBlockedKind(m.tiles[tr][tc]))) return fail("Terrain cost can only be applied to floor cells.");
    return { model: m, changed: false };
  }
  if (n.target && !(n.tiles[n.target[0]][n.target[1]] === "shelf" || n.tiles[n.target[0]][n.target[1]] === "rack")) n.target = null;
  if (!n.target) n.target = adjacentShelf(n, n.goal);
  return { model: n, changed: true, error: protectedHit ? "Start/goal cells were left untouched." : undefined };
}

/** Resize keeping the overlapping area. Start/goal are moved to the nearest valid free cell if they fall outside. */
export function resizeModel(m: WarehouseModel, rows: number, cols: number): ToolResult {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < MIN_DIM || cols < MIN_DIM || rows > MAX_DIM || cols > MAX_DIM) {
    return { model: m, changed: false, error: `Rows and columns must be whole numbers between ${MIN_DIM} and ${MAX_DIM}.` };
  }
  if (rows === m.rows && cols === m.cols) return { model: m, changed: false };
  const n = blankModel(rows, cols, m.name);
  for (let r = 0; r < Math.min(rows, m.rows); r++) {
    for (let c = 0; c < Math.min(cols, m.cols); c++) {
      n.tiles[r][c] = m.tiles[r][c];
      n.costs[r][c] = m.costs[r][c];
    }
  }
  const clamp = ([r, c]: Cell): Cell => [Math.min(r, rows - 1), Math.min(c, cols - 1)];
  n.start = clamp(m.start);
  n.goal = clamp(m.goal);
  if (sameCell(n.start, n.goal)) n.goal = n.start[0] > 0 ? [n.start[0] - 1, n.start[1]] : [n.start[0] + 1, n.start[1]];
  for (const key of ["start", "goal"] as const) {
    const [r, c] = n[key];
    n.tiles[r][c] = isBlockedKind(n.tiles[r][c]) ? "floor" : n.tiles[r][c];
    n.costs[r][c] = n.costs[r][c] > 0 ? n.costs[r][c] : 1;
  }
  n.target = m.target && m.target[0] < rows && m.target[1] < cols && isBlockedKind(n.tiles[m.target[0]][m.target[1]]) ? m.target : null;
  return { model: n, changed: true };
}

export function clearObstacles(m: WarehouseModel): WarehouseModel {
  const n = cloneModel(m);
  for (let r = 0; r < n.rows; r++) for (let c = 0; c < n.cols; c++) if (n.tiles[r][c] === "obstacle" || n.tiles[r][c] === "pallet") n.tiles[r][c] = "floor";
  return n;
}

/** Client-side validation mirroring the backend rules; the backend remains the authority. */
export function validateModel(m: WarehouseModel): string[] {
  const errors: string[] = [];
  if (m.rows < MIN_DIM || m.cols < MIN_DIM || m.rows > MAX_DIM || m.cols > MAX_DIM) errors.push(`Grid size must be between ${MIN_DIM} and ${MAX_DIM}.`);
  if (!inBounds(m, m.start)) errors.push("Start is outside the grid.");
  else if (isBlocked(m, m.start)) errors.push("Start is on a blocked cell.");
  if (!inBounds(m, m.goal)) errors.push("Goal is outside the grid.");
  else if (isBlocked(m, m.goal)) errors.push("Goal is on a blocked cell.");
  if (sameCell(m.start, m.goal)) errors.push("Start and goal must be different cells.");
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (!(m.costs[r][c] > 0) || !Number.isFinite(m.costs[r][c])) errors.push(`Movement cost at (${r}, ${c}) must be positive.`);
  return errors;
}

export function modelStats(m: WarehouseModel) {
  let blocked = 0,
    weighted = 0,
    racks = 0;
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++) {
      if (isBlockedKind(m.tiles[r][c])) blocked++;
      if (m.tiles[r][c] === "rack" || m.tiles[r][c] === "shelf") racks++;
      if (m.costs[r][c] !== 1) weighted++;
    }
  return { blocked, weighted, racks, free: m.rows * m.cols - blocked };
}
