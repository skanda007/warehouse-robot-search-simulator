import type { Cell, TreeNodeData } from "./types";

export interface LaidOutNode {
  idx: number; // grid index (row * cols + col)
  state: Cell;
  x: number;
  y: number;
  depth: number;
}

export interface TreeLayout {
  nodes: LaidOutNode[];
  total: number;
  truncated: boolean;
}

export const X_GAP = 92;
export const Y_GAP = 74;

/**
 * Tidy-tree layout of the FINAL search tree returned by the engine.
 * Positions are static for a result; the visible subset at a given step is chosen by replay.
 * The view is deliberately capped (default 1200 nodes) — the complete tree stays in the result.
 */
export function layoutTree(nodes: TreeNodeData[], cols: number, max = 1200): TreeLayout {
  const list = nodes.slice(0, max);
  const pos = new Map<number, number>();
  list.forEach((n, i) => pos.set(n.state[0] * cols + n.state[1], i));
  const children: number[][] = list.map(() => []);
  let root = 0;
  list.forEach((n, i) => {
    if (!n.parent) {
      root = i;
      return;
    }
    const p = pos.get(n.parent[0] * cols + n.parent[1]);
    if (p === undefined || p === i) return;
    children[p].push(i);
  });
  // any node whose parent was truncated/unknown hangs from the root so it still gets a position
  const hasParent = new Set<number>();
  children.forEach((ch) => ch.forEach((c) => hasParent.add(c)));
  list.forEach((_, i) => {
    if (i !== root && !hasParent.has(i)) children[root].push(i);
  });
  const rank = (i: number) => list[i].order ?? Number.MAX_SAFE_INTEGER;
  children.forEach((ch) => ch.sort((a, b) => rank(a) - rank(b) || a - b));

  const x = new Array<number>(list.length).fill(0);
  const depth = new Array<number>(list.length).fill(0);
  let leaf = 0;
  const stack: [number, number][] = list.length ? [[root, 0]] : [];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const ch = children[top[0]];
    if (top[1] < ch.length) {
      const child = ch[top[1]++];
      depth[child] = stack.length;
      stack.push([child, 0]);
    } else {
      stack.pop();
      x[top[0]] = ch.length === 0 ? leaf++ : (x[ch[0]] + x[ch[ch.length - 1]]) / 2;
    }
  }
  return {
    nodes: list.map((n, i) => ({ idx: n.state[0] * cols + n.state[1], state: n.state, x: x[i] * X_GAP, y: depth[i] * Y_GAP, depth: depth[i] })),
    total: nodes.length,
    truncated: nodes.length > max,
  };
}
