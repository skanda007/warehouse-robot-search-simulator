"use client";

import { create } from "zustand";
import { api, ApiClientError } from "@/lib/api";
import { Replayer, Frame } from "@/lib/replay";
import type { AlgoId, CompareData, PresetSummary, SearchResultData } from "@/lib/types";
import {
  applyTool,
  blankModel,
  clearObstacles as clearObstaclesOp,
  fromWire,
  resizeModel,
  toWire,
  validateModel,
  type Tool,
  type WarehouseModel,
} from "@/lib/warehouse";

export interface Notice {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}
export interface SavedMap {
  id: string;
  name: string;
  savedAt: number;
  warehouse: ReturnType<typeof toWire>;
}

const SAVED_KEY = "warehouse-autonomy.savedMaps.v1";
const HISTORY_LIMIT = 100;
let noticeSeq = 1;
let strokeBase: WarehouseModel | null = null;
let strokePushed = false;
let strokeErrored = false;

export type ViewMode = "warehouse" | "grid";

interface Store {
  ready: boolean;
  model: WarehouseModel;
  modelVersion: number;
  past: WarehouseModel[];
  future: WarehouseModel[];
  presets: PresetSummary[];
  presetsError: string | null;
  activePreset: string | null;
  loadingPreset: string | null;
  modified: boolean;
  tool: Tool;
  cost: number;
  brush: number;
  viewMode: ViewMode;
  algo: AlgoId;
  result: SearchResultData | null;
  resultVersion: number;
  running: boolean;
  searchError: string | null;
  t: number;
  playing: boolean;
  speed: number;
  compare: CompareData | null;
  compareVersion: number;
  comparing: boolean;
  compareError: string | null;
  notices: Notice[];
  saved: SavedMap[];

  init: () => Promise<void>;
  notify: (kind: Notice["kind"], message: string) => void;
  dismiss: (id: number) => void;
  loadPreset: (id: string) => Promise<boolean>;
  setTool: (t: Tool) => void;
  setCost: (n: number) => void;
  setBrush: (n: number) => void;
  setViewMode: (m: ViewMode) => void;
  setAlgo: (a: AlgoId) => void;
  beginStroke: () => void;
  paint: (cell: [number, number]) => void;
  endStroke: () => void;
  undo: () => void;
  redo: () => void;
  resize: (rows: number, cols: number) => void;
  clearObstacles: () => void;
  resetMap: () => void;
  rename: (name: string) => void;
  saveMap: () => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  duplicate: () => void;
  exportJson: () => string;
  importJson: (text: string) => Promise<boolean>;
  runSearch: (algo?: AlgoId) => Promise<boolean>;
  runCompare: () => Promise<boolean>;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  reset: () => void;
  replay: () => void;
  final: () => void;
  setSpeed: (s: number) => void;
}

const invalidated = { result: null, t: 0, playing: false, compare: null, searchError: null, compareError: null } as const;

