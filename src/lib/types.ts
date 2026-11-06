export type Cell = [number, number];
export type AlgoId = "BFS" | "DFS" | "UCS";
export const ALGO_IDS: AlgoId[] = ["BFS", "DFS", "UCS"];

/** Warehouse as exchanged with the Python engine. */
export interface WireWarehouse {
  name: string;
  rows: number;
  cols: number;
  start: Cell;
  goal: Cell;
  obstacles: Cell[];
  racks: Cell[];
  shelves: Cell[];
  pallets: Cell[];
  loading: Cell[];
  unloading: Cell[];
  terrain_costs: Record<string, number>;
  target_shelf: Cell | null;
}

export interface PresetSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rows: number;
  cols: number;
  reachable: boolean;
  obstacle_cells: number;
  weighted_cells: number;
}
export interface PresetDetail extends PresetSummary {
  warehouse: WireWarehouse;
}

export type NeighborResult = "discovered" | "relaxed" | "repush" | "ignored" | "blocked" | "out_of_bounds";
export interface NeighborRec {
  action: string | null;
  state: Cell;
  result: NeighborResult;
  id?: number;
  g?: number;
  old_g?: number;
  old_parent?: Cell | null;
  best_g?: number;
  reason?: string;
}

export interface SearchEvent {
  step: number;
  type: "init" | "expand" | "skip" | "complete";
  current?: Cell | null;
  parent?: Cell | null;
  g?: number;
  depth?: number;
  pop_id?: number;
  expanded_count?: number;
  generated_count?: number;
  goal_found?: boolean;
  neighbors?: NeighborRec[];
  frontier_size?: number;
  reason?: string;
  best_g?: number;
  structure?: string;
  start?: Cell;
  goal?: Cell;
  success?: boolean;
  path?: Cell[];
  path_length?: number;
  total_cost?: number;
}

export interface TreeNodeData {
  state: Cell;
  parent: Cell | null;
  depth: number;
  g: number;
  order: number | null;
  status: "expanded" | "frontier" | "goal";
}

export interface AlgoInfo {
  id: AlgoId;
  name: string;
  frontier: string;
  structure: "queue" | "stack" | "priority_queue";
  optimal_for: string;
  complete: boolean;
  summary: string;
}

export interface ResultCore {
  algorithm: AlgoId;
  success: boolean;
  path: Cell[];
  directions: string[];
  path_length: number;
  total_cost: number;
  expanded_nodes: number;
  generated_nodes: number;
  max_frontier_size: number;
  execution_time_ms: number;
  search_effort: number;
  exploration_sequence: Cell[];
  parent_map: { state: Cell; parent: Cell | null }[];
  search_tree: { nodes: TreeNodeData[]; edges: { source: Cell; target: Cell }[] };
}

export interface SearchResultData extends ResultCore {
  events: SearchEvent[];
  info: AlgoInfo;
  structure: "queue" | "stack" | "priority_queue";
  grid: { rows: number; cols: number };
}

export interface ProgressionPoint {
  step: number;
  frontier: number;
  expanded: number;
  generated: number;
}

export interface CompareData {
  grid: { rows: number; cols: number };
  results: Record<AlgoId, ResultCore>;
  progression: Record<AlgoId, ProgressionPoint[]>;
  interpretation: string[];
}

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary?: { rows: number; cols: number; blocked_cells: number; weighted_cells: number; reachable: boolean };
}

export interface ExperimentDef {
  id: string;
  title: string;
  description: string;
  kind: string;
  defaults: {
    rows: number;
    cols: number;
    density: number;
    cost_distribution: Record<string, number>;
    trials: number;
    seed: number;
    sizes?: [number, number][];
  };
}

export interface Stat3 {
  mean: number | null;
  median: number | null;
  std: number | null;
}
export interface ExperimentSummaryRow {
  size: string;
  rows: number;
  cols: number;
  algorithm: AlgoId;
  trials: number;
  successes: number;
  success_rate: number;
  metrics: Record<string, Stat3>;
}

export interface ExperimentConfigInput {
  experiment_id: string;
  trials: number;
  rows: number;
  cols: number;
  density: number;
  seed: number;
  cost_distribution: Record<string, number>;
  sizes?: [number, number][];
}

export interface ExperimentRun {
  experiment: { id: string; title: string; description: string };
  config: Omit<ExperimentConfigInput, "experiment_id"> & { sizes: [number, number][] };
  synthetic: boolean;
  note: string;
  raw: Record<string, number | string | boolean | null>[];
  summary: ExperimentSummaryRow[];
  sample: { warehouse: WireWarehouse; paths: Record<AlgoId, Cell[]>; label: string } | null;
  csv: { raw: string; summary: string };
}
