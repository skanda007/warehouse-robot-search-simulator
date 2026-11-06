"""Breadth-First Search — FIFO queue (collections.deque).

Convention: a state is marked *discovered* when it is enqueued, so every state
enters the queue at most once and its parent never changes. The goal test is
applied when a state is removed from the queue.
BFS minimises the NUMBER OF MOVES; with unequal terrain costs the reported
total_cost of its route is simply the cost of that fewest-moves route.
"""
from __future__ import annotations

from collections import deque

from ..core.warehouse import Warehouse
from .common import SearchResult, finalize
from .event_recorder import NullRecorder, nb_record

NAME = "BFS"


def bfs(wh: Warehouse, rec=None) -> SearchResult:
    rec = rec or NullRecorder()
    start, goal = wh.start, wh.goal
    eid = 0
    queue: deque = deque([(start, None, 0, 0, eid)])  # (state, parent, g, depth, entry_id)
    discovered = {start}
    info = {start: (None, 0, 0)}
    order = []
    generated, expanded, max_frontier, found = 1, 0, 1, False
    if rec.enabled:
        rec.record("init", structure="queue", start=list(start), goal=list(goal), current=None,
                   neighbors=[nb_record("START", start, "discovered", id=0, g=0)], frontier_size=1)

    while queue:
        state, par, g, depth, pid = queue.popleft()  # FIFO: oldest entry first
        expanded += 1
        order.append(state)
        is_goal = state == goal
        records = []
        if not is_goal:
            for action, nb, kind in wh.neighbors(state):
                if kind != "ok":
                    records.append(nb_record(action, nb, kind))
                elif nb in discovered:
                    records.append(nb_record(action, nb, "ignored", reason="already_discovered"))
                else:
                    discovered.add(nb)
                    eid += 1
                    ng = g + wh.step_cost(state, nb)
                    info[nb] = (state, ng, depth + 1)
                    queue.append((nb, state, ng, depth + 1, eid))
                    generated += 1
                    records.append(nb_record(action, nb, "discovered", id=eid, g=ng))
            max_frontier = max(max_frontier, len(queue))
        if rec.enabled:
            rec.record("expand", current=list(state), parent=list(par) if par else None, g=g, depth=depth,
                       pop_id=pid, expanded_count=expanded, generated_count=generated,
                       goal_found=is_goal, neighbors=records, frontier_size=len(queue))
        if is_goal:
            found = True
            break
    return finalize(NAME, wh, found, info, order, generated, max_frontier, rec)