function readSaved(): SavedMap[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedMap[]) : [];
  } catch {
    return [];
  }
}
function writeSaved(list: SavedMap[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function timelineOf(result: SearchResultData | null) {
  if (!result) return { E: 0, P: 0, total: 0 };
  const E = result.events.length;
  const P = result.success ? result.path.length : 0;
  return { E, P, total: E + P };
}

export const useStore = create<Store>((set, get) => {
  const commit = (model: WarehouseModel, pushHistory: boolean, extra: Partial<Store> = {}) => {
    const s = get();
    set({
      model,
      modelVersion: s.modelVersion + 1,
      past: pushHistory ? [...s.past, s.model].slice(-HISTORY_LIMIT) : s.past,
      future: pushHistory ? [] : s.future,
      modified: true,
      ...invalidated,
      ...extra,
    });
  };

  return {
    ready: false,
    model: blankModel(8, 12),
    modelVersion: 0,
    past: [],
    future: [],
    presets: [],
    presetsError: null,
    activePreset: null,
    loadingPreset: null,
    modified: false,
    tool: "obstacle",
    cost: 3,
    brush: 1,
    viewMode: "warehouse",
    algo: "BFS",
    result: null,
    resultVersion: -1,
    running: false,
    searchError: null,
    t: 0,
    playing: false,
    speed: 1,
    compare: null,
    compareVersion: -1,
    comparing: false,
    compareError: null,
    notices: [],
    saved: [],

    init: async () => {
      if (get().ready || get().loadingPreset) return;
      set({ saved: readSaved() });
      try {
        const presets = await api.presets();
        set({ presets, presetsError: null });
      } catch (e) {
        set({ presetsError: e instanceof Error ? e.message : "Could not load presets", ready: true });
        get().notify("error", "Could not load warehouse presets from the engine.");
        return;
      }
      const ok = await get().loadPreset("simple");
      set({ ready: true });
      if (!ok) get().notify("error", "The default warehouse could not be loaded.");
    },

    notify: (kind, message) => set((s) => ({ notices: [...s.notices.slice(-3), { id: noticeSeq++, kind, message }] })),
    dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),

    loadPreset: async (id) => {
      set({ loadingPreset: id });
      try {
        const detail = await api.preset(id);
        const model = fromWire(detail.warehouse);
        const errors = validateModel(model);
        if (errors.length) throw new Error(`Preset "${detail.name}" is invalid: ${errors[0]}`);
        // atomic replace of the whole environment + reset of stale search state
        set((s) => ({
          model,
          modelVersion: s.modelVersion + 1,
          past: [],
          future: [],
          activePreset: id,
          loadingPreset: null,
          modified: false,
          ...invalidated,
        }));
        get().notify("success", `Loaded "${detail.name}" — ${detail.rows} × ${detail.cols} grid, search history reset.`);
        return true;
      } catch (e) {
        set({ loadingPreset: null });
        get().notify("error", `Preset not loaded: ${e instanceof Error ? e.message : "unknown error"}. Current warehouse unchanged.`);
        return false;
      }
    },

    setTool: (tool) => set({ tool }),
    setCost: (cost) => set({ cost }),
    setBrush: (brush) => set({ brush }),
    setViewMode: (viewMode) => set({ viewMode }),
    setAlgo: (algo) => set({ algo }),

    beginStroke: () => {
      strokeBase = get().model;
      strokePushed = false;
      strokeErrored = false;
    },
    paint: (cell) => {
      const s = get();
      const res = applyTool(s.model, s.tool, cell, { cost: s.cost, brush: s.brush });
      if (res.error && !strokeErrored) {
        strokeErrored = true;
        get().notify("error", res.error);
      }
      if (!res.changed) return;
      if (!strokePushed && strokeBase) {
        set({ past: [...s.past, strokeBase].slice(-HISTORY_LIMIT), future: [] });
        strokePushed = true;
      }
      commit(res.model, false);
    },
    endStroke: () => {
      strokeBase = null;
    },
    undo: () => {
      const s = get();
      if (!s.past.length) return;
      const prev = s.past[s.past.length - 1];
      set({ model: prev, past: s.past.slice(0, -1), future: [s.model, ...s.future], modelVersion: s.modelVersion + 1, modified: true, ...invalidated });
    },
    redo: () => {
      const s = get();
      if (!s.future.length) return;
      const [next, ...rest] = s.future;
      set({ model: next, future: rest, past: [...s.past, s.model], modelVersion: s.modelVersion + 1, modified: true, ...invalidated });
    },
    resize: (rows, cols) => {
      const res = resizeModel(get().model, rows, cols);
      if (res.error) return get().notify("error", res.error);
      if (res.changed) commit(res.model, true);
    },
    clearObstacles: () => commit(clearObstaclesOp(get().model), true),
    resetMap: () => {
      const id = get().activePreset;
      if (id) void get().loadPreset(id);
      else commit(blankModel(get().model.rows, get().model.cols, get().model.name), true);
    },
    rename: (name) => set((s) => ({ model: { ...s.model, name: name.slice(0, 80) } })),

    saveMap: () => {
      const s = get();
      const entry: SavedMap = { id: `map-${Date.now()}`, name: s.model.name || "Untitled warehouse", savedAt: Date.now(), warehouse: toWire(s.model) };
      const saved = [entry, ...s.saved.filter((m) => m.name !== entry.name)];
      writeSaved(saved);
      set({ saved });
      get().notify("success", `Saved "${entry.name}" in this browser.`);
    },
    loadSaved: (id) => {
      const entry = get().saved.find((m) => m.id === id);
      if (!entry) return;
      try {
        const model = fromWire(entry.warehouse);
        const errors = validateModel(model);
        if (errors.length) throw new Error(errors[0]);
        commit(model, true, { activePreset: null });
        get().notify("success", `Loaded saved warehouse "${entry.name}".`);
      } catch (e) {
        get().notify("error", `Saved map could not be loaded: ${e instanceof Error ? e.message : "invalid data"}`);
      }
    },
    deleteSaved: (id) => {
      const saved = get().saved.filter((m) => m.id !== id);
      writeSaved(saved);
      set({ saved });
    },
    duplicate: () => {
      const s = get();
      const name = `${s.model.name} (copy)`.slice(0, 80);
      const copy: SavedMap = { id: `map-${Date.now()}`, name, savedAt: Date.now(), warehouse: { ...toWire(s.model), name } };
      const saved = [copy, ...s.saved.filter((m) => m.name !== name)];
      writeSaved(saved);
      set({ saved, model: { ...s.model, name } });
      get().notify("success", `Duplicated as "${name}" and saved in this browser.`);
    },
    exportJson: () => JSON.stringify({ format: "warehouse-autonomy/v1", warehouse: toWire(get().model) }, null, 2),
    importJson: async (text) => {
      try {
        const parsed = JSON.parse(text);
        const wire = parsed && typeof parsed === "object" && "warehouse" in parsed ? parsed.warehouse : parsed;
        const check = await api.validate(wire);
        if (!check.valid) {
          get().notify("error", `Import rejected: ${check.errors.slice(0, 3).join("; ")}`);
          return false;
        }
        commit(fromWire(wire), true, { activePreset: null });
        get().notify("success", `Imported "${wire.name ?? "warehouse"}".${check.warnings.length ? ` Note: ${check.warnings[0]}` : ""}`);
        return true;
      } catch (e) {
        get().notify("error", e instanceof SyntaxError ? "Import rejected: the file is not valid JSON." : e instanceof Error ? `Import rejected: ${e.message}` : "Import failed.");
        return false;
      }
    },

    runSearch: async (algoArg) => {
      const s = get();
      const algo = algoArg ?? s.algo;
      const errors = validateModel(s.model);
      if (errors.length) {
        set({ searchError: errors[0] });
        get().notify("error", errors[0]);
        return false;
      }
      const version = s.modelVersion;
      set({ running: true, searchError: null, algo, playing: false });
      try {
        const result = await api.search(algo, toWire(s.model));
        if (get().modelVersion !== version) {
          set({ running: false });
          return false; // map changed while the engine was working: discard the stale result
        }
        set({ result, resultVersion: version, running: false, t: 0, playing: true });
        return true;
      } catch (e) {
        const message = e instanceof ApiClientError ? [e.message, ...e.details.slice(0, 2)].join(" ") : "Search failed.";
        set({ running: false, searchError: message });
        get().notify("error", message);
        return false;
      }
    },
    runCompare: async () => {
      const s = get();
      const errors = validateModel(s.model);
      if (errors.length) {
        set({ compareError: errors[0] });
        return false;
      }
      const version = s.modelVersion;
      set({ comparing: true, compareError: null });
      try {
        const compare = await api.compare(toWire(s.model));
        if (get().modelVersion !== version) {
          set({ comparing: false });
          return false;
        }
        set({ compare, compareVersion: version, comparing: false });
        return true;
      } catch (e) {
        set({ comparing: false, compareError: e instanceof Error ? e.message : "Comparison failed." });
        return false;
      }
    },

    play: () => {
      const s = get();
      const { total } = timelineOf(s.result);
      if (!s.result) return;
      set({ playing: true, t: s.t >= total - 1 ? 0 : s.t });
    },
    pause: () => set({ playing: false }),
    next: () => {
      const s = get();
      const { total } = timelineOf(s.result);
      if (s.t < total - 1) set({ t: s.t + 1 });
      else set({ playing: false });
    },
    prev: () => set((s) => ({ t: Math.max(0, s.t - 1), playing: false })),
    seek: (t) => {
      const { total } = timelineOf(get().result);
      set({ t: Math.max(0, Math.min(total - 1, Math.round(t))), playing: false });
    },
    reset: () => set({ t: 0, playing: false }),
    replay: () => set({ t: 0, playing: true }),
    final: () => set({ t: Math.max(0, timelineOf(get().result).total - 1), playing: false }),
    setSpeed: (speed) => set({ speed }),
  };
});

/* ---- derived helpers ---------------------------------------------------------------- */
const replayers = new WeakMap<SearchResultData, Replayer>();
export function frameFor(result: SearchResultData, step: number): Frame {
  let r = replayers.get(result);
  if (!r) {
    r = new Replayer(result.events, result.grid.rows, result.grid.cols);
    replayers.set(result, r);
  }
  return r.frameAt(step);
}

export type Phase = "ready" | "loaded" | "searching" | "goal_found" | "unreachable" | "moving" | "completed";

export interface PlaybackView {
  phase: Phase;
  searchStep: number;
  frame: Frame | null;
  robotIdx: number;
  inExecution: boolean;
  showRoute: boolean;
  E: number;
  P: number;
  total: number;
}

export function playbackView(result: SearchResultData | null, t: number, ready: boolean): PlaybackView {
  if (!result) return { phase: ready ? "loaded" : "ready", searchStep: 0, frame: null, robotIdx: 0, inExecution: false, showRoute: false, E: 0, P: 0, total: 0 };
  const { E, P, total } = timelineOf(result);
  const searchStep = Math.min(t, E - 1);
  const frame = frameFor(result, searchStep);
  const inExecution = t >= E;
  const robotIdx = inExecution ? Math.min(t - E, P - 1) : 0;
  let phase: Phase;
  if (t < E - 1) phase = frame.goalFound ? "goal_found" : "searching";
  else if (!result.success) phase = "unreachable";
  else if (t === E - 1) phase = "goal_found";
  else phase = t >= total - 1 ? "completed" : "moving";
  return { phase, searchStep, frame, robotIdx, inExecution, showRoute: result.success && t >= E - 1, E, P, total };
}

export const PHASE_LABEL: Record<Phase, string> = {
  ready: "System Ready",
  loaded: "Warehouse Loaded",
  searching: "Exploring States",
  goal_found: "Goal Found",
  unreachable: "Destination Unreachable",
  moving: "Robot Moving",
  completed: "Mission Completed",
};
