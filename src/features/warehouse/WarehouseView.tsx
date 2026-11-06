"use client";

import React, { memo, useMemo, useRef, useState } from "react";
import type { AlgoId, Cell } from "@/lib/types";
import type { Frame } from "@/lib/replay";
import { ALGO_COLORS, STATE_COLORS } from "@/lib/theme";
import { isBlockedKind, type WarehouseModel } from "@/lib/warehouse";
import { FloorTile, ObstacleBlock, Pallet, Rack, Shelf, Station, WeightedTerrain } from "./WarehouseObjects";
import { Robot } from "./Robot";

export const CELL = 40;
export const PAD = 22;

export interface RouteOverlay {
  algo: AlgoId;
  path: Cell[];
  visible: boolean;
}
export interface RobotState {
  cell: Cell;
  angle: number;
  moveMs: number;
  scanning: boolean;
}

interface Props {
  model: WarehouseModel;
  mode: "warehouse" | "grid";
  frame?: Frame | null;
  nextCell?: Cell | null;
  path?: Cell[] | null;
  /** index of the robot on `path`; segments before it are drawn as completed */
  pathProgress?: number;
  robot?: RobotState | null;
  routes?: RouteOverlay[];
  editable?: boolean;
  onCellDown?: (c: Cell) => void;
  onCellEnter?: (c: Cell) => void;
  onPointerEnd?: () => void;
  maxCell?: number;
  testId?: string;
}

let uidCounter = 0;
const center = (c: Cell, off = 0) => ({ x: PAD + c[1] * CELL + CELL / 2 + off, y: PAD + c[0] * CELL + CELL / 2 + off });

/* ---------------------------- static floor / objects layer ---------------------------- */
const TilesLayer = memo(function TilesLayer({ model, mode, uid }: { model: WarehouseModel; mode: "warehouse" | "grid"; uid: string }) {
  const { rows, cols } = model;
  const els: React.ReactNode[] = [];
  const hazard = `${uid}-hazard`;
  const hatch = `${uid}-hatch`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      const kind = model.tiles[r][c];
      const cost = model.costs[r][c];
      const key = r * cols + c;
      if (mode === "grid") {
        const fill =
          kind === "obstacle" || kind === "pallet"
            ? "#20262d"
            : kind === "rack" || kind === "shelf"
              ? "#181e24"
              : kind === "loading"
                ? "#112a1d"
                : kind === "unloading"
                  ? "#3a280c"
                  : cost > 1
                    ? `rgba(255,210,62,${Math.min(0.45, 0.12 + cost * 0.07)})`
                    : "#0d1013";
        els.push(
          <g key={key}>
            <rect x={x} y={y} width={CELL} height={CELL} fill={fill} stroke="#1e252c" strokeWidth={0.8} />
            {cols <= 30 && (
              <text x={x + 3} y={y + 9} fontSize={7} fill="#9aa3aa" fontWeight={600}>
                {r},{c}
              </text>
            )}
            {!isBlockedKind(kind) && cost > 1 && (
              <text x={x + CELL - 4} y={y + CELL - 5} textAnchor="end" fontSize={11} fontWeight={800} fill="#fde68a">
                {cost}
              </text>
            )}
            {kind === "rack" || kind === "shelf" ? (
              <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#9aa3aa">
                {kind === "rack" ? "R" : "H"}
              </text>
            ) : kind === "obstacle" || kind === "pallet" ? (
              <text x={x + CELL / 2} y={y + CELL / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#f3f4f1">
                {kind === "pallet" ? "P" : "#"}
              </text>
            ) : kind === "loading" || kind === "unloading" ? (
              <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#f3f4f1">
                {kind === "loading" ? "L" : "U"}
              </text>
            ) : null}
          </g>,
        );
        continue;
      }
      switch (kind) {
        case "rack":
          els.push(<Rack key={key} x={x} y={y} s={CELL} />);
          break;
        case "shelf":
          els.push(<Shelf key={key} x={x} y={y} s={CELL} />);
          break;
        case "pallet":
          els.push(<Pallet key={key} x={x} y={y} s={CELL} />);
          break;
        case "obstacle":
          els.push(<ObstacleBlock key={key} x={x} y={y} s={CELL} hazard={hazard} />);
          break;
        case "loading":
        case "unloading":
          els.push(<Station key={key} x={x} y={y} s={CELL} kind={kind} />);
          break;
        default:
          els.push(cost > 1 ? <WeightedTerrain key={key} x={x} y={y} s={CELL} cost={cost} hatch={hatch} /> : <FloorTile key={key} x={x} y={y} s={CELL} />);
      }
    }
  }

  // aisle labels: horizontal runs of open rows
  const labels: React.ReactNode[] = [];
  if (mode === "warehouse" && cols >= 8) {
    let n = 0;
    let runStart = -1;
    const open = (r: number) => model.tiles[r].filter((k) => !isBlockedKind(k)).length >= cols * 0.8;
    for (let r = 0; r <= rows; r++) {
      const isOpen = r < rows && open(r);
      if (isOpen && runStart < 0) runStart = r;
      if (!isOpen && runStart >= 0) {
        n++;
        const cy = PAD + ((runStart + r) / 2) * CELL;
        labels.push(
          <text key={`a${n}`} x={11} y={cy} fontSize={7.5} fontWeight={800} fill="#9aa3aa" textAnchor="middle" transform={`rotate(-90 11 ${cy})`} letterSpacing={0.8}>
            AISLE {n}
          </text>,
        );
        runStart = -1;
      }
    }
  }

  const rulerCols = Array.from({ length: cols }, (_, c) => (
    <text key={`c${c}`} x={PAD + c * CELL + CELL / 2} y={PAD - 7} textAnchor="middle" fontSize={8} fill="#9aa3aa" fontWeight={700}>
      {c}
    </text>
  ));
  const rulerRows =
    mode === "grid"
      ? Array.from({ length: rows }, (_, r) => (
          <text key={`r${r}`} x={PAD - 6} y={PAD + r * CELL + CELL / 2 + 3} textAnchor="end" fontSize={8} fill="#9aa3aa" fontWeight={700}>
            {r}
          </text>
        ))
      : [];

  return (
    <g>
      <defs>
        <pattern id={hazard} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} fill="#181e24" />
          <rect width={4} height={8} fill="#f59e0b" />
        </pattern>
        <pattern id={hatch} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={2} height={6} fill="#78350f" opacity={0.65} />
        </pattern>
      </defs>
      <rect x={PAD - 4} y={PAD - 4} width={cols * CELL + 8} height={rows * CELL + 8} rx={6} fill="#0a0b0c" stroke="#2a2e33" strokeWidth={2} />
      {els}
      {labels}
      {rulerCols}
      {rulerRows}
    </g>
  );
});

