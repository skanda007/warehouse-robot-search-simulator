"""Repeatable experiments on SYNTHETIC, procedurally generated warehouse maps.

The maps are NOT real warehouse data. Every map is a pure function of
(experiment kind, size, density, cost distribution, seed, trial) so a run can be
reproduced exactly. For every trial the *same* map is given to BFS, DFS and UCS.
"""
from __future__ import annotations

import random
from typing import Any, Dict, List, Optional, Tuple

from ..algorithms import ALGORITHMS, run_search
from ..core.warehouse import Warehouse
from .exports import rows_to_csv, summary_to_csv
from .metrics import describe

ALGO_ORDER = ("BFS", "DFS", "UCS")

EXPERIMENTS: List[Dict[str, Any]] = [
    {"id": "sparse", "title": "Experiment 1 — Sparse Obstacles", "kind": "random",
     "description": "Open environment with a low obstacle density and uniform cost 1.",
     "defaults": {"rows": 16, "cols": 16, "density": 0.08, "cost_distribution": {"1": 1}, "trials": 20, "seed": 42}},
    {"id": "dense", "title": "Experiment 2 — Dense Obstacles", "kind": "random",
     "description": "Constrained warehouse with a high obstacle density and narrow pathways.",
     "defaults": {"rows": 16, "cols": 16, "density": 0.28, "cost_distribution": {"1": 1}, "trials": 20, "seed": 42}},
    {"id": "weighted", "title": "Experiment 3 — Different Movement Costs", "kind": "random",
     "description": "Random terrain costs (1, 2, 3, 5). Short routes are often more expensive than longer ones.",
     "defaults": {"rows": 16, "cols": 16, "density": 0.10, "cost_distribution": {"1": 5, "2": 2, "3": 2, "5": 1},
                  "trials": 20, "seed": 42}},
    {"id": "multi_route", "title": "Experiment 4 — Multiple Possible Routes", "kind": "multi_route",
     "description": "Two vertical walls, each with three random gaps, create several distinct candidate routes.",
     "defaults": {"rows": 18, "cols": 18, "density": 0.05, "cost_distribution": {"1": 3, "2": 1, "3": 1},
                  "trials": 20, "seed": 42}},
    {"id": "unreachable", "title": "Experiment 5 — Unreachable Destination", "kind": "unreachable",
     "description": "The goal cell is sealed by obstacles. Every algorithm must terminate and report failure.",
     "defaults": {"rows": 14, "cols": 14, "density": 0.12, "cost_distribution": {"1": 1}, "trials": 10, "seed": 42}},
    {"id": "grid_sizes", "title": "Experiment 6 — Different Grid Sizes", "kind": "random",
     "description": "The same density and cost model on small, medium and large grids.",
     "defaults": {"rows": 16, "cols": 16, "density": 0.15, "cost_distribution": {"1": 4, "2": 1, "3": 1},
                  "trials": 10, "seed": 42, "sizes": [[8, 8], [16, 16], [24, 24], [32, 32]]}},
]
EXPERIMENT_BY_ID = {e["id"]: e for e in EXPERIMENTS}

SUMMARY_EFFORT_METRICS = ("expanded_nodes", "generated_nodes", "max_frontier_size", "execution_time_ms", "search_effort")
SUMMARY_SOLUTION_METRICS = ("path_length", "total_cost", "cost_gap_vs_ucs")


def _choose_cost(rng: random.Random, items: List[Tuple[float, float]]) -> float:
    total = sum(w for _, w in items)
    x = rng.random() * total
    acc = 0.0
    for cost, w in items:
        acc += w
        if x <= acc:
            return cost
    return items[-1][0]


