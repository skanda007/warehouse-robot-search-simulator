"""Movement-cost model.

The cost of a move is the traversal cost of the cell being *entered*.
The start state has path cost 0. Every traversal cost must be a finite,
strictly positive number (this is what makes UCS optimal).

Reference terrain levels used by the editor / presets:

    1 normal floor, 2 low-resistance, 3 rough, 5 high-resistance
"""
from __future__ import annotations

import math
from typing import Union

DEFAULT_COST = 1
TERRAIN_LEVELS = {"normal": 1, "low_resistance": 2, "rough": 3, "high_resistance": 5}

Number = Union[int, float]


def is_valid_cost(value: object) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return math.isfinite(value) and value > 0


def normalise_cost(value: Number) -> Number:
    """Return ints for integral floats so JSON stays tidy (2.0 -> 2)."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value