/* ------------------------------ dynamic search overlay -------------------------------- */
function cellsPath(status: Uint8Array, want: number, cols: number): string {
  let d = "";
  for (let i = 0; i < status.length; i++) {
    if (status[i] === want) {
      const x = PAD + (i % cols) * CELL;
      const y = PAD + Math.floor(i / cols) * CELL;
      d += `M${x} ${y}h${CELL}v${CELL}h${-CELL}z`;
    }
  }
  return d;
}

const SearchOverlay = memo(function SearchOverlay({ frame, mode, cols, nextCell }: { frame: Frame; mode: "warehouse" | "grid"; cols: number; nextCell?: Cell | null }) {
  const explored = useMemo(() => cellsPath(frame.status, 2, cols), [frame, cols]);
  const frontier = useMemo(() => cellsPath(frame.status, 1, cols), [frame, cols]);
  const showOrder = mode === "grid" && frame.status.length <= 400;
  const orders: React.ReactNode[] = [];
  if (showOrder) {
    for (let i = 0; i < frame.order.length; i++) {
      if (frame.order[i] > 0) {
        orders.push(
          <text key={i} x={PAD + (i % cols) * CELL + CELL / 2} y={PAD + Math.floor(i / cols) * CELL + CELL / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0a0b0c">
            {frame.order[i]}
          </text>,
        );
      }
    }
  }
  const cur = frame.current;
  return (
    <g pointerEvents="none">
      <path d={explored} fill={STATE_COLORS.explored} opacity={mode === "grid" ? 0.75 : 0.38} />
      <path d={frontier} fill={STATE_COLORS.frontier} opacity={mode === "grid" ? 0.85 : 0.55} />
      {orders}
      {nextCell && (
        <rect x={PAD + nextCell[1] * CELL + 3} y={PAD + nextCell[0] * CELL + 3} width={CELL - 6} height={CELL - 6} rx={3} fill="none" stroke="#f3f4f1" strokeWidth={1.8} strokeDasharray="4 3" />
      )}
      {cur && (
        <g>
          <rect x={PAD + cur[1] * CELL} y={PAD + cur[0] * CELL} width={CELL} height={CELL} fill={STATE_COLORS.current} opacity={0.55} />
          <rect x={PAD + cur[1] * CELL + 1.5} y={PAD + cur[0] * CELL + 1.5} width={CELL - 3} height={CELL - 3} rx={3} fill="none" stroke={STATE_COLORS.current} strokeWidth={2.6} className="wa-pulse" />
        </g>
      )}
    </g>
  );
});

/* -------------------------------------- routes ---------------------------------------- */
function polyline(path: Cell[], off = 0) {
  return path.map((c) => {
    const p = center(c, off);
    return `${p.x},${p.y}`;
  });
}

function RouteLayer({ path, progress }: { path: Cell[]; progress: number }) {
  if (path.length < 2) return null;
  const done = path.slice(0, Math.min(path.length, progress + 1));
  return (
    <g pointerEvents="none">
      <polyline points={polyline(path).join(" ")} fill="none" stroke="#052e16" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
      <polyline points={polyline(path).join(" ")} fill="none" stroke={STATE_COLORS.route} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="7 6" opacity={0.8} />
      {done.length > 1 && <polyline points={polyline(done).join(" ")} fill="none" stroke="#bbf7d0" strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />}
      {path.slice(1).map((c, i) => {
        const p = center(c);
        return <circle key={i} cx={p.x} cy={p.y} r={i < progress ? 3.5 : 2.2} fill={i < progress ? "#ffffff" : STATE_COLORS.route} opacity={i < progress ? 1 : 0.75} />;
      })}
    </g>
  );
}

function ComparisonRoutes({ routes }: { routes: RouteOverlay[] }) {
  const visible = routes.filter((r) => r.visible && r.path.length > 1);
  const counts = new Map<string, number>();
  for (const r of visible) {
    const seen = new Set<string>();
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1];
      const b = r.path[i];
      const k = a[0] + a[1] < b[0] + b[1] || (a[0] + a[1] === b[0] + b[1] && a[0] < b[0]) ? `${a}|${b}` : `${b}|${a}`;
      seen.add(k);
    }
    seen.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  }
  const shared: React.ReactNode[] = [];
  counts.forEach((n, k) => {
    if (n < 2) return;
    const [a, b] = k.split("|").map((s) => s.split(",").map(Number) as Cell);
    const pa = center(a);
    const pb = center(b);
    shared.push(<line key={k} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#f3f4f1" strokeWidth={10} strokeLinecap="round" opacity={0.28} />);
  });
  return (
    <g pointerEvents="none">
      {shared}
      {visible.map((r) => {
        const off = (["BFS", "DFS", "UCS"].indexOf(r.algo) - 1) * 4;
        return <polyline key={r.algo} points={polyline(r.path, off).join(" ")} fill="none" stroke={ALGO_COLORS[r.algo]} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />;
      })}
    </g>
  );
}

