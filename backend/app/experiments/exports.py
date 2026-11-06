"""CSV export helpers (standard-library csv module)."""
from __future__ import annotations

import csv
import io
from typing import Any, Dict, List

RAW_COLUMNS = [
    "experiment", "trial", "rows", "cols", "seed", "obstacle_cells", "algorithm", "success",
    "path_length", "total_cost", "expanded_nodes", "generated_nodes", "max_frontier_size",
    "execution_time_ms", "search_effort", "cost_gap_vs_ucs", "moves_gap_vs_bfs",
]


def rows_to_csv(rows: List[Dict[str, Any]]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=RAW_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: ("" if row.get(k) is None else row.get(k)) for k in RAW_COLUMNS})
    return buf.getvalue()


def summary_to_csv(summary: List[Dict[str, Any]]) -> str:
    if not summary:
        return ""
    metric_names = list(summary[0]["metrics"].keys())
    header = ["size", "algorithm", "trials", "successes", "success_rate"]
    for m in metric_names:
        header += [f"{m}_mean", f"{m}_median", f"{m}_std"]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    for s in summary:
        line: List[Any] = [s["size"], s["algorithm"], s["trials"], s["successes"], s["success_rate"]]
        for m in metric_names:
            d = s["metrics"][m]
            line += ["" if d[k] is None else d[k] for k in ("mean", "median", "std")]
        writer.writerow(line)
    return buf.getvalue()
