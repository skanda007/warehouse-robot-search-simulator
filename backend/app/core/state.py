"""State representation and operators.

A *state* is the robot's grid position ``(row, column)``.
Row 0 is the top of the warehouse, column 0 is the left edge.

Operators (documented, fixed neighbour-expansion order => reproducible results):

    1. UP    (-1,  0)
    2. DOWN  (+1,  0)
    3. LEFT  ( 0, -1)
    4. RIGHT ( 0, +1)

Diagonal movement is intentionally not available.
"""
from __future__ import annotations

from typing import Tuple

State = Tuple[int, int]

UP = (-1, 0)
DOWN = (1, 0)
LEFT = (0, -1)
RIGHT = (0, 1)

ACTIONS = (("UP", UP), ("DOWN", DOWN), ("LEFT", LEFT), ("RIGHT", RIGHT))
ACTION_ORDER = tuple(name for name, _ in ACTIONS)


def move(state: State, delta: Tuple[int, int]) -> State:
    return (state[0] + delta[0], state[1] + delta[1])


def direction_between(a: State, b: State) -> str:
    """Name of the single four-directional move that takes ``a`` to ``b``."""
    delta = (b[0] - a[0], b[1] - a[1])
    for name, d in ACTIONS:
        if d == delta:
            return name
    raise ValueError(f"{a} -> {b} is not a four-directional single-cell move")
