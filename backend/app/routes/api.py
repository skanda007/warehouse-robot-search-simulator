"""Flask REST routes — thin wrappers around :mod:`app.service`."""
from __future__ import annotations

from typing import Any, Callable, Tuple

from flask import Blueprint, jsonify, request

from .. import service

api = Blueprint("api", __name__, url_prefix="/api")


def _json() -> Any:
    return request.get_json(silent=True)


def _respond(result: Tuple[int, dict]):
    status, body = result
    return jsonify(body), status


def _run(op: str, payload: Any = None):
    return _respond(service.dispatch(op, payload))


@api.get("/health")
def health():
    return _run("health")


@api.get("/algorithms")
def algorithms():
    return _run("algorithms")


@api.get("/warehouses/presets")
def presets():
    return _run("presets")


@api.get("/warehouses/presets/<preset_id>")
def preset(preset_id: str):
    return _run("preset", preset_id)


@api.post("/warehouses/validate")
def validate():
    return _run("validate", _json())


@api.post("/search")
def search():
    return _run("search", _json())


@api.post("/search/compare")
def compare():
    return _run("compare", _json())


@api.get("/experiments/definitions")
def experiment_definitions():
    return _run("experiment_definitions")


@api.post("/experiments/run")
def experiments_run():
    return _run("experiment_run", _json())
