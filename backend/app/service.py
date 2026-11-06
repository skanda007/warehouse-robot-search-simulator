"""Transport-independent API handlers.

Both the Flask routes and the stdin/stdout CLI bridge (used when the UI is
served by Next.js) call these functions, so there is ONE authoritative engine
and ONE implementation of every endpoint.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from .algorithms import ALGORITHM_INFO, ALGORITHMS, run_search
from .core.warehouse import WarehouseError, parse_warehouse
from .experiments.experiment_engine import EXPERIMENTS, EXPERIMENT_BY_ID, run_experiment
from .scenarios.registry import PresetNotFound, get_preset, list_presets
from .schemas.validation import (ApiError, parse_experiment_request, parse_search_request, require_object)

ALGO_ORDER = ("BFS", "DFS", "UCS")


def health() -> Dict[str, Any]:
    return {"ok": True, "service": "warehouse-autonomy-engine", "algorithms": list(ALGORITHMS)}


def algorithms() -> Dict[str, Any]:
    return {"algorithms": [ALGORITHM_INFO[a] for a in ALGO_ORDER],
            "neighbour_order": ["UP", "DOWN", "LEFT", "RIGHT"]}


def presets() -> Dict[str, Any]:
    return {"presets": list_presets()}


def preset(preset_id: str) -> Dict[str, Any]:
    try:
        return get_preset(preset_id)
    except PresetNotFound:
        raise ApiError(404, "preset_not_found", f"No preset with id '{preset_id}'.")


def validate_warehouse(payload: Any) -> Dict[str, Any]:
    payload = require_object(payload)
    data = payload.get("warehouse", payload)
    try:
        wh = parse_warehouse(data)
    except WarehouseError as exc:
        return {"valid": False, "errors": exc.errors, "warnings": []}
    warnings: List[str] = []
    if not wh.is_reachable():
        warnings.append("The goal is currently unreachable from the start — searches will report failure.")
    if wh.target_shelf is None:
        warnings.append("No target shelf is assigned; the goal is treated as a plain retrieval cell.")
    elif abs(wh.target_shelf[0] - wh.goal[0]) + abs(wh.target_shelf[1] - wh.goal[1]) != 1:
        warnings.append("The goal cell is not adjacent to the target shelf.")
    return {"valid": True, "errors": [], "warnings": warnings,
            "summary": {"rows": wh.rows, "cols": wh.cols, "blocked_cells": len(wh.blocked),
                        "weighted_cells": len(wh.terrain_costs), "reachable": wh.is_reachable()}}


def _progression(events: List[Dict[str, Any]], max_points: int = 300) -> List[Dict[str, int]]:
    pts: List[Dict[str, int]] = []
    expanded = generated = 0
    for ev in events:
        if ev["type"] == "complete":
            continue
        expanded = ev.get("expanded_count", expanded)
        generated = ev.get("generated_count", generated if ev["type"] != "init" else 1)
        pts.append({"step": ev["step"], "frontier": ev["frontier_size"], "expanded": expanded, "generated": generated})
    if len(pts) > max_points:
        stride = len(pts) / max_points
        pts = [pts[int(i * stride)] for i in range(max_points)] + [pts[-1]]
    return pts


def search(payload: Any) -> Dict[str, Any]:
    algo, wh = parse_search_request(payload)
    result = run_search(algo, wh, record_events=True, repeats=3)
    out = result.to_dict(include_events=True)
    out["info"] = ALGORITHM_INFO[algo]
    out["structure"] = ALGORITHM_INFO[algo]["structure"]
    out["grid"] = {"rows": wh.rows, "cols": wh.cols}
    return out


def _interpret(results: Dict[str, Any]) -> List[str]:
    """Plain-language findings, each backed by the measured numbers."""
    ok = {a: r for a, r in results.items() if r.success}
    if not ok:
        eff = ", ".join(f"{a} expanded {r.expanded_nodes}" for a, r in results.items())
        return [f"No route exists: all three algorithms exhausted every reachable state and reported failure ({eff}).",
                "The robot would not move — the destination is unreachable."]
    notes: List[str] = []
    fewest = min(r.path_length for r in ok.values())
    names = [a for a, r in ok.items() if r.path_length == fewest]
    notes.append(f"Fewest movements: {', '.join(names)} with {fewest} moves"
                 + (" (BFS guarantees this minimum)." if "BFS" in names else "."))
    cheapest = min(r.total_cost for r in ok.values())
    cnames = [a for a, r in ok.items() if r.total_cost == cheapest]
    notes.append(f"Lowest total cost: {', '.join(cnames)} at {cheapest:g}"
                 + (" (UCS guarantees this minimum under positive costs)." if "UCS" in cnames else "."))
    if "BFS" in ok and "UCS" in ok:
        b, u = ok["BFS"], ok["UCS"]
        if b.total_cost > u.total_cost:
            saving = (b.total_cost - u.total_cost) / b.total_cost * 100
            notes.append(f"Terrain costs matter here: BFS used {b.path_length} moves costing {b.total_cost:g}, while UCS accepted "
                         f"{u.path_length} moves to pay only {u.total_cost:g} ({saving:.0f}% cheaper).")
        else:
            notes.append(f"BFS and UCS routes cost the same ({b.total_cost:g}) — fewest moves was also cheapest on this map.")
    if "DFS" in ok and "BFS" in ok:
        d, b = ok["DFS"], ok["BFS"]
        if d.path_length > b.path_length:
            notes.append(f"DFS followed its expansion order and returned a {d.path_length}-move route "
                         f"({d.path_length - b.path_length} more than BFS, cost {d.total_cost:g}); DFS gives no optimality guarantee.")
        else:
            notes.append(f"DFS happened to return a route as short as BFS ({d.path_length} moves) — this is map-dependent, not guaranteed.")
    least = min(r.expanded_nodes for r in results.values())
    lnames = [a for a, r in results.items() if r.expanded_nodes == least]
    notes.append(f"Fewest nodes expanded: {', '.join(lnames)} ({least}). This reflects this map and neighbour order only; "
                 "no algorithm always explores fewer nodes.")
    fastest = min(results.values(), key=lambda r: r.execution_time_ms)
    notes.append(f"Fastest measured execution: {fastest.algorithm} ({fastest.execution_time_ms:.3f} ms, best of 3). "
                 "Timings on small grids are close to measurement noise.")
    return notes


def compare(payload: Any) -> Dict[str, Any]:
    payload = require_object(payload)
    _, wh = parse_search_request({**payload, "algorithm": "BFS"})
    results = {a: run_search(a, wh, record_events=True, repeats=5) for a in ALGO_ORDER}
    out: Dict[str, Any] = {"grid": {"rows": wh.rows, "cols": wh.cols}, "results": {}, "progression": {}}
    for a, r in results.items():
        out["results"][a] = r.to_dict(include_events=False)
        out["progression"][a] = _progression(r.events)
    out["interpretation"] = _interpret(results)
    return out


def experiment_definitions() -> Dict[str, Any]:
    return {"experiments": EXPERIMENTS}


def run_experiments(payload: Any) -> Dict[str, Any]:
    cfg = parse_experiment_request(payload, EXPERIMENT_BY_ID)
    return run_experiment(cfg)


def dispatch(op: str, payload: Any = None) -> Tuple[int, Dict[str, Any]]:
    """Single entry point used by the CLI bridge. Returns ``(http_status, body)``."""
    try:
        if op == "health":
            return 200, health()
        if op == "algorithms":
            return 200, algorithms()
        if op == "presets":
            return 200, presets()
        if op == "preset":
            return 200, preset(str(payload))
        if op == "validate":
            return 200, validate_warehouse(payload)
        if op == "search":
            return 200, search(payload)
        if op == "compare":
            return 200, compare(payload)
        if op == "experiment_definitions":
            return 200, experiment_definitions()
        if op == "experiment_run":
            return 200, run_experiments(payload)
        return 404, ApiError(404, "unknown_operation", f"Unknown operation '{op}'.").body()
    except ApiError as exc:
        return exc.status, exc.body()
