import type { Cell, SearchEvent } from "./types";

/**
 * Event-history replay.
 * The Python engine records ONE event per frontier pop (with the pushes it caused).
 * This module rebuilds the exact search state (frontier, explored set, parents, costs)
 * at any step from those deltas — it never runs a search itself.
 * Checkpoints every CP events keep random access (slider / previous / next) cheap.
 */
export interface FrontierEntry {
  id: number;
  state: Cell;
  g: number;
  parent: Cell | null;
  depth: number;
  kind: "discovered" | "relaxed" | "repush";
}

const CP = 32;

export class Frame {
  step = 0;
  event: SearchEvent | null = null;
  status: Uint8Array; // 0 unseen, 1 frontier, 2 expanded
  parent: Int32Array; // index of last known parent, -1 none
  g: Float32Array; // last pushed accumulated cost
  order: Int32Array; // expansion order (1-based), 0 = not expanded
  relaxed: Uint8Array;
  frontier: FrontierEntry[] = [];
  current: Cell | null = null;
  expanded = 0;
  generated = 0;
  maxFrontier = 0;
  goalFound = false;
  complete = false;
  success: boolean | null = null;
  readonly rows: number;
  readonly cols: number;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    const n = rows * cols;
    this.status = new Uint8Array(n);
    this.parent = new Int32Array(n).fill(-1);
    this.g = new Float32Array(n).fill(-1);
    this.order = new Int32Array(n);
    this.relaxed = new Uint8Array(n);
  }

  idx(c: Cell) {
    return c[0] * this.cols + c[1];
  }

  clone(): Frame {
    const f = new Frame(this.rows, this.cols);
    f.step = this.step;
    f.event = this.event;
    f.status.set(this.status);
    f.parent.set(this.parent);
    f.g.set(this.g);
    f.order.set(this.order);
    f.relaxed.set(this.relaxed);
    f.frontier = this.frontier.slice();
    f.current = this.current;
    f.expanded = this.expanded;
    f.generated = this.generated;
    f.maxFrontier = this.maxFrontier;
    f.goalFound = this.goalFound;
    f.complete = this.complete;
    f.success = this.success;
    return f;
  }

  apply(ev: SearchEvent) {
    this.step = ev.step;
    this.event = ev;
    if (ev.type === "complete") {
      this.complete = true;
      this.success = !!ev.success;
      return;
    }
    if (ev.type === "expand" || ev.type === "skip") {
      const k = this.frontier.findIndex((e) => e.id === ev.pop_id);
      if (k >= 0) this.frontier.splice(k, 1);
      this.current = ev.current ?? null;
    }
    const ci = ev.current ? this.idx(ev.current) : -1;
    if (ev.type === "expand" && ev.current) {
      this.status[ci] = 2;
      this.expanded = ev.expanded_count ?? this.expanded + 1;
      this.order[ci] = this.expanded;
      this.parent[ci] = ev.parent ? this.idx(ev.parent) : -1;
      this.g[ci] = ev.g ?? this.g[ci];
      this.goalFound = !!ev.goal_found;
    }
    const childDepth = ev.type === "init" ? 0 : (ev.depth ?? 0) + 1;
    for (const n of ev.neighbors ?? []) {
      if (n.id === undefined) continue;
      const ni = this.idx(n.state);
      this.frontier.push({
        id: n.id,
        state: n.state,
        g: n.g ?? 0,
        parent: ev.current ?? null,
        depth: childDepth,
        kind: n.result as FrontierEntry["kind"],
      });
      if (this.status[ni] !== 2) this.status[ni] = 1;
      this.parent[ni] = ci;
      this.g[ni] = n.g ?? 0;
      if (n.result === "relaxed") this.relaxed[ni] = 1;
    }
    if (ev.type === "init") this.generated = 1;
    if (ev.generated_count !== undefined) this.generated = ev.generated_count;
    this.maxFrontier = Math.max(this.maxFrontier, ev.frontier_size ?? 0);
  }
}

export class Replayer {
  private checkpoints: Frame[] = [];
  private lastStep = -1;
  private lastFrame: Frame | null = null;

  constructor(
    readonly events: SearchEvent[],
    readonly rows: number,
    readonly cols: number,
  ) {}

  private ensure(k: number) {
    while (this.checkpoints.length <= k) {
      const i = this.checkpoints.length;
      let f: Frame;
      if (i === 0) {
        f = new Frame(this.rows, this.cols);
        f.apply(this.events[0]);
      } else {
        f = this.checkpoints[i - 1].clone();
        for (let s = (i - 1) * CP + 1; s <= i * CP; s++) f.apply(this.events[s]);
      }
      this.checkpoints.push(f);
    }
  }

  frameAt(step: number): Frame {
    const s = Math.max(0, Math.min(step, this.events.length - 1));
    if (s === this.lastStep && this.lastFrame) return this.lastFrame;
    const k = Math.floor(s / CP);
    this.ensure(k);
    const f = this.checkpoints[k].clone();
    for (let i = k * CP + 1; i <= s; i++) f.apply(this.events[i]);
    this.lastStep = s;
    this.lastFrame = f;
    return f;
  }
}

/** Final frame summary used for tree layout (last known parent of every discovered state). */
export function finalParents(events: SearchEvent[], rows: number, cols: number): Frame {
  const r = new Replayer(events, rows, cols);
  return r.frameAt(events.length - 1);
}
