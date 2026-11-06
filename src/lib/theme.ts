import type { AlgoId } from "./types";

/** Algorithm identity colours (used for badges, charts, legends and comparison routes). */
export const ALGO_COLORS: Record<AlgoId, string> = {
  BFS: "#4b8cff",
  DFS: "#38c982",
  UCS: "#ff5a63",
};

export const ALGO_LABELS: Record<AlgoId, string> = {
  BFS: "Breadth-First Search",
  DFS: "Depth-First Search",
  UCS: "Uniform-Cost Search",
};

/** Warehouse-state colours (separate legend group from algorithm identity). */
export const STATE_COLORS = {
  robot: "#c8ff2e",
  destination: "#ffd23e",
  obstacle: "#343b40",
  frontier: "#ffd23e",
  explored: "#4b8cff",
  current: "#ff9b42",
  route: "#38c982",
};

export const CHART = {
  grid: "#2a2e33",
  axis: "#9aa3aa",
  text: "#f3f4f1",
  tooltipBg: "#121517",
  tooltipBorder: "#2a2e33",
};
