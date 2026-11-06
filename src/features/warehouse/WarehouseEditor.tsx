"use client";

import React, { useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Bot, BrickWall, Copy, Download, Eraser, Flag, Layers, Package, Redo2, Route, Save, Trash2, Undo2, Upload, Boxes } from "lucide-react";
import { useStore } from "@/store/useStore";
import { modelStats, MAX_DIM, MIN_DIM, type Tool } from "@/lib/warehouse";
import { Button, Card, cx } from "@/components/common/ui";

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { id: "start", label: "Place Robot", icon: Bot, hint: "Click a free floor cell to dock the robot (start state S)." },
  { id: "goal", label: "Place Destination", icon: Flag, hint: "Click an accessible aisle cell in front of the requested shelf (goal state G)." },
  { id: "obstacle", label: "Add Obstacle", icon: BrickWall, hint: "Click or drag to place blocked obstacles." },
  { id: "remove_obstacle", label: "Remove Obstacle", icon: Trash2, hint: "Click an obstacle or pallet to restore traversable floor." },
  { id: "rack", label: "Add Storage Rack", icon: Boxes, hint: "Click or drag to place rack frames. Use the brush size for larger footprints." },
  { id: "shelf", label: "Add Shelf", icon: Package, hint: "Click or drag to place shelf compartments (goods on a rack)." },
  { id: "floor", label: "Aisle / Floor", icon: Route, hint: "Restore normal floor (cost 1) — clears racks, obstacles and terrain." },
  { id: "terrain", label: "Weighted Terrain", icon: Layers, hint: "Apply the selected movement cost to floor cells (click or drag)." },
  { id: "loading", label: "Loading Station", icon: ArrowDownToLine, hint: "Mark a traversable loading dock bay." },
  { id: "unloading", label: "Unloading Station", icon: ArrowUpFromLine, hint: "Mark a traversable unloading dock bay." },
  { id: "erase", label: "Erase Cell", icon: Eraser, hint: "Reset the cell to empty floor." },
];

export function EditorToolbar() {
  const tool = useStore((s) => s.tool);
  const cost = useStore((s) => s.cost);
  const brush = useStore((s) => s.brush);
  const { setTool, setCost, setBrush } = useStore.getState();
  const hint = TOOLS.find((t) => t.id === tool)?.hint;
  const multi = tool === "obstacle" || tool === "rack" || tool === "shelf" || tool === "floor" || tool === "terrain" || tool === "erase" || tool === "remove_obstacle";

  return (
    <div className="space-y-4" data-testid="editor-toolbar">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              aria-pressed={active}
              data-testid={`tool-${t.id}`}
              title={t.hint}
              className={cx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wider transition duration-150",
                active
                  ? "border-volt bg-volt text-[#0a0b0c] shadow-lg shadow-volt/20 font-black"
                  : "border-line bg-raised text-ink hover:border-volt/60 hover:text-volt",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line/40 pt-3 text-xs">
        {tool === "terrain" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-wider text-muted">Movement cost:</span>
            {[1, 2, 3, 5, 8].map((c) => (
              <button
                key={c}
                onClick={() => setCost(c)}
                aria-pressed={cost === c}
                data-testid={`cost-${c}`}
                className={cx(
                  "h-8 w-8 rounded-md border font-extrabold tabular-nums transition",
                  cost === c ? "border-volt bg-volt text-[#0a0b0c]" : "border-line bg-raised text-ink hover:border-volt/60",
                )}
              >
                {c}
              </button>
            ))}
            <input
              type="number"
              min={1}
              step={1}
              value={cost}
              aria-label="Custom movement cost"
              data-testid="cost-input"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) setCost(v);
              }}
              className="h-8 w-16 rounded-md border border-line bg-surface px-2 text-center text-xs font-bold text-ink focus:border-volt focus:outline-none"
            />
          </div>
        )}
        {multi && (
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-wider text-muted">Brush footprint:</span>
            {[1, 2, 3].map((b) => (
              <button
                key={b}
                onClick={() => setBrush(b)}
                aria-pressed={brush === b}
                className={cx(
                  "h-8 rounded-md border px-2.5 font-extrabold transition",
                  brush === b ? "border-volt bg-volt text-[#0a0b0c]" : "border-line bg-raised text-ink hover:border-volt/60",
                )}
              >
                {b}×{b}
              </button>
            ))}
          </div>
        )}
        <p className="min-w-[220px] flex-1 text-xs font-medium text-muted">{hint}</p>
      </div>
    </div>
  );
}

