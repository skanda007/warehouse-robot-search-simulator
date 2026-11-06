"""Descriptive statistics for experiment summaries."""
from __future__ import annotations

import statistics
from typing import Dict, Iterable, Optional


def describe(values: Iterable[float]) -> Dict[str, Optional[float]]:
    """Mean, median and (sample) standard deviation; ``None`` when there is no data."""
    vals = [float(v) for v in values]
    if not vals:
        return {"mean": None, "median": None, "std": None}
    return {
        "mean": round(statistics.fmean(vals), 4),
        "median": round(statistics.median(vals), 4),
        "std": round(statistics.stdev(vals), 4) if len(vals) > 1 else 0.0,
    }
