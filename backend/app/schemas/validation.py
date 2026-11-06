"""Request validation. Raises :class:`ApiError`, which routes turn into clean JSON errors."""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from ..algorithms import ALGORITHMS, normalise_algorithm
from ..core.cost_model import is_valid_cost
from ..core.warehouse import Warehouse, WarehouseError, parse_warehouse


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details: Optional[List[str]] = None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details or []

    def body(self) -> Dict[str, Any]:
        return {"error": {"code": self.code, "message": self.message, "details": self.details}}


def require_object(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise ApiError(400, "invalid_json", "Request body must be a JSON object.")
    return payload


def parse_warehouse_payload(payload: Dict[str, Any]) -> Warehouse:
    if "warehouse" not in payload:
        raise ApiError(400, "missing_field", "Field 'warehouse' is required.")
    try:
        return parse_warehouse(payload["warehouse"])
    except WarehouseError as exc:
        raise ApiError(400, "invalid_warehouse", "The warehouse definition is invalid.", exc.errors) from exc


def parse_search_request(payload: Any) -> Tuple[str, Warehouse]:
    payload = require_object(payload)
    algo = payload.get("algorithm")
    if not isinstance(algo, str):
        raise ApiError(400, "missing_field", "Field 'algorithm' is required (BFS, DFS or UCS).")
    try:
        key = normalise_algorithm(algo)
    except KeyError:
        raise ApiError(400, "unknown_algorithm", f"Unknown algorithm '{algo}'. Choose one of {sorted(ALGORITHMS)}.")
    return key, parse_warehouse_payload(payload)


def _int_in(payload: Dict[str, Any], key: str, default: int, lo: int, hi: int, errors: List[str]) -> int:
    v = payload.get(key, default)
    if isinstance(v, bool) or not isinstance(v, int) or not lo <= v <= hi:
        errors.append(f"{key} must be an integer between {lo} and {hi}")
        return default
    return v


def parse_experiment_request(payload: Any, experiments: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    payload = require_object(payload)
    exp_id = payload.get("experiment_id")
    if exp_id not in experiments:
        raise ApiError(400, "unknown_experiment", f"experiment_id must be one of {sorted(experiments)}.")
    defaults = experiments[exp_id]["defaults"]
    errors: List[str] = []
    cfg: Dict[str, Any] = {"experiment_id": exp_id}
    cfg["trials"] = _int_in(payload, "trials", defaults["trials"], 1, 50, errors)
    cfg["rows"] = _int_in(payload, "rows", defaults["rows"], 4, 48, errors)
    cfg["cols"] = _int_in(payload, "cols", defaults["cols"], 4, 48, errors)
    cfg["seed"] = _int_in(payload, "seed", defaults["seed"], 0, 2**31 - 1, errors)

    density = payload.get("density", defaults["density"])
    if isinstance(density, bool) or not isinstance(density, (int, float)) or not 0 <= density <= 0.6:
        errors.append("density must be a number between 0 and 0.6")
        density = defaults["density"]
    cfg["density"] = float(density)

    dist = payload.get("cost_distribution", defaults["cost_distribution"])
    clean: Dict[str, float] = {}
    if not isinstance(dist, dict) or not dist:
        errors.append("cost_distribution must be a non-empty object like {\"1\": 3, \"5\": 1}")
    else:
        for k, w in dist.items():
            try:
                cost = float(k)
            except (TypeError, ValueError):
                errors.append(f"cost_distribution key {k!r} must be numeric")
                continue
            if not is_valid_cost(cost) or cost > 100:
                errors.append(f"cost {k!r} must be a positive number (max 100)")
            elif isinstance(w, bool) or not isinstance(w, (int, float)) or not math.isfinite(w) or w <= 0:
                errors.append(f"weight for cost {k!r} must be a positive number")
            else:
                clean[str(int(cost)) if cost.is_integer() else str(cost)] = float(w)
    cfg["cost_distribution"] = clean or defaults["cost_distribution"]

    sizes = payload.get("sizes", defaults.get("sizes"))
    if exp_id == "grid_sizes":
        ok = isinstance(sizes, list) and 1 <= len(sizes) <= 6 and all(
            isinstance(s, list) and len(s) == 2 and all(isinstance(x, int) and not isinstance(x, bool) and 4 <= x <= 48 for x in s)
            for s in sizes)
        if not ok:
            errors.append("sizes must be a list of 1-6 [rows, cols] pairs with each value between 4 and 48")
        else:
            cfg["sizes"] = sizes
    if errors:
        raise ApiError(400, "invalid_experiment", "The experiment configuration is invalid.", errors)
    cells = sum(r * c for r, c in cfg.get("sizes", [[cfg["rows"], cfg["cols"]]]))
    if cells * cfg["trials"] > 60_000:
        raise ApiError(400, "experiment_too_large",
                       "This configuration is too large (grid cells x trials exceeds 60,000). Reduce trials or grid size.")
    return cfg