def generate_map(kind: str, rows: int, cols: int, density: float, cost_distribution: Dict[str, float],
                 seed_key: str) -> Warehouse:
    """Deterministically generate one synthetic warehouse (start top-left, goal bottom-right)."""
    rng = random.Random(seed_key)
    start, goal = (0, 0), (rows - 1, cols - 1)
    items = [(float(k) if "." in str(k) else int(k), float(w)) for k, w in cost_distribution.items()]
    for _attempt in range(300):
        walls = set()
        if kind == "multi_route":
            for col in sorted({cols // 3, (2 * cols) // 3}):
                gaps = set(rng.sample(range(rows), 3))
                walls |= {(r, col) for r in range(rows) if r not in gaps}
        obstacles = set(walls)
        for r in range(rows):
            for c in range(cols):
                cell = (r, c)
                if cell in (start, goal) or cell in walls:
                    continue
                if rng.random() < density:
                    obstacles.add(cell)
        obstacles -= {start, goal}
        if kind == "unreachable":
            for nb in ((goal[0] - 1, goal[1]), (goal[0], goal[1] - 1)):
                obstacles.add(nb)
        costs = {}
        for r in range(rows):
            for c in range(cols):
                cell = (r, c)
                if cell in obstacles or cell == start:
                    continue
                cost = _choose_cost(rng, items)
                if cost != 1:
                    costs[cell] = cost
        wh = Warehouse(rows=rows, cols=cols, start=start, goal=goal, obstacles=obstacles,
                       terrain_costs=costs, name=f"Synthetic {kind} {rows}x{cols}")
        if kind == "unreachable" or wh.is_reachable():
            return wh
    # Fallback (very dense settings): carve an L-shaped corridor so the map is solvable.
    carve = {(0, c) for c in range(cols)} | {(r, cols - 1) for r in range(rows)}
    return Warehouse(rows=rows, cols=cols, start=start, goal=goal, obstacles=obstacles - carve,
                     terrain_costs={k: v for k, v in costs.items() if k not in carve},
                     name=f"Synthetic {kind} {rows}x{cols} (carved)")


def _summarise(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    groups: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for row in rows:
        groups.setdefault((f"{row['rows']}x{row['cols']}", row["algorithm"]), []).append(row)
    out = []
    for (size, algo), items in groups.items():
        ok = [i for i in items if i["success"]]
        metrics = {m: describe(i[m] for i in items) for m in SUMMARY_EFFORT_METRICS}
        for m in SUMMARY_SOLUTION_METRICS:
            metrics[m] = describe(i[m] for i in ok if i[m] is not None)
        out.append({
            "size": size, "rows": items[0]["rows"], "cols": items[0]["cols"], "algorithm": algo,
            "trials": len(items), "successes": len(ok), "success_rate": round(len(ok) / len(items), 4),
            "metrics": metrics,
        })
    out.sort(key=lambda s: (s["rows"] * s["cols"], ALGO_ORDER.index(s["algorithm"])))
    return out


def run_experiment(config: Dict[str, Any]) -> Dict[str, Any]:
    exp = EXPERIMENT_BY_ID[config["experiment_id"]]
    sizes = config.get("sizes") or [[config["rows"], config["cols"]]]
    rows_out: List[Dict[str, Any]] = []
    sample: Optional[Dict[str, Any]] = None
    for (nr, nc) in sizes:
        for trial in range(config["trials"]):
            seed_key = f"{config['seed']}:{exp['id']}:{nr}x{nc}:{trial}"
            wh = generate_map(exp["kind"], nr, nc, config["density"], config["cost_distribution"], seed_key)
            results = {a: run_search(a, wh, record_events=False) for a in ALGO_ORDER}  # same map for all
            ucs, bfs = results["UCS"], results["BFS"]
            for a in ALGO_ORDER:
                r = results[a]
                rows_out.append({
                    "experiment": exp["id"], "trial": trial, "rows": nr, "cols": nc, "seed": config["seed"],
                    "obstacle_cells": len(wh.blocked), "algorithm": a, "success": r.success,
                    "path_length": r.path_length if r.success else None,
                    "total_cost": r.total_cost if r.success else None,
                    "expanded_nodes": r.expanded_nodes, "generated_nodes": r.generated_nodes,
                    "max_frontier_size": r.max_frontier_size, "execution_time_ms": r.execution_time_ms,
                    "search_effort": r.expanded_nodes + r.generated_nodes,
                    "cost_gap_vs_ucs": round(r.total_cost - ucs.total_cost, 4) if r.success and ucs.success else None,
                    "moves_gap_vs_bfs": r.path_length - bfs.path_length if r.success and bfs.success else None,
                })
            if sample is None:
                sample = {"warehouse": wh.to_dict(),
                          "paths": {a: [list(c) for c in results[a].path] for a in ALGO_ORDER},
                          "label": f"trial 0 · {nr}x{nc} · seed key '{seed_key}'"}
    summary = _summarise(rows_out)
    return {
        "experiment": {"id": exp["id"], "title": exp["title"], "description": exp["description"]},
        "config": {k: config[k] for k in ("trials", "rows", "cols", "density", "cost_distribution", "seed")}
                  | {"sizes": sizes},
        "synthetic": True,
        "note": "Procedurally generated synthetic warehouse maps — not real operational data.",
        "raw": rows_out,
        "summary": summary,
        "sample": sample,
        "csv": {"raw": rows_to_csv(rows_out), "summary": summary_to_csv(summary)},
    }
