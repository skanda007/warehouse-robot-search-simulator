"""Common result structure shared by BFS, DFS and UCS.

Counting conventions (identical for every algorithm)
----------------------------------------------------
expanded_nodes     number of *valid* pops from the frontier, i.e. states on which
                   the goal test was performed (the goal itself is counted; stale /
                   duplicate pops are not).
generated_nodes    number of DISTINCT states ever discovered (start included).
max_frontier_size  largest length of the frontier container (queue / stack / heap,
                   including not-yet-discarded duplicate or stale entries). It is a
                   count of pending entries, NOT a measurement of Python memory.
path_length        number of movements.
total_cost         sum of the cost of every cell entered along the returned path.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

from ..core.path_reconstruction import path_cost, path_directions, reconstruct_path
from ..core.state import State
from ..core.warehouse import Warehouse
from .event_recorder import EventRecorder, NullRecorder

Info = Dict[State, Tuple[Optional[State], float, int]]  # state -> (parent, g, depth)


@dataclass
class SearchResult:
    algorithm: str
    success: bool
    path: List[State]
    directions: List[str]
    path_length: int
    total_cost: float
    expanded_nodes: int
    generated_nodes: int
    max_frontier_size: int
    execution_time_ms: float
    exploration_sequence: List[State]
    parent_map: Dict[State, Optional[State]]
    search_tree: Dict[str, Any]
    events: List[Dict[str, Any]] = field(default_factory=list)

    def metrics(self) -> Dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "success": self.success,
            "path_length": self.path_length,
            "total_cost": self.total_cost,
            "expanded_nodes": self.expanded_nodes,
            "generated_nodes": self.generated_nodes,
            "max_frontier_size": self.max_frontier_size,
            "execution_time_ms": self.execution_time_ms,
        }

    def to_dict(self, include_events: bool = True) -> Dict[str, Any]:
        d = self.metrics()
        d.update({
            "path": [list(c) for c in self.path],
            "directions": self.directions,
            "exploration_sequence": [list(c) for c in self.exploration_sequence],
            "parent_map": [{"state": list(s), "parent": list(p) if p else None} for s, p in self.parent_map.items()],
            "search_tree": self.search_tree,
            "search_effort": self.expanded_nodes + self.generated_nodes,
        })
        if include_events:
            d["events"] = self.events
        return d


def finalize(name: str, wh: Warehouse, found: bool, info: Info, order: List[State],
             generated: int, max_frontier: int, rec: Union[EventRecorder, NullRecorder]) -> SearchResult:
    parent = {s: v[0] for s, v in info.items()}
    path = reconstruct_path(parent, wh.start, wh.goal) if found else []
    success = found and bool(path)
    cost = path_cost(wh, path) if success else 0
    order_index = {s: i + 1 for i, s in enumerate(order)}
    nodes = []
    for s, (p, g, depth) in info.items():
        status = "goal" if (success and s == wh.goal) else ("expanded" if s in order_index else "frontier")
        nodes.append({"state": list(s), "parent": list(p) if p else None, "depth": depth, "g": g,
                      "order": order_index.get(s), "status": status})
    edges = [{"source": list(p), "target": list(s)} for s, p in parent.items() if p is not None]
    if rec.enabled:
        rec.record("complete", success=success, path=[list(c) for c in path],
                   path_length=max(len(path) - 1, 0), total_cost=cost)
    return SearchResult(
        algorithm=name, success=success, path=path, directions=path_directions(path) if success else [],
        path_length=max(len(path) - 1, 0) if success else 0, total_cost=cost,
        expanded_nodes=len(order), generated_nodes=generated, max_frontier_size=max_frontier,
        execution_time_ms=0.0, exploration_sequence=order, parent_map=parent,
        search_tree={"nodes": nodes, "edges": edges},
    )
