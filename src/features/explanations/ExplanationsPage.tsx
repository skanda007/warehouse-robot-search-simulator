"use client";

import React from "react";
import { ALGO_COLORS } from "@/lib/theme";
import { Card, PageHeader } from "@/components/common/ui";

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink/90">{children}</p>;
}
function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-line bg-[#0e1114] p-4 font-mono text-xs leading-relaxed text-volt">
      {children}
    </pre>
  );
}
function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs font-bold text-volt">
      {children}
    </code>
  );
}

const TOC = [
  ["problem", "Problem Definition"],
  ["agent", "Agent & Environment"],
  ["state", "State Space"],
  ["actions", "Actions & Goal Test"],
  ["cost", "Cost Function"],
  ["tree", "Search Tree & Frontier"],
  ["bfs", "Breadth-First Search"],
  ["dfs", "Depth-First Search"],
  ["ucs", "Uniform-Cost Search"],
  ["optimality", "Optimality & Complexity"],
  ["metrics", "Metrics & Conventions"],
  ["interpret", "Interpreting Experiments"],
  ["architecture", "System Architecture"],
];

export function ExplanationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="FORMAL SPECIFICATION & THEORY"
        title="AI & ALGORITHM EXPLANATIONS"
        subtitle="Complete evaluator reference: how the physical warehouse is modelled as a classical state-space search problem and how BFS, DFS and Uniform-Cost Search behave."
      />
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sticky TOC Navigation */}
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-28 space-y-2 rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-volt">
              DOCUMENT SECTIONS
            </div>
            <ul className="space-y-1 text-xs font-bold">
              {TOC.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-lg px-2.5 py-1.5 text-muted transition hover:bg-raised hover:text-volt"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="space-y-8">
          <section id="problem">
            <Card title="PROBLEM FORMULATION" bodyClassName="space-y-3">
              <P>
                An autonomous mobile robot (AMR) docked at a start bay must reach the accessible pick-up cell
                of a designated warehouse shelf. The floor is represented as a discrete two-dimensional grid where
                racks, shelves, pallets and obstacles are impassable (blocked), aisles are traversable, and specific
                floor zones impose variable traversal resistances.
              </P>
              <Code>{`S . . # . .      S = robot start (docking station)
# . . # . .      G = goal (retrieval cell in front of the shelf)
. . # . . G      # = blocked (obstacle / rack / shelf / pallet)
. # . . . .      . = traversable floor`}</Code>
              <P>
                The search objective is to discover an ordered sequence of transitions from <Mono>S</Mono> to <Mono>G</Mono> using{" "}
                <b className="text-volt">uninformed search algorithms</b> — agents that operate with no heuristic estimate of the distance remaining to the goal.
              </P>
            </Card>
          </section>

          <section id="agent">
            <Card title="PEAS AGENT & ENVIRONMENT SPECIFICATION" bodyClassName="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Agent Model", "Goal-based search agent commanding an Autonomous Mobile Robot (AMR)."],
                  ["Environment", "Static, fully observable, deterministic, discrete 2D grid floor plan."],
                  ["Percepts", "Complete geometric matrix: boundaries, impassable cells, terrain friction, S, G."],
                  ["Actuators", "Orthogonal translation: UP, DOWN, LEFT, RIGHT. No diagonal hops permitted."],
                  ["Performance", "Reach shelf goal cell; benchmark fewest movements vs lowest cumulative cost."],
                  ["Execution Cycle", "Plan first (offline uninformed search), then act: AMR traces path cell-by-cell."],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line bg-raised p-4">
                    <div className="text-xs font-black uppercase tracking-wider text-volt">{k}</div>
                    <div className="mt-1 text-xs font-medium text-ink leading-relaxed">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section id="state">
            <Card title="STATE-SPACE REPRESENTATION" bodyClassName="space-y-3">
              <P>
                A <b className="text-ink">state</b> is formally defined as the robot&apos;s discrete coordinate <Mono>(row, column)</Mono>,
                with row 0 and column 0 indexed at the top-left corner. The state space <Mono>S</Mono> comprises all within-bounds,
                unblocked coordinates. The initial state is the docking bay coordinate.
              </P>
              <P>
                Physical entities project directly into the logical grid: structural rack columns, shelf assemblies, pallets, and hazardous
                obstacles are designated as <b className="text-[#ff5a63]">blocked</b>; transit aisles, charging stations, and weighted floor surfaces
                are <b className="text-[#38c982]">traversable</b>. While the requested shelf is visualized as a physical storage rack, the search goal
                is precisely the accessible pick-face cell immediately adjacent to it.
              </P>
            </Card>
          </section>

          <section id="actions">
            <Card title="ACTIONS, TRANSITIONS & GOAL TEST" bodyClassName="space-y-3">
              <Code>{`UP    = (-1,  0)     DOWN  = (+1,  0)
LEFT  = ( 0, -1)     RIGHT = ( 0, +1)

Fixed Expansion Priority (Guarantees Reproducible Replay):
UP → DOWN → LEFT → RIGHT

goal_test(state)  ->  state == goal_state`}</Code>
              <P>
                A candidate transition is valid if and only if the destination coordinate falls within grid dimensions and is not blocked. In DFS,
                successor coordinates are pushed onto the LIFO stack in reverse order so that UP emerges at the top, ensuring identical
                tie-breaking expansion priority across all three strategies.
              </P>
            </Card>
          </section>

          <section id="cost">
            <Card title="PATH COST FUNCTION c(s, a, s')" bodyClassName="space-y-3">
              <P>
                The cost of a transition is dictated by the traversal friction of the <b className="text-ink">cell entered</b>: standard floor = 1,
                low resistance = 2, medium roughness = 3, high resistance zone = 5 (arbitrary positive values may be designated in the editor).
                The start state has accumulated cost g = 0.
              </P>
              <P>
                All cell costs must remain strictly positive (<Mono>c &gt; 0</Mono>), satisfying the formal convergence requirement for Uniform-Cost Search optimality.
              </P>
            </Card>
          </section>

          <section id="tree">
            <Card title="SEARCH TREE, FRONTIER & EXPLORED SET" bodyClassName="space-y-3">
              <P>
                Search constructs a <b className="text-ink">directed tree</b> rooted at the docking station. Each node represents a visited state,
                and directed edges indicate parent pointers. The <b className="text-volt">frontier</b> holds discovered candidate states awaiting expansion:
                a FIFO queue produces Breadth-First Search, a LIFO stack produces Depth-First Search, and a priority min-heap ordered by accumulated cost g produces Uniform-Cost Search.
              </P>
              <P>
                The <b className="text-ink">explored set (closed list)</b> tracks expanded coordinates, preventing redundant loops and cycles.
                Once the goal state is popped, the final route is reconstructed by tracing parent pointers backward to the root.
              </P>
            </Card>
          </section>

          <section id="bfs">
            <Card
              title="BREADTH-FIRST SEARCH (BFS)"
              icon={<span className="h-3 w-3 rounded-full" style={{ background: ALGO_COLORS.BFS }} />}
              bodyClassName="space-y-3"
            >
              <P>
                Expands nodes strictly in order of shallowest depth using a <b className="text-ink">FIFO queue</b> (<Mono>collections.deque</Mono>).
                All nodes at depth d are expanded prior to any node at depth d + 1. Consequently, the first time the goal state is discovered, it is
                guaranteed to represent the path with the minimum count of cell movements.
              </P>
              <Code>{`queue = deque([start])
discovered = {start}
while queue:
    s = queue.popleft()            # FIFO: oldest item popped
    if s == goal: return reconstruct_path(s)
    for n in get_neighbours(s):    # UP, DOWN, LEFT, RIGHT
        if n not in discovered:
            discovered.add(n)
            parent[n] = s
            queue.append(n)`}</Code>
              <P>
                <b>Behavior in Weighted Terrains:</b> BFS is cost-agnostic. It minimizes hop count rather than accumulated traversal cost,
                frequently driving through high-cost rough terrain if it offers fewer steps.
              </P>
            </Card>
          </section>

          <section id="dfs">
            <Card
              title="DEPTH-FIRST SEARCH (DFS)"
              icon={<span className="h-3 w-3 rounded-full" style={{ background: ALGO_COLORS.DFS }} />}
              bodyClassName="space-y-3"
            >
              <P>
                Explores a solitary branch to maximum depth using a <b className="text-ink">LIFO stack</b> (Python list), then backtracks to the
                most recent unexplored fork. While complete in finite grid environments with closed sets, DFS provides no guarantees of path optimality.
              </P>
              <Code>{`stack = [start]
expanded = set()
while stack:
    s = stack.pop()                # LIFO: newest item popped
    if s in expanded: continue
    expanded.add(s)
    if s == goal: return reconstruct_path(s)
    for n in reversed(get_neighbours(s)):   # UP placed on top
        if n not in expanded:
            parent[n] = s
            stack.append(n)`}</Code>
            </Card>
          </section>

          <section id="ucs">
            <Card
              title="UNIFORM-COST SEARCH (UCS)"
              icon={<span className="h-3 w-3 rounded-full" style={{ background: ALGO_COLORS.UCS }} />}
              bodyClassName="space-y-3"
            >
              <P>
                Continually expands the frontier node possessing the <b className="text-ink">lowest cumulative path cost g</b> using a binary min-heap (<Mono>heapq</Mono>).
                Heap entries follow the tuple structure <Mono>(g, tie_counter, state)</Mono>. Crucially, the goal test is performed upon <b className="text-volt">pop</b>,
                which formally guarantees that the discovered route is optimal in total cost.
              </P>
              <Code>{`heap = [(0, 0, start)]        # (g, tie_breaker, state)
best = {start: 0}
while heap:
    g, _, s = heappop(heap)        # Lowest accumulated cost popped
    if g > best.get(s, float('inf')): continue
    if s == goal: return reconstruct_path(s)
    for n in get_neighbours(s):
        new_g = g + get_cost(n)
        if new_g < best.get(n, float('inf')):
            best[n] = new_g
            parent[n] = s
            heappush(heap, (new_g, next_tie(), n))`}</Code>
            </Card>
          </section>

          <section id="optimality">
            <Card title="OPTIMALITY & COMPUTATIONAL COMPLEXITY" bodyClassName="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-raised uppercase tracking-wider text-muted font-extrabold">
                      <th className="py-2.5 px-3">Algorithm</th>
                      <th className="py-2.5 px-3">Complete</th>
                      <th className="py-2.5 px-3">Optimal Metric</th>
                      <th className="py-2.5 px-3">Time Complexity (N free cells)</th>
                      <th className="py-2.5 px-3">Space Complexity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-medium text-ink">
                    <tr>
                      <td className="py-3 px-3 font-extrabold text-[#4b8cff]">BFS</td>
                      <td className="px-3">Yes</td>
                      <td className="px-3">Fewest Movements</td>
                      <td className="px-3 font-mono">O(N)</td>
                      <td className="px-3 font-mono">O(N)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-extrabold text-[#38c982]">DFS</td>
                      <td className="px-3">Yes (finite grid)</td>
                      <td className="px-3">None</td>
                      <td className="px-3 font-mono">O(N)</td>
                      <td className="px-3 font-mono">O(N)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-extrabold text-[#ff5a63]">UCS</td>
                      <td className="px-3">Yes (costs &gt; 0)</td>
                      <td className="px-3 text-volt font-bold">Lowest Cumulative Cost</td>
                      <td className="px-3 font-mono">O(N log N)</td>
                      <td className="px-3 font-mono">O(N)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section id="metrics">
            <Card title="BENCHMARK METRICS & MEASUREMENT CONVENTIONS" bodyClassName="space-y-3">
              <ul className="space-y-2 text-xs leading-relaxed text-ink/90">
                <li><b className="text-volt">Path Length:</b> Count of orthogonal movements required to reach the retrieval cell.</li>
                <li><b className="text-volt">Total Cost:</b> Arithmetic sum of the entered cell traversal costs along the returned route.</li>
                <li><b className="text-volt">Expanded Nodes:</b> Count of nodes dequeued from the frontier that passed the goal evaluation test.</li>
                <li><b className="text-volt">Generated Nodes:</b> Total distinct grid coordinates discovered and added to the frontier or explored set.</li>
                <li><b className="text-volt">Peak Frontier Size:</b> Maximum instantaneous count of candidate states in the container.</li>
                <li><b className="text-volt">Execution Duration:</b> Measured via Python <Mono>time.perf_counter()</Mono> in silent execution runs.</li>
              </ul>
            </Card>
          </section>

          <section id="interpret">
            <Card title="INTERPRETING EXPERIMENTAL PHENOMENA" bodyClassName="space-y-3">
              <ul className="space-y-2 text-xs leading-relaxed text-ink/90">
                <li><b className="text-ink">Sparse Obstacles:</b> Numerous equivalent corridors exist; BFS and UCS converge on identical paths, while DFS wanders significantly.</li>
                <li><b className="text-ink">Constrained Corridors:</b> Narrow rack aisles constrain choices, forcing all three algorithms toward similar routes and expansion numbers.</li>
                <li><b className="text-ink">Weighted Resistance:</b> BFS optimizes move count at the expense of cost, resulting in measurable cost gaps against optimal UCS.</li>
                <li><b className="text-ink">Unreachable Shelves:</b> All three algorithms cleanly exhaust their reachable frontier and report failure without moving the AMR.</li>
              </ul>
            </Card>
          </section>

          <section id="architecture">
            <Card title="FRONTEND REPLAY ARCHITECTURE" bodyClassName="space-y-3">
              <P>
                The backend Python service in <Mono>backend/</Mono> is the sole authority for search correctness. Next.js communicates with this engine via JSON APIs,
                capturing the chronological event stream once. The React application replays these events deterministically, ensuring that stepping back, pausing,
                and scrubbing the timeline never causes algorithmic drift.
              </P>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