export function ConfigPanel() {
  const model = useStore((s) => s.model);
  const { resize, rename } = useStore.getState();
  const [rows, setRows] = useState<string>("");
  const [cols, setCols] = useState<string>("");
  const stats = modelStats(model);
  const rv = rows === "" ? String(model.rows) : rows;
  const cv = cols === "" ? String(model.cols) : cols;
  const apply = () => {
    resize(Number(rv), Number(cv));
    setRows("");
    setCols("");
  };
  return (
    <Card title="Warehouse Configuration" subtitle="Dimensions & telemetry">
      <label className="mb-4 block text-xs font-extrabold uppercase tracking-wider text-muted">
        Warehouse Layout Name
        <input
          value={model.name}
          onChange={(e) => rename(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink focus:border-volt focus:outline-none"
          aria-label="Warehouse name"
        />
      </label>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2.5">
        <label className="text-xs font-extrabold uppercase tracking-wider text-muted">
          Rows
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            value={rv}
            onChange={(e) => setRows(e.target.value)}
            data-testid="cfg-rows"
            className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm font-bold text-ink focus:border-volt focus:outline-none"
          />
        </label>
        <label className="text-xs font-extrabold uppercase tracking-wider text-muted">
          Columns
          <input
            type="number"
            min={MIN_DIM}
            max={MAX_DIM}
            value={cv}
            onChange={(e) => setCols(e.target.value)}
            data-testid="cfg-cols"
            className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm font-bold text-ink focus:border-volt focus:outline-none"
          />
        </label>
        <Button variant="primary" onClick={apply} data-testid="cfg-apply">
          Resize
        </Button>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/50 pt-4 text-xs font-semibold">
        <dt className="text-muted uppercase">Start Bay (Robot)</dt>
        <dd className="text-right font-mono font-bold text-volt">
          ({model.start[0]}, {model.start[1]})
        </dd>
        <dt className="text-muted uppercase">Goal Cell</dt>
        <dd className="text-right font-mono font-bold text-[#ffd23e]">
          ({model.goal[0]}, {model.goal[1]})
        </dd>
        <dt className="text-muted uppercase">Target Shelf</dt>
        <dd className="text-right font-mono font-bold text-ink">
          {model.target ? `(${model.target[0]}, ${model.target[1]})` : "none"}
        </dd>
        <dt className="text-muted uppercase">Blocked Cells</dt>
        <dd className="text-right font-bold tabular-nums text-ink">{stats.blocked}</dd>
        <dt className="text-muted uppercase">Racks / Shelves</dt>
        <dd className="text-right font-bold tabular-nums text-ink">{stats.racks}</dd>
        <dt className="text-muted uppercase">Weighted Cells</dt>
        <dd className="text-right font-bold tabular-nums text-ink">{stats.weighted}</dd>
        <dt className="text-muted uppercase">Free Aisles</dt>
        <dd className="text-right font-bold tabular-nums text-ink">{stats.free}</dd>
      </dl>
    </Card>
  );
}

export function MapManager() {
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const saved = useStore((s) => s.saved);
  const { undo, redo, clearObstacles, resetMap, saveMap, duplicate, exportJson, importJson, loadSaved, deleteSaved } = useStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(useStore.getState().model.name || "warehouse").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card title="Map Manager" subtitle="History, export & storage">
      <div className="grid grid-cols-2 gap-2">
        <Button icon={<Undo2 className="h-4 w-4" />} onClick={undo} disabled={!past} data-testid="map-undo">Undo</Button>
        <Button icon={<Redo2 className="h-4 w-4" />} onClick={redo} disabled={!future} data-testid="map-redo">Redo</Button>
        <Button icon={<Trash2 className="h-4 w-4" />} onClick={clearObstacles} data-testid="map-clear">Clear blocks</Button>
        <Button variant="danger" onClick={resetMap} data-testid="map-reset">Reset map</Button>
        <Button icon={<Save className="h-4 w-4" />} onClick={saveMap} data-testid="map-save">Save layout</Button>
        <Button icon={<Copy className="h-4 w-4" />} onClick={duplicate}>Duplicate</Button>
        <Button icon={<Download className="h-4 w-4" />} onClick={download} data-testid="map-export">Export JSON</Button>
        <Button icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Import JSON</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="map-import"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await importJson(await file.text());
            e.target.value = "";
          }}
        />
      </div>
      {saved.length > 0 && (
        <div className="mt-5 border-t border-line/50 pt-4">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Browser Saved Maps</div>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {saved.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-xs">
                <button onClick={() => loadSaved(m.id)} className="min-w-0 flex-1 truncate text-left font-bold text-ink hover:text-volt transition">
                  {m.name}
                </button>
                <span className="font-mono text-muted">{m.warehouse.rows}×{m.warehouse.cols}</span>
                <button onClick={() => deleteSaved(m.id)} aria-label={`Delete ${m.name}`} className="text-muted hover:text-[#ff5a63] transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
