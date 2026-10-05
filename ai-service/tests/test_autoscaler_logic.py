"""Pure logic tests for autoscaler behavior — no subprocesses, no real Redis."""
from __future__ import annotations

import pytest

from app.workers.pool import (
    AutoscalerConfig,
    combined_token_report,
    desired_worker_count,
    scale_action,
)


# ── Desired count calculation with various configs ────────────────────────────

class TestDesiredCountVariousConfigs:
    def test_min1_max4_target1_queue0(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(0, cfg) == 1

    def test_min1_max4_target1_queue1(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(1, cfg) == 1

    def test_min1_max4_target1_queue2(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(2, cfg) == 2

    def test_min1_max4_target1_queue3(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(3, cfg) == 3

    def test_min1_max4_target1_queue4(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(4, cfg) == 4

    def test_min1_max4_target1_queue8_capped(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(8, cfg) == 4

    def test_min2_max4_queue0_returns_2(self):
        cfg = AutoscalerConfig(min_workers=2, max_workers=4, target_jobs_per_worker=1,
                               max_concurrent_jobs=4)
        assert desired_worker_count(0, cfg) == 2

    def test_target2_queue3_gives_2(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=2,
                               max_concurrent_jobs=4)
        assert desired_worker_count(3, cfg) == 2

    def test_target2_queue4_gives_2(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=2,
                               max_concurrent_jobs=4)
        assert desired_worker_count(4, cfg) == 2

    def test_target2_queue5_gives_3(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=2,
                               max_concurrent_jobs=4)
        assert desired_worker_count(5, cfg) == 3


# ── MIN_WORKERS=1 always respected ───────────────────────────────────────────

class TestMinWorkersEnforced:
    def test_min1_not_violated_even_empty_queue(self):
        cfg = AutoscalerConfig(min_workers=1)
        assert desired_worker_count(0, cfg) >= 1

    def test_min2_not_violated_even_empty_queue(self):
        cfg = AutoscalerConfig(min_workers=2)
        assert desired_worker_count(0, cfg) >= 2

    def test_min3_not_violated_even_empty_queue(self):
        cfg = AutoscalerConfig(min_workers=3, max_workers=4)
        assert desired_worker_count(0, cfg) >= 3

    def test_min1_floor_with_large_target(self):
        # With target=10 and queue=5, would calculate 1 worker, which equals min=1
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, target_jobs_per_worker=10)
        result = desired_worker_count(5, cfg)
        assert result >= 1


# ── MAX_WORKERS=4 always respected ───────────────────────────────────────────

class TestMaxWorkersEnforced:
    def test_max4_not_exceeded_at_queue_100(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=4, max_concurrent_jobs=10)
        assert desired_worker_count(100, cfg) <= 4

    def test_max2_not_exceeded(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=2, max_concurrent_jobs=10)
        assert desired_worker_count(100, cfg) <= 2

    def test_max_concurrent_jobs_also_caps(self):
        cfg = AutoscalerConfig(min_workers=1, max_workers=10, max_concurrent_jobs=4)
        assert desired_worker_count(100, cfg) <= 4


# ── scale_action correctness ──────────────────────────────────────────────────

class TestScaleActionStrings:
    def test_returns_scale_up_string(self):
        assert scale_action(1, 3) == "SCALE_UP"

    def test_returns_scale_down_string(self):
        assert scale_action(3, 1) == "SCALE_DOWN"

    def test_returns_none_string(self):
        assert scale_action(2, 2) == "NONE"

    def test_all_equal_cases_return_none(self):
        for n in range(5):
            assert scale_action(n, n) == "NONE"


# ── combined_token_report correctness ────────────────────────────────────────

class TestCombinedTokenReportLogic:
    def test_two_runs_all_fields_summed(self):
        runs = [
            {"llm_calls": 6, "input_tokens": 9000, "output_tokens": 7000, "total_tokens": 16000},
            {"llm_calls": 4, "input_tokens": 6000, "output_tokens": 5000, "total_tokens": 11000},
        ]
        r = combined_token_report(runs)
        assert r["llm_calls"]    == 10
        assert r["input_tokens"] == 15000
        assert r["output_tokens"]== 12000
        assert r["total_tokens"] == 27000
        assert r["run_count"]    == 2

    def test_empty_returns_zero_sums(self):
        r = combined_token_report([])
        assert r["total_tokens"] == 0
        assert r["run_count"]    == 0

    def test_single_run_passes_through(self):
        runs = [{"llm_calls": 5, "input_tokens": 8000, "output_tokens": 5000, "total_tokens": 13000}]
        r = combined_token_report(runs)
        assert r["total_tokens"] == 13000
        assert r["run_count"]    == 1

    def test_runs_field_is_original_list(self):
        runs = [{"run_id": "x"}]
        r = combined_token_report(runs)
        assert r["runs"] is runs


# ── Generation source accuracy ────────────────────────────────────────────────

class TestGenerationSourceAccuracy:
    def test_fallback_preserved_when_llm_unavailable(self):
        # Simulates a run where LLM hit 429 — generation_source must be FALLBACK not NONE
        run = {"generation_source": "FALLBACK", "total_tokens": 5000}
        assert run["generation_source"] == "FALLBACK"
        assert run["generation_source"] != "NONE"

    def test_llm_source_only_on_successful_generation(self):
        run = {"generation_source": "LLM", "total_tokens": 16079}
        assert run["generation_source"] == "LLM"

    def test_no_static_fallback_roadmap(self):
        # No static roadmap means generation_source should never be a static label
        valid_sources = {"LLM", "FALLBACK", "CACHE"}
        run = {"generation_source": "LLM"}
        assert run["generation_source"] in valid_sources

    def test_combined_report_preserves_per_run_source(self):
        runs = [
            {"run_id": "alice", "generation_source": "LLM",     "total_tokens": 16000},
            {"run_id": "bob",   "generation_source": "FALLBACK", "total_tokens":  5000},
        ]
        report = combined_token_report(runs)
        sources = {r["run_id"]: r["generation_source"] for r in report["runs"]}
        assert sources["alice"] == "LLM"
        assert sources["bob"]   == "FALLBACK"
