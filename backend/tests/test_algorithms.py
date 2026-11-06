import random

import pytest

from app.algorithms import run_search
from app.core.path_reconstruction import path_cost, reconstruct_path
from app.core.state import ACTIONS, direction_between
from app.core.warehouse import Warehouse, WarehouseError

ALGOS = ("BFS", "DFS", "UCS")


def wh_from(lines, name="t"):
    return Warehouse.from_ascii(name, lines)


def reference_costs(wh, unit=False):
    """Independent Bellman-Ford style relaxation used as the oracle."""
    INF = float("inf")
    dist = {(r, c): INF for r in range(wh.rows) for c in range(wh.cols) if wh.is_walkable((r, c))}
    dist[wh.start] = 0
    changed = True
    while changed:
        changed = False
        for cell, d in list(dist.items()):
            if d == INF:
                continue
            for _, nb, kind in wh.neighbors(cell):
                if kind != "ok":
                    continue
                nd = d + (1 if unit else wh.cost(nb))
                if nd < dist[nb]:
                    dist[nb] = nd
                    changed = True
    return dist[wh.goal]


def random_wh(seed, rows=9, cols=9, density=0.25, weighted=True):
    rng = random.Random(seed)
    obstacles = {(r, c) for r in range(rows) for c in range(cols)
                 if rng.random() < density and (r, c) not in ((0, 0), (rows - 1, cols - 1))}
    costs = {(r, c): rng.choice([1, 2, 3, 5]) for r in range(rows) for c in range(cols)
             if weighted and (r, c) not in obstacles and (r, c) != (0, 0)}
    return Warehouse(rows=rows, cols=cols, start=(0, 0), goal=(rows - 1, cols - 1), obstacles=obstacles,
                     terrain_costs=costs)


def check_path_validity(wh, res):
    p = res.path
    assert p[0] == wh.start and p[-1] == wh.goal
    for a, b in zip(p, p[1:]):
        assert abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1  # four-directional only, no diagonals
        assert wh.is_walkable(b)
    assert res.total_cost == path_cost(wh, p)
    assert res.path_length == len(p) - 1 == len(res.directions)


def test_bfs_minimum_moves_matches_oracle():
    for seed in range(40):
        wh = random_wh(seed)
        res = run_search("BFS", wh, record_events=False)
        ref = reference_costs(wh, unit=True)
        if ref == float("inf"):
            assert not res.success
        else:
            assert res.success and res.path_length == ref
            check_path_validity(wh, res)


def test_ucs_minimum_cost_matches_oracle():
    for seed in range(40):
        wh = random_wh(seed)
        res = run_search("UCS", wh, record_events=False)
        ref = reference_costs(wh)
        if ref == float("inf"):
            assert not res.success
        else:
            assert res.success and res.total_cost == ref
            check_path_validity(wh, res)


def test_dfs_returns_valid_route_but_no_optimality():
    found_suboptimal = False
    for seed in range(40):
        wh = random_wh(seed)
        res = run_search("DFS", wh, record_events=False)
        if reference_costs(wh) == float("inf"):
            assert not res.success
            continue
        assert res.success
        check_path_validity(wh, res)
        assert res.total_cost >= reference_costs(wh)
        found_suboptimal |= res.total_cost > reference_costs(wh)
    assert found_suboptimal  # DFS really is not optimal


def test_weighted_terrain_bfs_vs_ucs():
    wh = wh_from(["S.55.G",
                  "..55..",
                  "......"][:3])
    bfs, ucs = run_search("BFS", wh, False), run_search("UCS", wh, False)
    assert bfs.path_length <= ucs.path_length
    assert ucs.total_cost <= bfs.total_cost
    # direct row crosses the 5s; UCS must go around: 2 down + 5 right ... cost computed explicitly
    assert ucs.total_cost == reference_costs(wh)


class EdgeCostWarehouse(Warehouse):
    """Edge-dependent costs (not part of the cell-cost model) to exercise UCS relaxation."""
    edge_costs = {}

    def step_cost(self, a, b):
        return self.edge_costs.get((a, b), 1)


def test_ucs_cost_relaxation_and_stale_entries():
    wh = EdgeCostWarehouse(rows=3, cols=3, start=(0, 0), goal=(2, 2))
    wh.edge_costs = {((1, 0), (1, 1)): 10}  # (1,0) is expanded first -> expensive first discovery of (1,1)
    res = run_search("UCS", wh, True)
    relaxed = [n for e in res.events if e["type"] == "expand" for n in e["neighbors"] if n["result"] == "relaxed"]
    assert relaxed and relaxed[0]["state"] == [1, 1] and relaxed[0]["old_g"] == 11 and relaxed[0]["g"] == 2
    assert relaxed[0]["old_parent"] == [1, 0]
    assert res.total_cost == 4 and res.path_length == 4
    # make the expensive entry reachable before the goal so the stale pop appears
    wh2 = EdgeCostWarehouse(rows=3, cols=3, start=(0, 0), goal=(2, 2))
    wh2.edge_costs = {((1, 0), (1, 1)): 10, ((1, 2), (2, 2)): 30, ((2, 1), (2, 2)): 30}
    res2 = run_search("UCS", wh2, True)
    assert any(e["type"] == "skip" and e["reason"] == "stale_entry" for e in res2.events)
    assert res2.total_cost == path_cost(wh2, res2.path) == 33


def test_cell_cost_model_never_needs_relaxation():
    for seed in range(20):
        res = run_search("UCS", random_wh(seed), True)
        assert not any(n["result"] == "relaxed" for e in res.events for n in e.get("neighbors", []))


def test_obstacles_never_entered():
    wh = random_wh(3)
    for a in ALGOS:
        res = run_search(a, wh, False)
        assert not set(res.exploration_sequence) & wh.blocked


