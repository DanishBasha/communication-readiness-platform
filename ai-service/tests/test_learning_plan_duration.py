"""
Unit tests for the fixed 4-week learning plan duration enforcement.

Tests cover:
  - _validate_learning_plan: all success and failure modes
  - DraftLearningPlanTool._build_correction_prompt: contains critical notice
  - _generate_plan: regeneration loop logic via mocked LLM
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch, call

import pytest

from app.config import LEARNING_PLAN_DURATION_WEEKS
from app.agents.specialist_agent import _validate_learning_plan
from app.tools.learning_plan import DraftLearningPlanTool
from app.agents.state import AgentMetrics


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_valid_plan(n_weeks: int = 4, duration_weeks: int | None = None) -> dict:
    if duration_weeks is None:
        duration_weeks = n_weeks
    return {
        "goal": "Test goal",
        "durationWeeks": duration_weeks,
        "focusSkills": ["Skill A"],
        "weeklyPlan": [
            {
                "week": i,
                "objective": f"Week {i} objective",
                "focus": "Skill A",
                "skills": ["Skill A"],
                "whyThisSkill": "reason",
                "activities": ["activity"],
                "practiceExercises": ["exercise"],
                "applicationTask": "task",
                "resources": [],
                "measurableOutcome": "outcome",
                "estimatedHours": 5,
                "progressCheck": "check",
            }
            for i in range(1, n_weeks + 1)
        ],
    }


def _make_metrics() -> AgentMetrics:
    return AgentMetrics()


# ── _validate_learning_plan ───────────────────────────────────────────────────

class TestValidateLearningPlan:

    def test_valid_4_week_plan_passes(self):
        plan = _make_valid_plan(4)
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is True
        assert reason == ""

    def test_8_week_plan_fails(self):
        plan = _make_valid_plan(8, duration_weeks=8)
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is False
        assert "8" in reason

    def test_6_week_plan_fails(self):
        plan = _make_valid_plan(6, duration_weeks=6)
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is False
        assert "6" in reason

    def test_missing_weekly_plan_fails(self):
        ok, reason = _validate_learning_plan({"goal": "test"}, 4)
        assert ok is False

    def test_duration_weeks_field_mismatch_fails(self):
        # weeklyPlan has 4 weeks but durationWeeks field says 8
        plan = _make_valid_plan(4, duration_weeks=8)
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is False
        assert "durationWeeks" in reason

    def test_non_sequential_week_numbers_fail(self):
        plan = _make_valid_plan(4)
        plan["weeklyPlan"][2]["week"] = 99  # break sequential order
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is False
        assert "sequential" in reason.lower() or "week number" in reason.lower()

    def test_3_week_plan_fails(self):
        plan = _make_valid_plan(3, duration_weeks=3)
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is False
        assert "3" in reason

    def test_duration_weeks_field_none_passes_count_check(self):
        """durationWeeks=None in plan should not block a valid 4-week weeklyPlan."""
        plan = _make_valid_plan(4)
        plan["durationWeeks"] = None
        ok, reason = _validate_learning_plan(plan, 4)
        assert ok is True


# ── DraftLearningPlanTool._build_correction_prompt ───────────────────────────

class TestBuildCorrectionPrompt:
    tool = DraftLearningPlanTool()

    def test_correction_prompt_contains_violation_count(self):
        prompt = self.tool._build_correction_prompt(
            student_id="s1",
            goal="Test goal",
            weak_skills=["Skill A", "Skill B"],
            performance_data={},
            knowledge_docs=[],
            web_resources=[],
            duration_weeks=4,
            previous_week_count=8,
        )
        assert "8" in prompt
        assert "CRITICAL CORRECTION" in prompt or "critical" in prompt.lower()

    def test_correction_prompt_states_required_weeks(self):
        prompt = self.tool._build_correction_prompt(
            student_id="s1",
            goal="Test goal",
            weak_skills=[],
            performance_data={},
            knowledge_docs=[],
            web_resources=[],
            duration_weeks=4,
            previous_week_count=6,
        )
        assert "4" in prompt

    def test_correction_prompt_includes_base_prompt_content(self):
        """Correction prompt should extend (not replace) the base prompt."""
        base = self.tool._build_prompt(
            "s1", "Test goal", [], {}, [], [], 4,
        )
        correction = self.tool._build_correction_prompt(
            "s1", "Test goal", [], {}, [], [], 4, previous_week_count=6,
        )
        # Correction prompt must contain the base prompt's core instructions
        assert len(correction) > len(base)
        assert "GENERATE" in correction


# ── LEARNING_PLAN_DURATION_WEEKS constant ────────────────────────────────────

class TestDurationConstant:

    def test_constant_is_4(self):
        assert LEARNING_PLAN_DURATION_WEEKS == 4

    def test_constant_is_int(self):
        assert isinstance(LEARNING_PLAN_DURATION_WEEKS, int)


# ── _generate_plan regeneration loop ─────────────────────────────────────────

class TestGeneratePlanRegenerationLoop:
    """
    Test _generate_plan with a mocked LLM.
    The mock is injected at app.agents.specialist_agent.get_llm_client.
    """

    def _mock_llm(self, raw_responses: list[dict]) -> MagicMock:
        """Build a fake LLM client that returns successive raw_responses."""
        call_iter = iter(raw_responses)
        mock_provider = MagicMock()
        mock_provider._last_usage = {"input": 100, "output": 200, "total": 300}
        mock_llm = MagicMock()
        mock_llm._provider = mock_provider
        mock_llm._call_json.side_effect = lambda *a, **kw: next(call_iter)
        return mock_llm

    def _draft_ctx(self) -> dict:
        return {
            "goal": "Test goal",
            "weakSkills": [{"name": "Skill A", "avg_score": 40}],
            "performanceData": {},
            "knowledgeDocs": [],
            "webResources": [],
            "durationWeeks": 8,  # LLM tried to pass 8 — must be ignored
        }

    @patch("app.agents.specialist_agent.get_llm_client")
    def test_valid_4week_plan_returned_on_first_attempt(self, mock_get_llm):
        mock_get_llm.return_value = self._mock_llm([_make_valid_plan(4)])
        from app.agents.specialist_agent import _generate_plan
        result = _generate_plan(self._draft_ctx(), "s1", "run1", _make_metrics())
        assert result is not None
        assert len(result["weeklyPlan"]) == 4
        assert result["durationWeeks"] == 4
        assert result["generation_source"] == "LLM"

    @patch("app.agents.specialist_agent.get_llm_client")
    def test_8week_plan_triggers_regeneration(self, mock_get_llm):
        """First LLM call returns 8 weeks; second returns valid 4 weeks."""
        mock_get_llm.return_value = self._mock_llm([
            _make_valid_plan(8, duration_weeks=8),  # attempt 1: invalid
            _make_valid_plan(4),                    # attempt 2: valid
        ])
        from app.agents.specialist_agent import _generate_plan
        result = _generate_plan(self._draft_ctx(), "s1", "run1", _make_metrics())
        assert result is not None
        assert len(result["weeklyPlan"]) == 4
        assert result["generation_source"] == "LLM"

    @patch("app.agents.specialist_agent.get_llm_client")
    def test_all_attempts_fail_returns_none(self, mock_get_llm):
        """Both LLM calls return 8 weeks → _generate_plan must return None."""
        mock_get_llm.return_value = self._mock_llm([
            _make_valid_plan(8, duration_weeks=8),  # attempt 1: invalid
            _make_valid_plan(8, duration_weeks=8),  # attempt 2: invalid
        ])
        from app.agents.specialist_agent import _generate_plan
        result = _generate_plan(self._draft_ctx(), "s1", "run1", _make_metrics())
        assert result is None

    @patch("app.agents.specialist_agent.get_llm_client")
    def test_draft_ctx_duration_weeks_ignored(self, mock_get_llm):
        """draft_ctx durationWeeks=8 must be ignored; plan must be 4 weeks."""
        mock_get_llm.return_value = self._mock_llm([_make_valid_plan(4)])
        from app.agents.specialist_agent import _generate_plan
        ctx = self._draft_ctx()
        ctx["durationWeeks"] = 8
        result = _generate_plan(ctx, "s1", "run1", _make_metrics())
        assert result is not None
        assert len(result["weeklyPlan"]) == 4

    @patch("app.agents.specialist_agent.get_llm_client")
    def test_llm_exception_falls_back_not_none(self, mock_get_llm):
        """LLM exception on attempt 1 → FALLBACK plan returned (not None)."""
        mock_llm = MagicMock()
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}
        mock_llm._call_json.side_effect = RuntimeError("Groq timeout")
        mock_get_llm.return_value = mock_llm
        from app.agents.specialist_agent import _generate_plan
        result = _generate_plan(self._draft_ctx(), "s1", "run1", _make_metrics())
        # On exception the fallback plan is returned, not None
        assert result is not None
        assert result["generation_source"] == "FALLBACK"
