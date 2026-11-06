"""Centralised, validated scenario registry.

Every preset is built, serialised and re-parsed through ``parse_warehouse`` at
import time, so a malformed preset fails loudly at startup instead of silently
loading a stale or corrupt environment.
"""
from __future__ import annotations

from typing import Any, Dict, List

from ..core.warehouse import parse_warehouse
from .predefined_maps import PRESET_DEFINITIONS


class PresetNotFound(KeyError):
    pass


def _build_registry() -> Dict[str, Dict[str, Any]]:
    registry: Dict[str, Dict[str, Any]] = {}
    for pid, name, description, tags, builder in PRESET_DEFINITIONS:
        wh = builder()
        data = wh.to_dict()
        data["name"] = name
        parse_warehouse(data)  # raises WarehouseError if the preset is invalid
        registry[pid] = {
            "id": pid,
            "name": name,
            "description": description,
            "tags": tags,
            "rows": wh.rows,
            "cols": wh.cols,
            "reachable": wh.is_reachable(),
            "obstacle_cells": len(wh.blocked),
            "weighted_cells": len(wh.terrain_costs),
            "warehouse": data,
        }
    return registry


_REGISTRY = _build_registry()


def list_presets() -> List[Dict[str, Any]]:
    """Summaries (without the full grid) in display order."""
    return [{k: v for k, v in p.items() if k != "warehouse"} for p in _REGISTRY.values()]


def get_preset(preset_id: str) -> Dict[str, Any]:
    if preset_id not in _REGISTRY:
        raise PresetNotFound(preset_id)
    p = _REGISTRY[preset_id]
    return {**{k: v for k, v in p.items() if k != "warehouse"}, "warehouse": p["warehouse"]}
