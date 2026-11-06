"""Search-event recording.

Events are *deltas*: each one describes a single pop (and the pushes that
followed it). The frontend rebuilds the exact frontier by replaying them, so
no full frontier snapshot is stored per step.

Event schema (all states are ``[row, col]``)::

    init     {structure, start, goal, neighbors:[{action:"START", ...push}], frontier_size}
    expand   {current, parent, g, depth, pop_id, expanded_count, generated_count,
              goal_found, neighbors:[...], frontier_size}
    skip     {current, parent, g, depth, pop_id, reason, frontier_size}   (stale / duplicate pop)
    complete {success, path, path_length, total_cost}

Neighbour records::

    {action, state, result, [id, g, old_g, old_parent, best_g, reason]}
    result: discovered | relaxed | repush  -> pushed onto the frontier (has ``id``)
            ignored                        -> considered, not pushed
            blocked | out_of_bounds        -> not traversable

The pop of an entry removes the frontier entry whose ``id == pop_id``.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


class NullRecorder:
    enabled = False

    def record(self, event_type: str, **fields: Any) -> None:  # pragma: no cover - trivial
        return None


class EventRecorder:
    enabled = True

    def __init__(self) -> None:
        self.events: List[Dict[str, Any]] = []

    def record(self, event_type: str, **fields: Any) -> None:
        event: Dict[str, Any] = {"step": len(self.events), "type": event_type}
        event.update(fields)
        self.events.append(event)


def nb_record(action: Optional[str], state, result: str, **extra: Any) -> Dict[str, Any]:
    rec: Dict[str, Any] = {"action": action, "state": list(state), "result": result}
    rec.update(extra)
    return rec
