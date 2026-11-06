import type { AlgoId, Cell, NeighborRec, SearchEvent } from "./types";

export interface Explanation {
  title: string;
  text: string;
  tone: "info" | "select" | "goal" | "fail" | "warn";
  details: string[];
}

const c = (s?: Cell | null) => (s ? `(${s[0]}, ${s[1]})` : "—");
const sameCell = (a?: Cell | null, b?: Cell | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const fmt = (n?: number) => (n === undefined ? "?" : Number.isInteger(n) ? String(n) : n.toFixed(2));

function neighborLine(n: NeighborRec): string {
  const dir = n.action ?? "";
  const at = `${dir} ${c(n.state)}`;
  switch (n.result) {
    case "discovered":
      return `${at} → new state discovered and added to the frontier (path cost ${fmt(n.g)}).`;
    case "repush":
      return `${at} → already on the stack from another branch; pushed again with this parent (path cost ${fmt(n.g)}).`;
    case "relaxed":
      return `${at} → COST RELAXATION: cheaper route found, cost ${fmt(n.old_g)} → ${fmt(n.g)}, parent ${c(n.old_parent)} → current state. A new heap entry is pushed; the old one becomes stale.`;
    case "ignored":
      return `${at} → ignored (${
        n.reason === "already_discovered"
          ? "already discovered"
          : n.reason === "already_expanded"
            ? "already expanded"
            : `not cheaper: candidate ${fmt(n.g)} ≥ best known ${fmt(n.best_g)}`
      }).`;
    case "blocked":
      return `${at} → blocked (rack, shelf, pallet or obstacle).`;
    default:
      return `${at} → outside the warehouse boundary.`;
  }
}

export function explainEvent(algo: AlgoId, events: SearchEvent[], step: number): Explanation {
  const ev = events[Math.max(0, Math.min(step, events.length - 1))];
  if (!ev) return { title: "No event", text: "Run a search to see its event history.", tone: "info", details: [] };

  if (ev.type === "init") {
    const structure = algo === "BFS" ? "FIFO queue" : algo === "DFS" ? "LIFO stack" : "priority queue";
    return {
      title: "Search initialised",
      text: `The start state ${c(ev.start)} is placed on the ${structure} with accumulated cost 0. The goal is ${c(ev.goal)}.`,
      tone: "info",
      details: [],
    };
  }

  if (ev.type === "complete") {
    return ev.success
      ? {
          title: "Goal found — route reconstructed",
          text: `Parent pointers were followed from the goal back to the start: ${ev.path_length} movement${ev.path_length === 1 ? "" : "s"}, total cost ${fmt(ev.total_cost)}. The robot now leaves the dock and drives this exact route.`,
          tone: "goal",
          details: [],
        }
      : {
          title: "Destination unreachable",
          text: "The frontier is empty and the goal was never reached: every state reachable from the start has been expanded. No route exists, so the robot will not move.",
          tone: "fail",
          details: [],
        };
  }

  if (ev.type === "skip") {
    return {
      title: "Entry discarded",
      text:
        ev.reason === "stale_entry"
          ? `${c(ev.current)} was popped with cost ${fmt(ev.g)}, but a cheaper route (cost ${fmt(ev.best_g)}) is already known. This stale heap entry is ignored.`
          : `${c(ev.current)} was popped from the stack but it has already been expanded via another branch. The duplicate entry is discarded (backtracking continues).`,
      tone: "warn",
      details: [],
    };
  }

  // expand
  const prev = step > 0 ? events[step - 1] : null;
  const pops =
    algo === "BFS"
      ? `State ${c(ev.current)} was selected from the FRONT of the FIFO queue (oldest entry, depth ${ev.depth}, cost ${fmt(ev.g)}).`
      : algo === "DFS"
        ? `State ${c(ev.current)} was selected from the TOP of the LIFO stack (newest entry, depth ${ev.depth}, cost ${fmt(ev.g)}).`
        : `State ${c(ev.current)} has the LOWEST accumulated path cost (${fmt(ev.g)}) in the priority queue and is selected for expansion.`;
  const details = (ev.neighbors ?? []).map(neighborLine);

  if (ev.goal_found) {
    return {
      title: `Goal test passed at ${c(ev.current)}`,
      text: `${pops} It equals the goal state, so the search stops without expanding further.`,
      tone: "goal",
      details,
    };
  }
  let backtrack = "";
  if (algo === "DFS" && prev && prev.type !== "init" && prev.current && ev.parent && !sameCell(prev.current, ev.parent)) {
    backtrack = ` Backtracking: the previous branch reached a dead end, so the search resumes from an older branch point ${c(ev.parent)}.`;
  }
  const pushed = (ev.neighbors ?? []).filter((n) => n.id !== undefined).length;
  return {
    title: `Expand ${c(ev.current)}`,
    text: `${pops}${backtrack} ${pushed} neighbour${pushed === 1 ? "" : "s"} added to the frontier.`,
    tone: "select",
    details,
  };
}