/* ------------------------------------- markers ---------------------------------------- */
function Markers({ model, mode }: { model: WarehouseModel; mode: "warehouse" | "grid" }) {
  const s = center(model.start);
  const g = center(model.goal);
  const t = model.target ? center(model.target) : null;
  return (
    <g pointerEvents="none">
      {t && (
        <g>
          <rect x={t.x - CELL / 2 + 1} y={t.y - CELL / 2 + 1} width={CELL - 2} height={CELL - 2} rx={3} fill="none" stroke={STATE_COLORS.destination} strokeWidth={2.4} />
          <line x1={t.x} y1={t.y} x2={g.x} y2={g.y} stroke={STATE_COLORS.destination} strokeWidth={1.4} strokeDasharray="3 3" opacity={0.8} />
          <text x={t.x} y={t.y + 3} textAnchor="middle" fontSize={6.5} fontWeight={800} fill="#fef08a" stroke="#0a0b0c" strokeWidth={2} paintOrder="stroke">
            TARGET
          </text>
        </g>
      )}
      <g>
        <rect x={s.x - CELL / 2 + 2} y={s.y - CELL / 2 + 2} width={CELL - 4} height={CELL - 4} rx={5} fill="#c8ff2e" opacity={0.16} stroke="#c8ff2e" strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={s.x} y={s.y + CELL / 2 - 5} textAnchor="middle" fontSize={7} fontWeight={800} fill="#c8ff2e">
          {mode === "grid" ? "S" : "DOCK"}
        </text>
      </g>
      <g>
        <circle cx={g.x} cy={g.y} r={14} fill="#ffd23e" opacity={0.2} className="wa-pulse" />
        <circle cx={g.x} cy={g.y} r={10} fill="none" stroke={STATE_COLORS.destination} strokeWidth={2.4} />
        <circle cx={g.x} cy={g.y} r={4.5} fill={STATE_COLORS.destination} />
        <text x={g.x} y={g.y + CELL / 2 - 4} textAnchor="middle" fontSize={7} fontWeight={800} fill="#ffd23e" stroke="#0a0b0c" strokeWidth={2} paintOrder="stroke">
          {mode === "grid" ? "G" : "PICK"}
        </text>
      </g>
    </g>
  );
}

