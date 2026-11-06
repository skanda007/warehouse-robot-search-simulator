"""Warehouse model: the logical grid the search algorithms operate on.

Visual-to-logical mapping (documented contract shared with the React renderer)
------------------------------------------------------------------------------
Layer / object        Logical meaning
--------------------  ---------------------------------------------------------
floor / aisle         traversable, cost 1 (or ``terrain_costs[cell]``)
weighted terrain      traversable floor with a positive cost > 1
loading station       traversable floor (a dock bay the robot may cross)
unloading station     traversable floor (a dock bay the robot may cross)
obstacle              BLOCKED
pallet                BLOCKED
rack (frame)          BLOCKED
shelf compartment     BLOCKED (physical storage, never entered by the robot)
target_shelf          one blocked shelf cell that was requested for retrieval
start (S)             robot docking cell, must be traversable
goal (G)              the accessible *retrieval cell* in front of the target
                      shelf, must be traversable (robot never drives through
                      physical racks)
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from .cost_model import DEFAULT_COST, is_valid_cost, normalise_cost
from .state import ACTIONS, State, move

MIN_DIM = 2
MAX_DIM = 60
BLOCKING_LAYERS = ("obstacles", "racks", "shelves", "pallets")
STATION_LAYERS = ("loading", "unloading")


class WarehouseError(ValueError):
    """Raised for structurally or semantically invalid warehouses."""

    def __init__(self, errors: List[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


@dataclass
class Warehouse:
    rows: int
    cols: int
    start: State
    goal: State
    obstacles: Set[State] = field(default_factory=set)
    racks: Set[State] = field(default_factory=set)
    shelves: Set[State] = field(default_factory=set)
    pallets: Set[State] = field(default_factory=set)
    loading: Set[State] = field(default_factory=set)
    unloading: Set[State] = field(default_factory=set)
    terrain_costs: Dict[State, float] = field(default_factory=dict)
    target_shelf: Optional[State] = None
    name: str = "Custom warehouse"

    def __post_init__(self) -> None:
        for cell, cost in self.terrain_costs.items():
            if not is_valid_cost(cost):
                raise WarehouseError([f"Movement cost at {list(cell)} must be a positive number, got {cost!r}"])
        self.blocked: Set[State] = set().union(self.obstacles, self.racks, self.shelves, self.pallets)

    # ------------------------------------------------------------------ queries
    def in_bounds(self, s: State) -> bool:
        return 0 <= s[0] < self.rows and 0 <= s[1] < self.cols

    def is_walkable(self, s: State) -> bool:
        return self.in_bounds(s) and s not in self.blocked

    def cost(self, s: State) -> float:
        """Cost of ENTERING cell ``s``."""
        return self.terrain_costs.get(s, DEFAULT_COST)

    def step_cost(self, src: State, dst: State) -> float:
        """Cost of the move ``src -> dst``. Warehouse model: the cost of the cell entered.

        This is a hook: with destination-cell costs a state's *first* discovery is
        already optimal (UCS pops in non-decreasing g), so cost relaxation never
        fires. Overriding this method with edge-dependent costs (see the tests)
        exercises the relaxation / stale-entry logic of UCS.
        """
        return self.cost(dst)

    def neighbors(self, s: State) -> List[Tuple[str, State, str]]:
        """Four-directional neighbours in the fixed order UP, DOWN, LEFT, RIGHT.

        Returns ``(action, neighbour, kind)`` where kind is one of
        ``ok`` | ``blocked`` | ``out_of_bounds``.
        """
        out: List[Tuple[str, State, str]] = []
        for name, delta in ACTIONS:
            nb = move(s, delta)
            if not self.in_bounds(nb):
                out.append((name, nb, "out_of_bounds"))
            elif nb in self.blocked:
                out.append((name, nb, "blocked"))
            else:
                out.append((name, nb, "ok"))
        return out

    def is_reachable(self) -> bool:
        """Plain flood fill used only for *validation warnings* (not a search result)."""
        if not self.is_walkable(self.start) or not self.is_walkable(self.goal):
            return False
        seen = {self.start}
        q = deque([self.start])
        while q:
            cur = q.popleft()
            if cur == self.goal:
                return True
            for _, nb, kind in self.neighbors(cur):
                if kind == "ok" and nb not in seen:
                    seen.add(nb)
                    q.append(nb)
        return False

    # ------------------------------------------------------------ serialisation
    def to_dict(self) -> Dict[str, Any]:
        def cells(s: Iterable[State]) -> List[List[int]]:
            return [list(c) for c in sorted(s)]

        return {
            "name": self.name,
            "rows": self.rows,
            "cols": self.cols,
            "start": list(self.start),
            "goal": list(self.goal),
            "obstacles": cells(self.obstacles),
            "racks": cells(self.racks),
            "shelves": cells(self.shelves),
            "pallets": cells(self.pallets),
            "loading": cells(self.loading),
            "unloading": cells(self.unloading),
            "terrain_costs": {f"{r},{c}": normalise_cost(v) for (r, c), v in sorted(self.terrain_costs.items())},
            "target_shelf": list(self.target_shelf) if self.target_shelf else None,
        }

    @classmethod
    def from_ascii(cls, name: str, lines: List[str]) -> "Warehouse":
        """Build a warehouse from a text map.

        ``.`` floor  ``#`` obstacle  ``R`` rack  ``H`` shelf  ``P`` pallet
        ``L`` loading  ``U`` unloading  ``S`` start  ``G`` goal
        ``T`` target shelf (blocked)  ``2``-``9`` weighted floor
        """
        rows, cols = len(lines), len(lines[0])
        w: Dict[str, Set[State]] = {k: set() for k in ("obstacles", "racks", "shelves", "pallets", "loading", "unloading")}
        costs: Dict[State, float] = {}
        start = goal = target = None
        for r, line in enumerate(lines):
            if len(line) != cols:
                raise WarehouseError([f"ASCII row {r} has width {len(line)}, expected {cols}"])
            for c, ch in enumerate(line):
                cell = (r, c)
                if ch == "#":
                    w["obstacles"].add(cell)
                elif ch == "R":
                    w["racks"].add(cell)
                elif ch == "H":
                    w["shelves"].add(cell)
                elif ch == "T":
                    w["shelves"].add(cell)
                    target = cell
                elif ch == "P":
                    w["pallets"].add(cell)
                elif ch == "L":
                    w["loading"].add(cell)
                elif ch == "U":
                    w["unloading"].add(cell)
                elif ch == "S":
                    start = cell
                elif ch == "G":
                    goal = cell
                elif ch.isdigit() and ch not in "01":
                    costs[cell] = int(ch)
                elif ch != ".":
                    raise WarehouseError([f"Unknown ASCII character {ch!r} at {cell}"])
        if start is None or goal is None:
            raise WarehouseError(["ASCII map needs exactly one S and one G"])
        return cls(rows=rows, cols=cols, start=start, goal=goal, terrain_costs=costs,
                   target_shelf=target, name=name, **w)


# ---------------------------------------------------------------------- parsing
def _is_int(v: object) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _parse_cell(v: object, label: str, errors: List[str]) -> Optional[State]:
    if isinstance(v, (list, tuple)) and len(v) == 2 and all(_is_int(x) for x in v):
        return (int(v[0]), int(v[1]))  # type: ignore[index]
    errors.append(f"{label} must be a [row, col] pair of integers")
    return None


def parse_warehouse(data: Any) -> Warehouse:
    """Validate a JSON warehouse description and build a :class:`Warehouse`.

    Raises :class:`WarehouseError` listing *all* problems found.
    """
    errors: List[str] = []
    if not isinstance(data, dict):
        raise WarehouseError(["warehouse must be a JSON object"])

    rows, cols = data.get("rows"), data.get("cols")
    for label, v in (("rows", rows), ("cols", cols)):
        if not _is_int(v) or not (MIN_DIM <= v <= MAX_DIM):  # type: ignore[operator]
            errors.append(f"{label} must be an integer between {MIN_DIM} and {MAX_DIM}")
    if errors:
        raise WarehouseError(errors)

    def inb(c: State) -> bool:
        return 0 <= c[0] < rows and 0 <= c[1] < cols  # type: ignore[operator]

    start = _parse_cell(data.get("start"), "start", errors)
    goal = _parse_cell(data.get("goal"), "goal", errors)
    layers: Dict[str, Set[State]] = {}
    for key in BLOCKING_LAYERS + STATION_LAYERS:
        raw = data.get(key, [])
        layers[key] = set()
        if not isinstance(raw, list):
            errors.append(f"{key} must be a list of [row, col] pairs")
            continue
        for i, item in enumerate(raw):
            cell = _parse_cell(item, f"{key}[{i}]", errors)
            if cell is None:
                continue
            if not inb(cell):
                errors.append(f"{key}[{i}] {list(cell)} is outside the {rows}x{cols} grid")
            else:
                layers[key].add(cell)

    costs: Dict[State, float] = {}
    raw_costs = data.get("terrain_costs", {})
    if not isinstance(raw_costs, dict):
        errors.append("terrain_costs must be an object keyed by 'row,col'")
    else:
        for key, value in raw_costs.items():
            try:
                r_s, c_s = str(key).split(",")
                cell = (int(r_s), int(c_s))
            except ValueError:
                errors.append(f"terrain_costs key {key!r} must look like 'row,col'")
                continue
            if not inb(cell):
                errors.append(f"terrain_costs cell {list(cell)} is outside the grid")
            elif not is_valid_cost(value):
                errors.append(f"movement cost at {list(cell)} must be a positive number, got {value!r}")
            else:
                costs[cell] = value  # type: ignore[assignment]

    target: Optional[State] = None
    if data.get("target_shelf") is not None:
        target = _parse_cell(data.get("target_shelf"), "target_shelf", errors)

    for label, cell in (("start", start), ("goal", goal), ("target_shelf", target)):
        if cell is not None and not inb(cell):
            errors.append(f"{label} {list(cell)} is outside the {rows}x{cols} grid")

    if errors:
        raise WarehouseError(errors)
    assert start is not None and goal is not None

    # semantic checks
    if start == goal:
        errors.append("start and goal must be different cells")
    seen: Dict[State, str] = {}
    for key in BLOCKING_LAYERS + STATION_LAYERS:
        for cell in layers[key]:
            if cell in seen:
                errors.append(f"cell {list(cell)} is used by both '{seen[cell]}' and '{key}'")
            seen[cell] = key
    blocked = set().union(*(layers[k] for k in BLOCKING_LAYERS))
    if start in blocked:
        errors.append(f"start {list(start)} is on a blocked cell")
    if goal in blocked:
        errors.append(f"goal {list(goal)} is on a blocked cell (goal must be an accessible retrieval cell)")
    if target is not None and target not in blocked:
        errors.append(f"target_shelf {list(target)} must be a physical shelf/rack cell")
    if errors:
        raise WarehouseError(errors)

    return Warehouse(rows=rows, cols=cols, start=start, goal=goal,  # type: ignore[arg-type]
                     terrain_costs=costs, target_shelf=target,
                     name=str(data.get("name", "Custom warehouse"))[:80], **layers)
