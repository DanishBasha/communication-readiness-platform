"""Worker pool configuration and scaling calculation.

This module contains only pure logic (no subprocess management) so it is
fully testable without side-effects.  The autoscaler imports these
primitives to decide when and how to scale.
"""
from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class AutoscalerConfig:
    """Scaling parameters read from environment variables."""
    min_workers: int = 1
    max_workers: int = 4
    target_jobs_per_worker: int = 1
    scale_up_cooldown: float = 10.0
    scale_down_cooldown: float = 30.0
    max_concurrent_jobs: int = 4


def desired_worker_count(queue_depth: int, cfg: AutoscalerConfig) -> int:
    """Return the desired number of workers for the current queue depth.

    Always between cfg.min_workers and min(cfg.max_workers, cfg.max_concurrent_jobs).
    """
    if queue_depth <= 0:
        return cfg.min_workers
    raw = math.ceil(queue_depth / max(cfg.target_jobs_per_worker, 1))
    capped = min(raw, cfg.max_workers, cfg.max_concurrent_jobs)
    return max(cfg.min_workers, capped)


def scale_action(current: int, desired: int) -> str:
    """Return the scaling action name for logging/metrics."""
    if desired > current:
        return "SCALE_UP"
    if desired < current:
        return "SCALE_DOWN"
    return "NONE"


def combined_token_report(run_metrics: list[dict]) -> dict:
    """Aggregate per-run token metrics into a combined report.

    Each dict in run_metrics should have keys:
        run_id, llm_calls, input_tokens, output_tokens, total_tokens,
        generation_source (optional)
    """
    return {
        "run_count":    len(run_metrics),
        "llm_calls":    sum(r.get("llm_calls",    0) for r in run_metrics),
        "input_tokens": sum(r.get("input_tokens", 0) for r in run_metrics),
        "output_tokens":sum(r.get("output_tokens",0) for r in run_metrics),
        "total_tokens": sum(r.get("total_tokens", 0) for r in run_metrics),
        "runs":         run_metrics,
    }
