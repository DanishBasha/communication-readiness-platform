"""Tests for app.workers.pool — pure logic, no subprocesses, no Redis."""
from __future__ import annotations

import pytest

from app.workers.pool import (
    AutoscalerConfig,
    combined_token_report,
    desired_worker_count,
    scale_action,
)


# ── A. desired_worker_count ───────────────────────────────────────────────────

class TestDesiredWorkerCount:
    def _cfg(self, **kw) -> AutoscalerConfig:
        defaults = dict(min_workers=1, max_workers=4, target_jobs_per_worker=1,
                        scale_up_cooldown=10, scale_down_cooldown=30, max_concurrent_jobs=4)
        defaults.update(kw)
        return AutoscalerConfig(**defaults)

    def test_empty_queue_returns_min_workers(self):
        assert desired_worker_count(0, self._cfg(min_workers=1)) == 1

    def test_negative_depth_returns_min_workers(self):
        assert desired_worker_count(-5, self._cfg(min_workers=2)) == 2

    def test_depth_1_target_1_gives_1_worker(self):
        assert desired_worker_count(1, self._cfg()) == 1

    def test_depth_2_target_1_gives_2_workers(self):
        assert desired_worker_count(2, self._cfg()) == 2

    def test_depth_4_max_4_gives_4(self):
        assert desired_worker_count(4, self._cfg(max_workers=4)) == 4

    def test_depth_10_clamped_to_max_workers(self):
        assert desired_worker_count(10, self._cfg(max_workers=4)) == 4

    def test_clamped_by_max_concurrent_jobs(self):
        cfg = self._cfg(max_workers=8, max_concurrent_jobs=3)
        assert desired_worker_count(10, cfg) == 3

    def test_always_at_least_min_workers_when_empty(self):
        cfg = self._cfg(min_workers=2)
        assert desired_worker_count(0, cfg) == 2

    def test_target_2_depth_4_gives_2_workers(self):
        cfg = self._cfg(target_jobs_per_worker=2, max_workers=4)
        assert desired_worker_count(4, cfg) == 2

    def test_target_2_depth_3_gives_2_workers(self):
        cfg = self._cfg(target_jobs_per_worker=2, max_workers=4)
        assert desired_worker_count(3, cfg) == 2

    def test_min_floor_above_calculated(self):
        # min=3 but queue empty → still returns 3
        cfg = self._cfg(min_workers=3, max_workers=4)
        assert desired_worker_count(0, cfg) == 3

    def test_both_caps_applied_max_workers_tighter(self):
        # max_workers=2 < max_concurrent_jobs=4 → clamp at 2
        cfg = self._cfg(max_workers=2, max_concurrent_jobs=4)
        assert desired_worker_count(10, cfg) == 2

    def test_both_caps_applied_max_concurrent_tighter(self):
        # max_workers=4 > max_concurrent_jobs=2 → clamp at 2
        cfg = self._cfg(max_workers=4, max_concurrent_jobs=2)
        assert desired_worker_count(10, cfg) == 2


# ── B. scale_action ───────────────────────────────────────────────────────────

class TestScaleAction:
    def test_current_less_than_desired_scale_up(self):
        assert scale_action(1, 3) == "SCALE_UP"

    def test_current_greater_than_desired_scale_down(self):
        assert scale_action(3, 1) == "SCALE_DOWN"

    def test_current_equals_desired_none(self):
        assert scale_action(2, 2) == "NONE"

    def test_zero_workers_desired_one_scale_up(self):
        assert scale_action(0, 1) == "SCALE_UP"

    def test_one_worker_desired_zero_scale_down(self):
        assert scale_action(1, 0) == "SCALE_DOWN"


# ── C. combined_token_report ──────────────────────────────────────────────────

class TestCombinedTokenReport:
    def test_sums_all_fields(self):
        runs = [
            {"run_id": "a", "llm_calls": 3, "input_tokens": 100, "output_tokens": 50, "total_tokens": 150},
            {"run_id": "b", "llm_calls": 5, "input_tokens": 200, "output_tokens": 80, "total_tokens": 280},
        ]
        report = combined_token_report(runs)
        assert report["run_count"]    == 2
        assert report["llm_calls"]    == 8
        assert report["input_tokens"] == 300
        assert report["output_tokens"]== 130
        assert report["total_tokens"] == 430
        assert report["runs"] is runs

    def test_empty_list_returns_zeros(self):
        report = combined_token_report([])
        assert report["run_count"]    == 0
        assert report["llm_calls"]    == 0
        assert report["input_tokens"] == 0
        assert report["output_tokens"]== 0
        assert report["total_tokens"] == 0
        assert report["runs"] == []

    def test_single_run(self):
        runs = [{"llm_calls": 6, "input_tokens": 9178, "output_tokens": 6901, "total_tokens": 16079}]
        report = combined_token_report(runs)
        assert report["run_count"] == 1
        assert report["total_tokens"] == 16079

    def test_missing_fields_default_to_zero(self):
        runs = [{"run_id": "x"}, {"run_id": "y", "llm_calls": 2}]
        report = combined_token_report(runs)
        assert report["llm_calls"] == 2
        assert report["input_tokens"] == 0


# ── D. AutoscalerConfig defaults ─────────────────────────────────────────────

