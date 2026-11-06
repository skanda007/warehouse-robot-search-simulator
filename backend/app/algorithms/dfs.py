"""Depth-First Search — explicit LIFO stack (Python list).

Convention (graph-search DFS): a state is marked *expanded* when it is popped.
Neighbours that are not yet expanded are pushed, even if they already sit on the
stack from a shallower branch (``repush``) — that is what lets DFS dive deep and
backtrack. A popped entry whose state was already expanded is discarded (``skip``).

Neighbours are PUSHED in the order RIGHT, LEFT, DOWN, UP so that UP ends on top
of the stack and is explored first: the effective expansion priority is
UP > DOWN > LEFT > RIGHT, identical to the order used by BFS and UCS.
DFS gives no shortest-path or least-cost guarantee.
"""
from __future__ import annotations

from ..core.warehouse import Warehouse
from .common import SearchResult, finalize
from .event_recorder import NullRecorder, nb_record

NAME = "DFS"


def dfs(wh: Warehouse, rec=None) -> SearchResult:
    rec = rec or NullRecorder()
    start, goal = wh.start, wh.goal
    eid = 0
    stack = [(start, None, 0, 0, eid)]  # (state, parent, g, depth, entry_id); top = end of list
    discovered = {start}
    expanded_set = set()
    info = {start: (None, 0, 0)}
    order = []
    generated, max_frontier, found = 1, 1, False
    if rec.enabled:
        rec.record("init", structure="stack", start=list(start), goal=list(goal), current=None,
                   neighbors=[nb_record("START", start, "discovered", id=0, g=0)], frontier_size=1)

    while stack:
        state, par, g, depth, pid = stack.pop()  # LIFO: newest entry first
        if state in expanded_set:
            if rec.enabled:
                rec.record("skip", current=list(state), parent=list(par) if par else None, g=g, depth=depth,
                           pop_id=pid, reason="already_expanded", frontier_size=len(stack))
            continue
        expanded_set.add(state)
        order.append(state)
        info[state] = (par, g, depth)  # final parent = the entry that was actually expanded
        is_goal = state == goal
        records = []
        if not is_goal:
            for action, nb, kind in reversed(wh.neighbors(state)):  # push order
                if kind != "ok":
                    records.append(nb_record(action, nb, kind))
                elif nb in expanded_set:
                    records.append(nb_record(action, nb, "ignored", reason="already_expanded"))
                else:
                    eid += 1
                    ng = g + wh.step_cost(state, nb)
                    first = nb not in discovered
                    if first:
                        discovered.add(nb)
                        generated += 1
                    info[nb] = (state, ng, depth + 1)  # latest pusher until expanded
                    stack.append((nb, state, ng, depth + 1, eid))
                    records.append(nb_record(action, nb, "discovered" if first else "repush", id=eid, g=ng))
            max_frontier = max(max_frontier, len(stack))
        if rec.enabled:
            rec.record("expand", current=list(state), parent=list(par) if par else None, g=g, depth=depth,
                       pop_id=pid, expanded_count=len(order), generated_count=generated,
                       goal_found=is_goal, neighbors=records, frontier_size=len(stack))
        if is_goal:
            found = True
            break
    return finalize(NAME, wh, found, info, order, generated, max_frontier, rec)
