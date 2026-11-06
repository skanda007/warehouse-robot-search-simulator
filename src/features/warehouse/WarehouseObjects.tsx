import React from "react";

/** Reusable top-down warehouse objects. All are drawn in a square cell of size `s` at (x, y). */
interface ObjProps {
  x: number;
  y: number;
  s: number;
}

export function FloorTile({ x, y, s }: ObjProps) {
  return <rect x={x} y={y} width={s} height={s} fill="#0d1013" stroke="#181f26" strokeWidth={0.6} />;
}

export function Rack({ x, y, s }: ObjProps) {
  return (
    <g>
      <FloorTile x={x} y={y} s={s} />
      <rect x={x + 1.5} y={y + 1.5} width={s - 3} height={s - 3} rx={2} fill="#181e24" stroke="#2c3640" strokeWidth={1} />
      <rect x={x + 3} y={y + s * 0.3} width={s - 6} height={2.2} fill="#f59e0b" opacity={0.85} />
      <rect x={x + 3} y={y + s * 0.62} width={s - 6} height={2.2} fill="#f59e0b" opacity={0.85} />
      <rect x={x + 2.5} y={y + 2.5} width={2.5} height={s - 5} fill="#fb923c" />
      <rect x={x + s - 5} y={y + 2.5} width={2.5} height={s - 5} fill="#fb923c" />
    </g>
  );
}

export function Shelf({ x, y, s }: ObjProps) {
  const box = (bx: number, by: number, w: number, h: number, k: number) => (
    <g key={k}>
      <rect x={bx} y={by} width={w} height={h} rx={1} fill="#b47838" stroke="#75481d" strokeWidth={0.8} />
      <rect x={bx + w / 2 - 1} y={by} width={2} height={h} fill="#e5b878" opacity={0.8} />
    </g>
  );
  return (
    <g>
      <Rack x={x} y={y} s={s} />
      {box(x + 7, y + 6, s * 0.3, s * 0.2, 0)}
      {box(x + s * 0.5, y + 6, s * 0.3, s * 0.2, 1)}
      {box(x + 8, y + s * 0.4, s * 0.38, s * 0.18, 2)}
      {box(x + s * 0.55, y + s * 0.68, s * 0.28, s * 0.2, 3)}
      {box(x + 7, y + s * 0.7, s * 0.3, s * 0.18, 4)}
    </g>
  );
}

export function Pallet({ x, y, s }: ObjProps) {
  return (
    <g>
      <FloorTile x={x} y={y} s={s} />
      {[0.18, 0.4, 0.62].map((f, i) => (
        <rect key={i} x={x + 4} y={y + s * f + 3} width={s - 8} height={s * 0.14} fill="#7c5c2d" stroke="#503816" strokeWidth={0.6} />
      ))}
      <rect x={x + 9} y={y + 9} width={s - 18} height={s - 20} rx={1.5} fill="#be8a48" stroke="#7c5c2d" strokeWidth={0.8} />
      <line x1={x + 9} y1={y + s / 2 - 1} x2={x + s - 9} y2={y + s / 2 - 1} stroke="#e4bf83" strokeWidth={1.4} />
    </g>
  );
}

export function ObstacleBlock({ x, y, s, hazard }: ObjProps & { hazard: string }) {
  return (
    <g>
      <FloorTile x={x} y={y} s={s} />
      <rect x={x + 2} y={y + 2} width={s - 4} height={s - 4} rx={3} fill="#20262d" stroke="#485360" strokeWidth={1.2} />
      <rect x={x + 2} y={y + 2} width={s - 4} height={6} rx={2} fill={`url(#${hazard})`} />
      <rect x={x + 2} y={y + s - 8} width={s - 4} height={6} rx={2} fill={`url(#${hazard})`} />
      <path d={`M${x + 12} ${y + 14} L${x + s - 12} ${y + s - 14} M${x + s - 12} ${y + 14} L${x + 12} ${y + s - 14}`} stroke="#343b40" strokeWidth={2} />
    </g>
  );
}

export function Station({ x, y, s, kind }: ObjProps & { kind: "loading" | "unloading" }) {
  const color = kind === "loading" ? "#38c982" : "#ffd23e";
  return (
    <g>
      <FloorTile x={x} y={y} s={s} />
      <rect x={x + 2} y={y + 2} width={s - 4} height={s - 4} rx={3} fill={color} opacity={0.14} stroke={color} strokeWidth={1.3} strokeDasharray="4 3" />
      <path d={kind === "loading" ? `M${x + s / 2} ${y + s * 0.62} l-6 -8 h4 v-8 h4 v8 h4 z` : `M${x + s / 2} ${y + s * 0.3} l-6 8 h4 v8 h4 v-8 h4 z`} fill={color} opacity={0.9} transform={kind === "loading" ? `rotate(180 ${x + s / 2} ${y + s * 0.45})` : undefined} />
      <text x={x + s / 2} y={y + s - 5} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={color} letterSpacing={0.6}>
        {kind === "loading" ? "LOAD" : "UNLOAD"}
      </text>
    </g>
  );
}

export function WeightedTerrain({ x, y, s, cost, hatch }: ObjProps & { cost: number; hatch: string }) {
  const alpha = Math.min(0.55, 0.12 + cost * 0.07);
  return (
    <g>
      <FloorTile x={x} y={y} s={s} />
      <rect x={x} y={y} width={s} height={s} fill="#ffd23e" opacity={alpha} />
      <rect x={x} y={y} width={s} height={s} fill={`url(#${hatch})`} opacity={0.6} />
      <text x={x + s - 4} y={y + s - 4.5} textAnchor="end" fontSize={11} fontWeight={800} fill="#fef08a" stroke="#0a0b0c" strokeWidth={2.5} paintOrder="stroke">
        {Number.isInteger(cost) ? cost : cost.toFixed(1)}
      </text>
    </g>
  );
}
