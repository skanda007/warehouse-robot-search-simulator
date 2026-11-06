import time

from app.experiments.experiment_engine import EXPERIMENT_BY_ID, generate_map, run_experiment
from app.experiments.exports import rows_to_csv
from app.experiments.metrics import describe
from app.algorithms import run_search
from app.schemas.validation import parse_experiment_request


def cfg(exp_id, **over):
    return parse_experiment_request({"experiment_id": exp_id, **over}, EXPERIMENT_BY_ID)


def test_reproducible_with_same_seed():
    a = run_experiment(cfg("weighted", trials=3, rows=10, cols=10, seed=5))
    b = run_experiment(cfg("weighted", trials=3, rows=10, cols=10, seed=5))
    strip = lambda raw: [{k: v for k, v in r.items() if k != "execution_time_ms"} for r in raw]
    assert strip(a["raw"]) == strip(b["raw"])
    c = run_experiment(cfg("weighted", trials=3, rows=10, cols=10, seed=6))
    assert strip(a["raw"]) != strip(c["raw"])


def test_same_map_for_every_algorithm_and_ucs_is_optimal():
    res = run_experiment(cfg("weighted", trials=6, rows=10, cols=10))
    by_trial = {}
    for r in res["raw"]:
        by_trial.setdefault(r["trial"], {})[r["algorithm"]] = r
    for algos in by_trial.values():
        assert set(algos) == {"BFS", "DFS", "UCS"}
        assert len({a["obstacle_cells"] for a in algos.values()}) == 1
        assert len({a["success"] for a in algos.values()}) == 1
        if algos["UCS"]["success"]:
            assert algos["UCS"]["total_cost"] <= min(a["total_cost"] for a in algos.values())
            assert algos["BFS"]["path_length"] <= min(a["path_length"] for a in algos.values())
            assert algos["UCS"]["cost_gap_vs_ucs"] == 0


def test_unreachable_experiment_all_fail():
    res = run_experiment(cfg("unreachable", trials=4))
    assert all(not r["success"] for r in res["raw"])
    assert all(s["success_rate"] == 0 for s in res["summary"])


def test_density_ordering_and_reachability():
    sparse = generate_map("random", 14, 14, 0.05, {"1": 1}, "k")
    dense = generate_map("random", 14, 14, 0.30, {"1": 1}, "k")
    assert len(sparse.blocked) < len(dense.blocked)
    assert sparse.is_reachable() and dense.is_reachable()


def test_grid_sizes_summary_and_csv():
    res = run_experiment(cfg("grid_sizes", trials=2, sizes=[[6, 6], [10, 10]]))
    assert {s["size"] for s in res["summary"]} == {"6x6", "10x10"}
    s = res["summary"][0]
    assert {"mean", "median", "std"} == set(s["metrics"]["expanded_nodes"])
    lines = res["csv"]["raw"].strip().splitlines()
    assert lines[0].startswith("experiment,trial") and len(lines) == 1 + len(res["raw"])
    assert res["csv"]["summary"].startswith("size,algorithm")
    assert rows_to_csv([]).count("\n") == 1


def test_describe_statistics():
    d = describe([1, 2, 3, 4])
    assert d == {"mean": 2.5, "median": 2.5, "std": 1.291}
    assert describe([]) == {"mean": None, "median": None, "std": None}
    assert describe([7])["std"] == 0.0


def test_performance_small_medium_large():
    for n, budget_s in ((8, 0.5), (24, 1.0), (48, 3.0)):
        wh = generate_map("random", n, n, 0.12, {"1": 3, "2": 1}, f"perf{n}")
        t0 = time.perf_counter()
        for a in ("BFS", "DFS", "UCS"):
            run_search(a, wh, record_events=True)
        assert time.perf_counter() - t0 < budget_s
