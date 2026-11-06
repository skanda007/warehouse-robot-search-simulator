"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { usePlayback } from "@/hooks/usePlayback";
import { layoutTree } from "@/lib/treeLayout";
import { STATE_COLORS } from "@/lib/theme";
import { Button, Card, LegendGroup, LegendItem, Pill } from "@/components/common/ui";

function Inner() {
  const result = useStore((s) => s.result)!;
  const view = usePlayback();
  const { fitView, setCenter, getZoom } = useReactFlow();
  const [showExpanded, setShowExpanded] = useState(true);
  const [showFrontier, setShowFrontier] = useState(true);
  const [onlySolution, setOnlySolution] = useState(false);
  const [follow, setFollow] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const cols = result.grid.cols;
  const frame = view.frame!;

  const layout = useMemo(() => layoutTree(result.search_tree.nodes, cols), [result, cols]);
  const pos = useMemo(() => new Map(layout.nodes.map((n) => [n.idx, n])), [layout]);
  const solution = useMemo(() => new Set(result.success ? result.path.map((c) => c[0] * cols + c[1]) : []), [result, cols]);
  const done = view.showRoute || frame.complete;
  const curIdx = frame.current ? frame.idx(frame.current) : -1;

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const visible = new Set<number>();
    for (const n of layout.nodes) {
      const st = frame.status[n.idx];
      if (st === 0) continue;
      const isSol = done && solution.has(n.idx);
      if (onlySolution && !isSol) continue;
      if (!onlySolution && !isSol) {
        if (st === 2 && !showExpanded && n.idx !== curIdx) continue;
        if (st === 1 && !showFrontier) continue;
      }
      visible.add(n.idx);
      const isCur = n.idx === curIdx;
      const bg = isCur ? STATE_COLORS.current : isSol ? "#122a1c" : st === 2 ? "#162338" : "#2e2410";
      const fg = isCur ? "#0a0b0c" : isSol ? "#6ee7b7" : st === 2 ? "#7db0ff" : "#ffd23e";
      const order = frame.order[n.idx];
      const g = frame.g[n.idx];
      ns.push({
        id: String(n.idx),
        position: { x: n.x, y: n.y },
        draggable: false,
        data: {
          label: (
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 800 }}>
                ({n.state[0]},{n.state[1]})
              </div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>
                {order > 0 ? `#${order} · ` : "pending · "}
                {result.algorithm === "UCS" || g >= 0 ? `g=${g}` : ""}
              </div>
            </div>
          ),
        },
        style: {
          width: 80,
          padding: "5px 4px",
          borderRadius: 8,
          background: bg,
          color: fg,
          fontSize: 11,
          border: isSol
            ? `2px solid ${STATE_COLORS.route}`
            : isCur
              ? "2px solid #ffffff"
              : n.idx === picked
                ? "2px solid #c8ff2e"
                : "1px solid #2a2e33",
          boxShadow: isCur
            ? "0 0 16px 2px rgba(255,155,66,.8)"
            : isSol
              ? "0 0 12px rgba(56,201,130,.5)"
              : "none",
        },
      });
    }
    const es: Edge[] = [];
    for (const n of layout.nodes) {
      if (!visible.has(n.idx)) continue;
      const p = frame.parent[n.idx];
      if (p < 0 || !visible.has(p)) continue;
      const sol = done && solution.has(n.idx) && solution.has(p);
      const relaxed = frame.relaxed[n.idx] === 1;
      es.push({
        id: `e${p}-${n.idx}`,
        source: String(p),
        target: String(n.idx),
        type: "smoothstep",
        animated: n.idx === curIdx,
        style: {
          stroke: sol ? STATE_COLORS.route : relaxed ? "#ffd23e" : "#38414a",
          strokeWidth: sol ? 3.5 : 1.8,
          strokeDasharray: relaxed ? "6 4" : undefined,
        },
      });
    }
    return { nodes: ns, edges: es };
  }, [layout, frame, done, solution, onlySolution, showExpanded, showFrontier, curIdx, picked, result.algorithm]);

  useEffect(() => {
    if (!follow || curIdx < 0) return;
    const p = pos.get(curIdx);
    if (p) setCenter(p.x + 39, p.y + 20, { zoom: Math.max(0.5, Math.min(getZoom(), 1.1)), duration: 180 });
  }, [follow, curIdx, pos, setCenter, getZoom]);

  const info = hover ?? picked;
  const node = info !== null ? result.search_tree.nodes.find((n) => n.state[0] * cols + n.state[1] === info) : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button active={showExpanded} onClick={() => setShowExpanded((v) => !v)} className="!px-3 !py-1.5 text-xs">
          Expanded
        </Button>
        <Button active={showFrontier} onClick={() => setShowFrontier((v) => !v)} className="!px-3 !py-1.5 text-xs">
          Frontier
        </Button>
        <Button active={onlySolution} onClick={() => setOnlySolution((v) => !v)} disabled={!result.success || !done} className="!px-3 !py-1.5 text-xs">
          Solution Path Only
        </Button>
        <Button active={follow} onClick={() => setFollow((v) => !v)} className="!px-3 !py-1.5 text-xs">
          Follow Current
        </Button>
        <Button icon={<Maximize2 className="h-3.5 w-3.5" />} onClick={() => fitView({ padding: 0.2, duration: 300, maxZoom: 1.2 })} className="!px-3 !py-1.5 text-xs">
          Fit to Screen
        </Button>
        {layout.truncated && <Pill tone="warn">Showing {layout.nodes.length} of {layout.total} nodes</Pill>}
      </div>
      <div className="relative h-[520px] overflow-hidden rounded-xl border border-line bg-[#0a0b0c]" data-testid="search-tree">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
          minZoom={0.05}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) => setPicked(Number(n.id))}
          onNodeMouseEnter={(_, n) => setHover(Number(n.id))}
          onNodeMouseLeave={() => setHover(null)}
          onPaneClick={() => setPicked(null)}
        >
          <Background color="#1c2126" gap={24} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => (n.id === String(curIdx) ? STATE_COLORS.current : "#4b8cff")}
            maskColor="rgba(10,11,12,.8)"
            style={{ background: "#121517", border: "1px solid #2a2e33" }}
          />
        </ReactFlow>
        <div className="pointer-events-none absolute left-3 top-3 max-w-[280px] rounded-lg border border-line bg-surface/95 px-3.5 py-2.5 text-xs text-ink shadow-xl backdrop-blur">
          {node ? (
            <div data-testid="tree-node-info" className="space-y-1">
              <div className="font-mono text-sm font-extrabold text-volt">State ({node.state[0]}, {node.state[1]})</div>
              <div className="text-muted">
                depth {node.depth} · cost {frame.g[node.state[0] * cols + node.state[1]]} · parent {node.parent ? `(${node.parent[0]}, ${node.parent[1]})` : "root"}
              </div>
              <div className="text-muted">
                {frame.order[node.state[0] * cols + node.state[1]] > 0 ? `expanded #${frame.order[node.state[0] * cols + node.state[1]]}` : "pending on frontier"}
              </div>
            </div>
          ) : (
            <span className="font-semibold text-muted">Hover or click a node to inspect state</span>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line/50 pt-4">
        <LegendGroup title="Tree nodes">
          <LegendItem color={STATE_COLORS.current} label="Current expansion" />
          <LegendItem color="#7db0ff" label="Expanded" />
          <LegendItem color="#ffd23e" label="Frontier / pending" />
          <LegendItem color="#38c982" label="Solution branch" />
        </LegendGroup>
        <LegendGroup title="Edges">
          <LegendItem color="#485360" label="Parent → child" shape="line" />
          <LegendItem color="#ffd23e" label="Cost-relaxed parent" shape="line" dashed />
          <LegendItem color={STATE_COLORS.route} label="Final route" shape="line" />
        </LegendGroup>
      </div>
    </>
  );
}

export function SearchTree() {
  const result = useStore((s) => s.result);
  return (
    <Card title="Interactive Search Tree" subtitle="Parent pointer hierarchy synchronized with playback step">
      {result ? (
        <ReactFlowProvider key={`${result.algorithm}-${result.events.length}-${result.execution_time_ms}`}>
          <Inner />
        </ReactFlowProvider>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">The search tree appears here once a search has run.</p>
      )}
    </Card>
  );
}
