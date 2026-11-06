import json
import subprocess
import sys
from pathlib import Path

import pytest

from app import create_app
from app.core.warehouse import parse_warehouse
from app.algorithms import run_search
from app.scenarios.registry import get_preset, list_presets

EXPECTED_PRESETS = ["simple", "sparse", "dense", "multi_route", "weighted", "narrow", "unreachable", "large", "complex", "open"]
SIMPLE = {"rows": 6, "cols": 6, "start": [0, 0], "goal": [5, 5], "obstacles": [[0, 3], [1, 3], [2, 2]], "terrain_costs": {}}


@pytest.fixture()
def client():
    return create_app().test_client()


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json["ok"] is True


def test_cors_header_for_allowed_origin(client):
    r = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"


def test_algorithms_endpoint(client):
    names = [a["id"] for a in client.get("/api/algorithms").json["algorithms"]]
    assert names == ["BFS", "DFS", "UCS"]


def test_all_presets_listed_and_loadable(client):
    listed = client.get("/api/warehouses/presets").json["presets"]
    assert [p["id"] for p in listed] == EXPECTED_PRESETS
    for pid in EXPECTED_PRESETS:
        data = client.get(f"/api/warehouses/presets/{pid}").json
        wh = parse_warehouse(data["warehouse"])
        assert (wh.rows, wh.cols) == (data["rows"], data["cols"])
        assert data["warehouse"]["name"] == data["name"]
        assert wh.is_reachable() == (pid != "unreachable")


def test_unknown_preset_404(client):
    r = client.get("/api/warehouses/presets/nope")
    assert r.status_code == 404 and r.json["error"]["code"] == "preset_not_found"


@pytest.mark.parametrize("algo", ["BFS", "DFS", "UCS"])
def test_search_consistent_structure(client, algo):
    r = client.post("/api/search", json={"algorithm": algo, "warehouse": SIMPLE})
    assert r.status_code == 200
    body = r.json
    for key in ("algorithm", "success", "path", "path_length", "total_cost", "expanded_nodes", "generated_nodes",
                "max_frontier_size", "execution_time_ms", "events", "search_tree", "directions", "parent_map",
                "exploration_sequence"):
        assert key in body
    assert body["algorithm"] == algo and body["success"] and body["path"][0] == [0, 0] and body["path"][-1] == [5, 5]
    assert set(body["search_tree"]) == {"nodes", "edges"}


def test_search_matches_engine_directly(client):
    body = client.post("/api/search", json={"algorithm": "ucs", "warehouse": get_preset("weighted")["warehouse"]}).json
    direct = run_search("UCS", parse_warehouse(get_preset("weighted")["warehouse"]), False)
    assert body["total_cost"] == direct.total_cost == 21


def test_invalid_requests(client):
    assert client.post("/api/search", json={"warehouse": SIMPLE}).status_code == 400
    r = client.post("/api/search", json={"algorithm": "A*", "warehouse": SIMPLE})
    assert r.status_code == 400 and r.json["error"]["code"] == "unknown_algorithm"
    bad = {**SIMPLE, "start": [9, 9], "terrain_costs": {"1,1": -3}}
    r = client.post("/api/search", json={"algorithm": "BFS", "warehouse": bad})
    assert r.status_code == 400 and r.json["error"]["details"]
    assert "Traceback" not in json.dumps(r.json)
    assert client.post("/api/search", data="not json", content_type="application/json").status_code == 400


def test_validation_rules(client):
    def v(**over):
        return client.post("/api/warehouses/validate", json={"warehouse": {**SIMPLE, **over}}).json
    assert v()["valid"]
    assert not v(goal=[0, 0])["valid"]  # overlap
    assert not v(start=[0, 3])["valid"]  # start on obstacle
    assert not v(rows=1)["valid"] and not v(rows=500)["valid"]
    assert not v(terrain_costs={"2,2": 0})["valid"]
    assert not v(racks=[[0, 0]])["valid"]  # racks cannot block start
    assert v(obstacles=[[4, 5], [5, 4]])["warnings"]  # sealed goal => warning only


def test_compare_runs_all_algorithms(client):
    body = client.post("/api/search/compare", json={"warehouse": get_preset("weighted")["warehouse"]}).json
    assert set(body["results"]) == {"BFS", "DFS", "UCS"}
    assert body["results"]["UCS"]["total_cost"] < body["results"]["BFS"]["total_cost"]
    assert all(body["progression"][a] for a in body["results"]) and body["interpretation"]
    assert "events" not in body["results"]["BFS"]


def test_compare_unreachable(client):
    body = client.post("/api/search/compare", json={"warehouse": get_preset("unreachable")["warehouse"]}).json
    assert all(not r["success"] for r in body["results"].values())
    assert "No route exists" in body["interpretation"][0]


def test_experiment_endpoint_and_validation(client):
    r = client.post("/api/experiments/run", json={"experiment_id": "sparse", "trials": 3, "rows": 8, "cols": 8})
    assert r.status_code == 200 and r.json["synthetic"] and len(r.json["raw"]) == 9
    assert client.post("/api/experiments/run", json={"experiment_id": "x"}).status_code == 400
    assert client.post("/api/experiments/run", json={"experiment_id": "sparse", "trials": 9999}).status_code == 400


def test_all_preset_summaries_have_metadata():
    for p in list_presets():
        assert p["description"] and p["tags"]


def test_cli_bridge_roundtrip():
    backend = Path(__file__).resolve().parents[1]
    proc = subprocess.run([sys.executable, "cli.py"], cwd=backend, capture_output=True, text=True,
                          input=json.dumps({"op": "search", "payload": {"algorithm": "BFS", "warehouse": SIMPLE}}))
    out = json.loads(proc.stdout)
    assert out["status"] == 200 and out["body"]["success"]
    bad = subprocess.run([sys.executable, "cli.py"], cwd=backend, capture_output=True, text=True, input="{nope")
    assert json.loads(bad.stdout)["status"] == 400
