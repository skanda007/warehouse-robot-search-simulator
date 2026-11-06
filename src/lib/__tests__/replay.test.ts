import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Replayer } from "../replay";
import { explainEvent } from "../explain";
import { layoutTree } from "../treeLayout";
import { playbackView } from "@/store/useStore";
import type { AlgoId, SearchResultData } from "../types";

const backend = path.join(process.cwd(), "backend");
const pyBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");

function engine(op: string, payload?: unknown) {
  const out = execFileSync(pyBin, ["cli.py"], { cwd: backend, input: JSON.stringify({ op, payload }), maxBuffer: 1 << 28 });
  return JSON.parse(out.toString()) as { status: number; body: any };
}
function search(preset: string, algorithm: AlgoId): SearchResultData {
  const wh = engine("preset", preset).body.warehouse;
  return engine("search", { algorithm, warehouse: wh }).body;
}

describe("replay of the real Python event history", () => {
  for (const preset of ["weighted", "multi_route", "unreachable"]) {
    for (const algo of ["BFS", "DFS", "UCS"] as AlgoId[]) {
      it(`${algo} on ${preset}: frames match recorded frontier sizes and totals`, () => {
        const r = search(preset, algo);
        const rep = new Replayer(r.events, r.grid.rows, r.grid.cols);
        r.events.forEach((ev, i) => {
          if (ev.type === "complete") return;
          const f = rep.frameAt(i);
          expect(f.frontier.length).toBe(ev.frontier_size);
          const fresh = new Replayer(r.events, r.grid.rows, r.grid.cols).frameAt(i); // random access == sequential
          expect(Array.from(fresh.status)).toEqual(Array.from(f.status));
        });
        const last = rep.frameAt(r.events.length - 1);
        expect(last.expanded).toBe(r.expanded_nodes);
        expect(last.generated).toBe(r.generated_nodes);
        expect(last.maxFrontier).toBe(r.max_frontier_size);
        expect(last.success).toBe(r.success);
      });
    }
  }

  it("explains events from the actual event data", () => {
    const r = search("simple", "DFS");
    expect(explainEvent("DFS", r.events, 1).text).toMatch(/TOP of the LIFO stack/);
    const b = search("simple", "BFS");
    expect(explainEvent("BFS", b.events, 1).text).toMatch(/FRONT of the FIFO queue/);
    const u = search("simple", "UCS");
    expect(explainEvent("UCS", u.events, 1).text).toMatch(/LOWEST accumulated path cost/);
  });

  it("lays out the search tree with every node positioned", () => {
    const r = search("weighted", "BFS");
    const l = layoutTree(r.search_tree.nodes, r.grid.cols);
    expect(l.nodes.length).toBe(r.generated_nodes);
    expect(new Set(l.nodes.map((n) => `${n.x},${n.y}`)).size).toBe(l.nodes.length);
  });
});

describe("playback timeline (search first, then robot)", () => {
  it("never moves the robot before the goal is found and walks adjacent cells", () => {
    const r = search("weighted", "UCS");
    const E = r.events.length;
    for (let t = 0; t < E; t++) expect(playbackView(r, t, true).inExecution).toBe(false);
    expect(playbackView(r, E - 1, true).phase).toBe("goal_found");
    let prev = r.path[0];
    for (let i = 0; i < r.path.length; i++) {
      const v = playbackView(r, E + i, true);
      expect(v.inExecution).toBe(true);
      const cell = r.path[v.robotIdx];
      expect(Math.abs(cell[0] - prev[0]) + Math.abs(cell[1] - prev[1])).toBeLessThanOrEqual(1);
      prev = cell;
    }
    expect(playbackView(r, E + r.path.length - 1, true).phase).toBe("completed");
  });

  it("unreachable goal: no execution frames", () => {
    const r = search("unreachable", "BFS");
    const v = playbackView(r, r.events.length - 1, true);
    expect(v.phase).toBe("unreachable");
    expect(v.P).toBe(0);
    expect(v.total).toBe(r.events.length);
  });
});
