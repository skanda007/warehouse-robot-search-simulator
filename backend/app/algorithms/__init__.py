"""Single authoritative search engine (BFS, DFS, UCS) — implemented manually."""
from __future__ import annotations

import time
from typing import Callable, Dict

from ..core.warehouse import Warehouse
from .bfs import bfs
from .common import SearchResult
from .dfs import dfs
from .event_recorder import EventRecorder, NullRecorder
from .ucs import ucs

ALGORITHMS: Dict[str, Callable[..., SearchResult]] = {"BFS": bfs, "DFS": dfs, "UCS": ucs}

ALGORITHM_INFO = {
    "BFS": {"id": "BFS", "name": "Breadth-First Search", "frontier": "FIFO queue", "structure": "queue",
            "optimal_for": "fewest movements", "complete": True,
            "summary": "Expands states level by level from a FIFO queue. Guarantees the minimum number of movements."},
    "DFS": {"id": "DFS", "name": "Depth-First Search", "frontier": "LIFO stack", "structure": "stack",
            "optimal_for": "none (no optimality guarantee)", "complete": True,
            "summary": "Dives down one branch using a LIFO stack and backtracks. Finds a route, not necessarily a short or cheap one."},
    "UCS": {"id": "UCS", "name": "Uniform-Cost Search", "frontier": "Priority queue (heapq)", "structure": "priority_queue",
            "optimal_for": "minimum total movement cost", "complete": True,
            "summary": "Always expands the cheapest accumulated-cost state. Guarantees the minimum-cost route for positive costs."},
}


def normalise_algorithm(name: str) -> str:
    key = str(name).strip().upper()
    if key not in ALGORITHMS:
        raise KeyError(name)
    return key


def run_search(name: str, wh: Warehouse, record_events: bool = True, repeats: int = 1) -> SearchResult:
    """Run one algorithm.

    ``execution_time_ms`` comes from a *silent* run (no event recording) timed with
    ``time.perf_counter()`` so event bookkeeping never inflates the measurement.
    """
    key = normalise_algorithm(name)
    fn = ALGORITHMS[key]
    best = None
    result = None
    for _ in range(max(1, repeats)):
        t0 = time.perf_counter()
        result = fn(wh, NullRecorder())
        dt = (time.perf_counter() - t0) * 1000.0
        best = dt if best is None else min(best, dt)
    assert result is not None and best is not None
    if record_events:
        rec = EventRecorder()
        result = fn(wh, rec)
        result.events = rec.events
    result.execution_time_ms = round(best, 4)
    return result