/* --------------------------------------- view ----------------------------------------- */
function headingFor(path: Cell[] | null | undefined, idx: number): number {
  if (!path || path.length < 2) return 0;
  const i = Math.max(1, Math.min(idx, path.length - 1));
  const a = path[i - 1];
  const b = path[i];
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  return dc > 0 ? 0 : dr > 0 ? 90 : dc < 0 ? 180 : -90;
}
export { headingFor };

export function WarehouseView({ model, mode, frame, nextCell, path, pathProgress = 0, robot, routes, editable, onCellDown, onCellEnter, onPointerEnd, maxCell = 54, testId = "warehouse-view" }: Props) {
  const [uid] = useState(() => `wv${++uidCounter}`);
  const svgRef = useRef<SVGSVGElement>(null);
  const painting = useRef(false);
  const lastCell = useRef<string>("");
  const [hover, setHover] = useState<Cell | null>(null);
  const vbW = model.cols * CELL + PAD * 2;
  const vbH = model.rows * CELL + PAD * 2;

  const toCell = (e: React.PointerEvent): Cell | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * vbW - PAD;
    const y = ((e.clientY - rect.top) / rect.height) * vbH - PAD;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    return r < 0 || c < 0 || r >= model.rows || c >= model.cols ? null : [r, c];
  };

  const end = () => {
    if (painting.current) {
      painting.current = false;
      lastCell.current = "";
      onPointerEnd?.();
    }
  };

  const robotPos = robot ? center(robot.cell) : null;
  const hoverInfo = hover
    ? `(${hover[0]}, ${hover[1]}) · ${model.tiles[hover[0]][hover[1]]}${!isBlockedKind(model.tiles[hover[0]][hover[1]]) ? ` · cost ${model.costs[hover[0]][hover[1]]}` : ""}`
    : null;

  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: (vbW * maxCell) / CELL }}>
      <svg
        ref={svgRef}
        data-testid={testId}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="block h-auto w-full select-none rounded-xl border border-line bg-[#0a0b0c] shadow-2xl"
        style={{ touchAction: editable ? "none" : "auto", cursor: editable ? "crosshair" : "default" }}
        role="img"
        aria-label={`Warehouse ${model.rows} by ${model.cols}`}
        onPointerDown={(e) => {
          if (!editable) return;
          const c = toCell(e);
          if (!c) return;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          painting.current = true;
          lastCell.current = c.join(",");
          onCellDown?.(c);
        }}
        onPointerMove={(e) => {
          const c = toCell(e);
          setHover((h) => (h && c && h[0] === c[0] && h[1] === c[1] ? h : c));
          if (!editable || !painting.current || !c) return;
          const key = c.join(",");
          if (key === lastCell.current) return;
          lastCell.current = key;
          onCellEnter?.(c);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={() => {
          setHover(null);
        }}
      >
        <TilesLayer model={model} mode={mode} uid={uid} />
        {frame && <SearchOverlay frame={frame} mode={mode} cols={model.cols} nextCell={nextCell} />}
        {routes && routes.length > 0 && <ComparisonRoutes routes={routes} />}
        {path && path.length > 1 && <RouteLayer path={path} progress={pathProgress} />}
        <Markers model={model} mode={mode} />
        {hover && editable && (
          <rect x={PAD + hover[1] * CELL} y={PAD + hover[0] * CELL} width={CELL} height={CELL} fill="#c8ff2e" opacity={0.16} stroke="#c8ff2e" strokeWidth={1.5} pointerEvents="none" />
        )}
        <defs>
          <linearGradient id={`${uid}-robot`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c8ff2e" />
            <stop offset="100%" stopColor="#84a91a" />
          </linearGradient>
        </defs>
        {robot && robotPos && (
          <Robot x={robotPos.x} y={robotPos.y} angle={robot.angle} moveMs={robot.moveMs} scanning={robot.scanning} label="AMR-01" coord={`(${robot.cell[0]}, ${robot.cell[1]})`} gradientId={`${uid}-robot`} />
        )}
      </svg>
      {hoverInfo && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-line bg-surface/95 px-2.5 py-1 text-xs font-mono font-bold text-ink shadow-lg backdrop-blur">{hoverInfo}</div>
      )}
    </div>
  );
}
