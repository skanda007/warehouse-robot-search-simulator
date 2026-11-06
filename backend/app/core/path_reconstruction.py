"""Path reconstruction helpers."""
from __future__ import annotations

from typing import Dict, List, Optional

from .state import State, direction_between
from .warehouse import Warehouse


def reconstruct_path(parent: Dict[State, Optional[State]], start: State, goal: State) -> List[State]:
    """Walk parent pointers from goal back to start and reverse."""
    if goal not in parent:
        return []
    path = [goal]
    seen = {goal}
    while path[-1] != start:
        p = parent.get(path[-1])
        if p is None or p in seen:  # broken chain or cycle -> no valid path
            return []
        path.append(p)
        seen.add(p)
    path.reverse()
    return path


def path_cost(wh: Warehouse, path: List[State]) -> float:
    """Sum of the costs of every cell entered (start cell costs 0)."""
    return sum(wh.step_cost(a, b) for a, b in zip(path, path[1:]))


def path_directions(path: List[State]) -> List[str]:
    return [direction_between(a, b) for a, b in zip(path, path[1:])]
