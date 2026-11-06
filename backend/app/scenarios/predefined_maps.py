"""Predefined warehouse environments (hand-designed, deterministic).

ASCII legend:  . floor   # obstacle   R rack   H shelf   P pallet   L loading
               U unloading   S start   G goal (retrieval cell)   T target shelf
               2-9 weighted floor (traversal cost = digit)
"""
from __future__ import annotations

from typing import Dict, List

from ..core.warehouse import Warehouse

SIMPLE = [
    "L.S.......U.",
    "............",
    ".RHRHRHRHR..",
    ".RHRHRHRHR..",
    "............",
    ".RHRHRHRHR..",
    ".RHRHRTRHR..",
    "......G.....",
]

SPARSE = [
    "S...............",
    "..#.......#.....",
    "......P.........",
    "....#.....#..#..",
    "..........#.....",
    ".#..........P...",
    ".....#..........",
    "..#........#....",
    "......#.........",
    "..........#...#.",
    ".#..............",
    "...........#...G",
]

DENSE = [
    "S...............",
    "RHRHRHRHRHRHRH..",
    "....#...#...#...",
    "......#...#...#.",
    "..RHRHRHRHRHRHRH",
    "................",
    "RHRHRHRHRHRHRH..",
    "..#...#...#.....",
    "....#...#...#...",
    "..RHRHRHRHRHRHRH",
    "................",
    "RHRHRHRHRHRTRH..",
    "...........G....",
]

MULTI_ROUTE = [
    "L..............",
    "..RHRHRHRHRH...",
    "..RHRHRHRHRH...",
    "..RHRHRHRHRH..T",
    "S.............G",
    "..RHRHRHRHRH...",
    "..RHRHRHRHRH...",
    "..RHRHRHRHRH...",
    "..............U",
]

WEIGHTED = [
    "..............",
    "....33333.....",
    "....55555.....",
    "....55555....T",
    "S...55555....G",
    "....55555.....",
    "....55555.....",
    "....33333.....",
    "L............U",
]

NARROW = [
    "S......#...#...",
    ".......#.......",
    ".......#...#...",
    ".......#...#...",
    ".......#...#..T",
    ".......#...#..G",
    ".......#...#...",
    "...............",
    ".......#...#...",
]

UNREACHABLE = [
    "S.....L.....",
    "............",
    ".RHRH.###...",
    ".RHRH.#G#...",
    "......###...",
    ".RHRH.......",
    ".RHRH.......",
    "............",
]

OPEN = [
    "L...........UU",
    ".S............",
    "......P.......",
    "..............",
    "....P....P....",
    "..............",
    ".......P......",
    "..............",
    ".........RTRH.",
    "..........G...",
]


def _blank(rows: int, cols: int) -> List[List[str]]:
    return [["." for _ in range(cols)] for _ in range(rows)]


def _rack_block(g: List[List[str]], r0: int, r1: int, c0: int, c1: int) -> None:
    """Fill a rectangle with alternating rack-frame (R) / shelf-compartment (H) cells."""
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            g[r][c] = "H" if (c - c0) % 2 == 1 else "R"


def _set(g: List[List[str]], cells: Dict[str, List[tuple]]) -> None:
    for ch, coords in cells.items():
        for r, c in coords:
            g[r][c] = ch


def _build_large() -> Warehouse:
    g = _blank(24, 36)
    for r0, r1 in ((2, 4), (7, 9), (12, 14), (17, 19)):
        for c0, c1 in ((2, 9), (12, 19), (22, 29)):
            _rack_block(g, r0, r1, c0, c1)
    _set(g, {
        "L": [(21, 0), (22, 0), (23, 0)], "U": [(0, 35), (1, 35)],
        "S": [(22, 2)], "T": [(12, 24)], "G": [(11, 24)],
        "P": [(5, 10), (16, 20), (21, 11), (10, 5)],
        "#": [(10, 30), (15, 31), (6, 21), (20, 16)],
        "3": [(5, c) for c in range(12, 20)] + [(15, c) for c in range(2, 10)],
    })
    return Warehouse.from_ascii("Large Warehouse", ["".join(r) for r in g])


def _build_complex() -> Warehouse:
    g = _blank(18, 28)
    for r0, r1 in ((2, 3), (6, 7), (10, 11), (14, 15)):
        for c0, c1 in ((3, 8), (11, 16), (19, 24)):
            _rack_block(g, r0, r1, c0, c1)
    _set(g, {
        "L": [(16, 0), (17, 0)], "U": [(0, 27), (1, 27)],
        "S": [(17, 1)], "T": [(6, 21)], "G": [(5, 21)],
        "P": [(8, 9), (12, 17), (4, 4), (13, 10)],
        "#": [(5, 9), (5, 10), (9, 17), (9, 18), (13, 25)],
        "3": [(8, c) for c in range(3, 25) if (8, c) != (8, 9)],
        "2": [(12, c) for c in range(3, 25) if (12, c) != (12, 17)] + [(4, c) for c in range(11, 25)],
        "5": [(9, c) for c in range(3, 9)],
    })
    return Warehouse.from_ascii("Complex Multi-Aisle Warehouse", ["".join(r) for r in g])


# id -> (display name, description, tags, builder)
PRESET_DEFINITIONS = [
    ("simple", "Simple Warehouse", "Two storage blocks, one cross-aisle and a clear retrieval route. Ideal first run.",
     ["starter", "equal-cost"], lambda: Warehouse.from_ascii("Simple Warehouse", SIMPLE)),
    ("sparse", "Sparse Obstacles", "Open floor with a few obstacles and pallets (~8% blocked). Many equivalent routes.",
     ["sparse", "multiple-routes"], lambda: Warehouse.from_ascii("Sparse Obstacles", SPARSE)),
    ("dense", "Dense Obstacles", "Back-to-back racks and staggered pallets force a long serpentine route through narrow aisles.",
     ["dense", "narrow"], lambda: Warehouse.from_ascii("Dense Obstacles", DENSE)),
    ("multi_route", "Multiple Routes", "Three parallel corridors connect start and goal: a short middle aisle and two longer outer aisles.",
     ["multiple-routes"], lambda: Warehouse.from_ascii("Multiple Routes", MULTI_ROUTE)),
    ("weighted", "Weighted Terrain", "A rough high-resistance zone sits on the direct route; a longer detour is cheaper. BFS and UCS disagree.",
     ["weighted", "cost"], lambda: Warehouse.from_ascii("Weighted Terrain", WEIGHTED)),
    ("narrow", "Narrow Passage", "Two walls each with a single opening create a zig-zag bottleneck.",
     ["narrow", "bottleneck"], lambda: Warehouse.from_ascii("Narrow Passage", NARROW)),
    ("unreachable", "Unreachable Goal", "The retrieval cell is sealed by obstacles. Every algorithm must terminate and report failure.",
     ["unreachable", "failure"], lambda: Warehouse.from_ascii("Unreachable Goal", UNREACHABLE)),
    ("large", "Large Warehouse", "24 x 36 grid with 12 rack blocks, cross-aisles, docks and rough patches.",
     ["large", "scale"], _build_large),
    ("complex", "Complex Multi-Aisle Warehouse", "18 x 28 multi-aisle facility with congested (weighted) cross-aisles and blocked aisle segments.",
     ["complex", "weighted", "multiple-routes"], _build_complex),
    ("open", "Open Warehouse", "Nearly empty hall with a few pallets and one rack. Shows how algorithms behave without constraints.",
     ["open", "sparse"], lambda: Warehouse.from_ascii("Open Warehouse", OPEN)),
]