def test_start_equals_goal():
    wh = Warehouse(rows=3, cols=3, start=(1, 1), goal=(1, 1))
    for a in ALGOS:
        res = run_search(a, wh, True)
        assert res.success and res.path == [(1, 1)] and res.path_length == 0 and res.total_cost == 0
        assert res.expanded_nodes == 1 and res.generated_nodes == 1


def test_unreachable_all_report_failure():
    wh = wh_from(["S.#..",
                  "..#.G",
                  "..#.."])
    for a in ALGOS:
        res = run_search(a, wh, True)
        assert not res.success and res.path == [] and res.total_cost == 0
        assert res.events[-1]["type"] == "complete" and res.events[-1]["success"] is False
        assert res.generated_nodes == 6  # every cell on the start side was discovered


def test_boundary_conditions_one_row_grid():
    wh = Warehouse(rows=2, cols=5, start=(0, 0), goal=(0, 4), obstacles={(1, 0), (1, 1), (1, 2), (1, 3), (1, 4)})
    for a in ALGOS:
        res = run_search(a, wh, False)
        assert res.path == [(0, c) for c in range(5)]
        assert res.directions == ["RIGHT"] * 4


def test_invalid_costs_rejected():
    for bad in (0, -2, float("inf"), float("nan"), True, "3"):
        with pytest.raises(WarehouseError):
            Warehouse(rows=2, cols=2, start=(0, 0), goal=(1, 1), terrain_costs={(0, 1): bad})


def test_neighbour_order_and_no_diagonals():
    assert [n for n, _ in ACTIONS] == ["UP", "DOWN", "LEFT", "RIGHT"]
    wh = Warehouse(rows=3, cols=3, start=(1, 1), goal=(0, 0))
    assert [(a, s) for a, s, k in wh.neighbors((1, 1))] == [("UP", (0, 1)), ("DOWN", (2, 1)), ("LEFT", (1, 0)), ("RIGHT", (1, 2))]
    with pytest.raises(ValueError):
        direction_between((0, 0), (1, 1))


def test_deterministic_results():
    wh = random_wh(5)
    for a in ALGOS:
        r1, r2 = run_search(a, wh, True), run_search(a, wh, True)
        assert r1.path == r2.path and r1.events == r2.events


def test_path_reconstruction():
    parent = {(0, 0): None, (0, 1): (0, 0), (0, 2): (0, 1)}
    assert reconstruct_path(parent, (0, 0), (0, 2)) == [(0, 0), (0, 1), (0, 2)]
    assert reconstruct_path(parent, (0, 0), (5, 5)) == []
    assert reconstruct_path({(0, 0): (0, 1), (0, 1): (0, 0)}, (9, 9), (0, 0)) == []  # cycle guard


def test_queue_stack_and_heap_semantics():
    wh = wh_from(["S...", "....", "...G"])
    bfs = run_search("BFS", wh, True)
    # FIFO: pop ids are non-decreasing; LIFO: DFS pops newest; UCS pops non-decreasing g
    pops = [e["pop_id"] for e in bfs.events if e["type"] == "expand"]
    assert pops == sorted(pops)
    ucs = run_search("UCS", wh, True)
    gs = [e["g"] for e in ucs.events if e["type"] == "expand"]
    assert gs == sorted(gs)
    dfs = run_search("DFS", wh, True)
    first = dfs.events[1]
    pushed = [n for n in first["neighbors"] if "id" in n]
    assert dfs.events[2]["pop_id"] == max(n["id"] for n in pushed)  # newest pushed entry popped first
    assert pushed[-1]["action"] == "UP" or pushed[-1]["action"] == "DOWN"  # push order is reversed (UP last when possible)


def replay_frontier(events):
    frontier = {}
    for e in events:
        if e["type"] in ("expand", "skip"):
            frontier.pop(e["pop_id"])
        for n in e.get("neighbors", []):
            if "id" in n:
                frontier[n["id"]] = n["state"]
        if e["type"] != "complete":
            assert len(frontier) == e["frontier_size"]
    return frontier


@pytest.mark.parametrize("algo", ALGOS)
def test_event_replay_reproduces_frontier_sizes(algo):
    for seed in range(10):
        res = run_search(algo, random_wh(seed), True)
        replay_frontier(res.events)


@pytest.mark.parametrize("algo", ALGOS)
def test_metrics_conventions(algo):
    wh = random_wh(7)
    res = run_search(algo, wh, True)
    expands = [e for e in res.events if e["type"] == "expand"]
    assert res.expanded_nodes == len(expands) == len(res.exploration_sequence)
    assert len(set(res.exploration_sequence)) == res.expanded_nodes  # nothing expanded twice
    assert res.generated_nodes == len(res.parent_map)
    assert res.max_frontier_size == max(e["frontier_size"] for e in res.events if e["type"] != "complete") or \
        res.max_frontier_size >= max(e["frontier_size"] for e in res.events if e["type"] != "complete")
    assert res.execution_time_ms > 0
    tree = res.search_tree
    assert len(tree["nodes"]) == res.generated_nodes and len(tree["edges"]) == res.generated_nodes - 1


def test_duplicate_states_never_generated_twice_in_bfs():
    res = run_search("BFS", random_wh(1), True)
    discovered = [tuple(n["state"]) for e in res.events for n in e.get("neighbors", []) if n["result"] == "discovered"]
    assert len(discovered) == len(set(discovered))


def test_silent_and_recorded_runs_agree():
    wh = random_wh(11)
    for a in ALGOS:
        silent, recorded = run_search(a, wh, False), run_search(a, wh, True)
        assert silent.path == recorded.path and silent.expanded_nodes == recorded.expanded_nodes
        assert silent.events == []
