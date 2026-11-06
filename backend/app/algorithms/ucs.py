"""Uniform-Cost Search — priority queue (heapq).

Heap entries are ``(g, tie_counter, state, parent, depth)``. The monotonically
increasing ``tie_counter`` makes ordering deterministic: equal-cost entries pop
in insertion (FIFO) order and states/parents are never compared.

Lazy deletion: when a cheaper route to a frontier state is found (cost
relaxation) a *new* entry is pushed and the old one stays in the heap; it is
recognised as stale (``g > best[state]``) and discarded when popped (``skip``).
The goal test is applied on POP, which is what guarantees minimum total cost
for strictly positive step costs.
"""
from __future__ import annotations

import heapq

from ..core.warehouse import Warehouse
from .common import SearchResult, finalize
from .event_recorder import NullRecorder, nb_record

NAME = "UCS"


def ucs(wh: Warehouse, rec=None) -> SearchResult:
    rec = rec or NullRecorder()
    start, goal = wh.start, wh.goal
    tie = 0
    heap = [(0, tie, start, None, 0)]  # (g, tie, state, parent, depth)
    best = {start: 0}
    info = {start: (None, 0, 0)}
    closed = set()
    order = []
    generated, max_frontier, found = 1, 1, False
    if rec.enabled:
        rec.record("init", structure="priority_queue", start=list(start), goal=list(goal), current=None,
                   neighbors=[nb_record("START", start, "discovered", id=0, g=0)], frontier_size=1)

    while heap:
        g, pid, state, par, depth = heapq.heappop(heap)  # lowest accumulated cost first
        if state in closed or g > best[state]:
            if rec.enabled:
                rec.record("skip", current=list(state), parent=list(par) if par else None, g=g, depth=depth,
                           pop_id=pid, reason="stale_entry", best_g=best[state], frontier_size=len(heap))
            continue
        closed.add(state)
        order.append(state)
        is_goal = state == goal
        records = []
        if not is_goal:
            for action, nb, kind in wh.neighbors(state):
                if kind != "ok":
                    records.append(nb_record(action, nb, kind))
                    continue
                if nb in closed:
                    records.append(nb_record(action, nb, "ignored", reason="already_expanded", best_g=best[nb]))
                    continue
                ng = g + wh.step_cost(state, nb)
                if nb not in best:
                    result, extra = "discovered", {}
                    generated += 1
                elif ng < best[nb]:
                    result = "relaxed"
                    extra = {"old_g": best[nb], "old_parent": list(info[nb][0]) if info[nb][0] else None}
                else:
                    records.append(nb_record(action, nb, "ignored", reason="not_cheaper", g=ng, best_g=best[nb]))
                    continue
                tie += 1
                best[nb] = ng
                info[nb] = (state, ng, depth + 1)
                heapq.heappush(heap, (ng, tie, nb, state, depth + 1))
                records.append(nb_record(action, nb, result, id=tie, g=ng, **extra))
            max_frontier = max(max_frontier, len(heap))
        if rec.enabled:
            rec.record("expand", current=list(state), parent=list(par) if par else None, g=g, depth=depth,
                       pop_id=pid, expanded_count=len(order), generated_count=generated,
                       goal_found=is_goal, neighbors=records, frontier_size=len(heap))
        if is_goal:
            found = True
            break
    return finalize(NAME, wh, found, info, order, generated, max_frontier, rec)