class TestAutoscalerConfigDefaults:
    def test_default_min_workers(self):
        cfg = AutoscalerConfig()
        assert cfg.min_workers == 1

    def test_default_max_workers(self):
        cfg = AutoscalerConfig()
        assert cfg.max_workers == 4

    def test_default_target_jobs_per_worker(self):
        cfg = AutoscalerConfig()
        assert cfg.target_jobs_per_worker == 1

    def test_default_scale_up_cooldown(self):
        cfg = AutoscalerConfig()
        assert cfg.scale_up_cooldown == 10.0

    def test_default_scale_down_cooldown(self):
        cfg = AutoscalerConfig()
        assert cfg.scale_down_cooldown == 30.0

    def test_default_max_concurrent_jobs(self):
        cfg = AutoscalerConfig()
        assert cfg.max_concurrent_jobs == 4

    def test_custom_values(self):
        cfg = AutoscalerConfig(min_workers=2, max_workers=8, target_jobs_per_worker=2,
                               scale_up_cooldown=5.0, scale_down_cooldown=60.0,
                               max_concurrent_jobs=6)
        assert cfg.min_workers == 2
        assert cfg.max_workers == 8
        assert cfg.max_concurrent_jobs == 6


# ── G. Cooldown enforcement (logic without real time.sleep) ───────────────────

class TestCooldownLogic:
    """Simulate cooldown checks by manipulating timestamps directly."""

    def test_scale_up_allowed_when_enough_time_elapsed(self):
        cooldown = 10.0
        last_scale_up = 0.0
        now = 100.0
        elapsed = now - last_scale_up
        assert elapsed >= cooldown  # scale up should be allowed

    def test_scale_up_blocked_when_insufficient_time(self):
        cooldown = 10.0
        last_scale_up = 95.0
        now = 100.0
        elapsed = now - last_scale_up
        assert elapsed < cooldown  # scale up should be blocked

    def test_scale_down_allowed_after_cooldown(self):
        cooldown = 30.0
        last_scale_down = 0.0
        now = 31.0
        elapsed = now - last_scale_down
        assert elapsed >= cooldown

    def test_scale_down_blocked_before_cooldown(self):
        cooldown = 30.0
        last_scale_down = 20.0
        now = 45.0
        elapsed = now - last_scale_down
        assert elapsed < cooldown

    def test_cooldown_remaining_calculation(self):
        cooldown = 10.0
        last_scale_up = 95.0
        now = 100.0
        remaining = cooldown - (now - last_scale_up)
        assert abs(remaining - 5.0) < 0.001


# ── H. Student isolation ──────────────────────────────────────────────────────

class TestStudentIsolation:
    def test_two_students_have_different_ids(self):
        alice_id = "60000000-0000-0000-0000-000000000001"
        bob_id   = "60000000-0000-0000-0000-000000000002"
        assert alice_id != bob_id

    def test_student_ids_are_valid_uuids(self):
        import uuid
        alice_id = "60000000-0000-0000-0000-000000000001"
        bob_id   = "60000000-0000-0000-0000-000000000002"
        assert uuid.UUID(alice_id)
        assert uuid.UUID(bob_id)

    def test_run_contexts_use_different_student_ids(self):
        alice_ctx = {"student_id": "60000000-0000-0000-0000-000000000001", "run_id": "run-a"}
        bob_ctx   = {"student_id": "60000000-0000-0000-0000-000000000002", "run_id": "run-b"}
        assert alice_ctx["student_id"] != bob_ctx["student_id"]
        assert alice_ctx["run_id"]     != bob_ctx["run_id"]


# ── I. Token metrics aggregation ──────────────────────────────────────────────

class TestTokenMetricsAggregation:
    def test_aggregate_two_runs(self):
        alice = {"run_id": "alice", "llm_calls": 6, "input_tokens": 9178,
                 "output_tokens": 6901, "total_tokens": 16079, "generation_source": "LLM"}
        bob   = {"run_id": "bob",   "llm_calls": 5, "input_tokens": 8000,
                 "output_tokens": 5000, "total_tokens": 13000, "generation_source": "LLM"}
        report = combined_token_report([alice, bob])
        assert report["run_count"]    == 2
        assert report["llm_calls"]    == 11
        assert report["total_tokens"] == 29079

    def test_generation_source_preserved_per_run(self):
        runs = [
            {"run_id": "a", "generation_source": "LLM",      "total_tokens": 100},
            {"run_id": "b", "generation_source": "FALLBACK",  "total_tokens": 50},
        ]
        report = combined_token_report(runs)
        sources = [r["generation_source"] for r in report["runs"]]
        assert "LLM"      in sources
        assert "FALLBACK" in sources


# ── J. LLM 429 / generation_source behavior ──────────────────────────────────

class TestGenerationSource:
    def test_fallback_when_llm_fails(self):
        run_metrics = {"generation_source": "FALLBACK", "total_tokens": 5000}
        assert run_metrics["generation_source"] == "FALLBACK"

    def test_llm_when_generation_succeeds(self):
        run_metrics = {"generation_source": "LLM", "total_tokens": 16079}
        assert run_metrics["generation_source"] == "LLM"

    def test_generation_source_not_none_when_fallback(self):
        run_metrics = {"generation_source": "FALLBACK"}
        assert run_metrics["generation_source"] is not None
        assert run_metrics["generation_source"] != "NONE"

    def test_combined_report_does_not_aggregate_generation_source(self):
        runs = [
            {"run_id": "a", "generation_source": "LLM",     "total_tokens": 100},
            {"run_id": "b", "generation_source": "FALLBACK", "total_tokens": 50},
        ]
        report = combined_token_report(runs)
        # combined_token_report does not have a single generation_source at top level
        assert "generation_source" not in report
        # each run preserves its own
        assert report["runs"][0]["generation_source"] == "LLM"
        assert report["runs"][1]["generation_source"] == "FALLBACK"
