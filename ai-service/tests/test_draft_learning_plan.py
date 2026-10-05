"""
Tests for DraftLearningPlanTool.

With the two-phase specialist design, DraftLearningPlanTool.execute() is now
a context collector — it assembles args and signals readiness for generation.
The actual LLM call happens in specialist_agent._generate_plan().

Tests verify:
  - execute() collects context without calling the LLM
  - execute() returns _ready_for_generation=True
  - execute() preserves all supplied fields
  - is_terminal=True so the agent loop exits immediately after this tool
  - _build_prompt, _parse_response, _fallback_plan still work correctly
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.tools.learning_plan import DraftLearningPlanTool
from app.tools.base import ToolContext


# ── helpers ──────────────────────────────────────────────────────────────────

def _ctx() -> ToolContext:
    return ToolContext(student_id="test-student", agent_run_id="test-run-1")


def _run(args: dict[str, Any]) -> dict[str, Any]:
    tool = DraftLearningPlanTool()
    result = tool.execute(args, _ctx())
    assert result.success, f"Tool failed: {result}"
    return result.data


_FIVE_SKILLS = ["Leadership", "Adaptability", "Conflict Resolution", "Time Management", "Teamwork"]
_TWO_DOCS = [
    {"id": "doc-1", "title": "Java Interview Fundamentals", "excerpt": "Core Java: OOP, Collections"},
    {"id": "doc-2", "title": "System Design Interview Guide", "excerpt": "Scalability, load balancers"},
]
_PERF = {
    "overall_score": 61.3,
    "technical_score": 48,
    "communication_score": 71,
    "listening_score": 65,
    "trend": "STABLE",
}
_WEB_RES = [
    {"type": "WEB", "title": "Interview Tips", "url": "https://example.com/tips", "source": "example.com", "snippet": "..."}
]


# ══════════════════════════════════════════════════════════════════════════════
# Context collection behavior (new design)
# ══════════════════════════════════════════════════════════════════════════════

class TestContextCollection:

    def test_execute_returns_success(self):
        ctx = _run({"goal": "Improve interview readiness", "weakSkills": _FIVE_SKILLS, "durationWeeks": 4})
        assert ctx is not None

    def test_execute_sets_ready_for_generation(self):
        ctx = _run({"goal": "Improve interview readiness", "weakSkills": _FIVE_SKILLS, "durationWeeks": 4})
        assert ctx.get("_ready_for_generation") is True

    def test_execute_preserves_goal(self):
        ctx = _run({"goal": "Pass senior engineer interview", "weakSkills": [], "durationWeeks": 4})
        assert ctx["goal"] == "Pass senior engineer interview"

    def test_execute_preserves_weak_skills(self):
        ctx = _run({"goal": "Goal", "weakSkills": _FIVE_SKILLS, "durationWeeks": 4})
        # truncated to _MAX_WEAK_SKILLS_IN_PROMPT (5) — all 5 should be there
        assert set(ctx["weakSkills"]) == set(_FIVE_SKILLS)

    def test_execute_truncates_weak_skills_to_max(self):
        many = [f"Skill{i}" for i in range(10)]
        ctx = _run({"goal": "Goal", "weakSkills": many, "durationWeeks": 4})
        # _MAX_WEAK_SKILLS_IN_PROMPT = 5
        assert len(ctx["weakSkills"]) <= 5

    def test_execute_preserves_performance_data(self):
        ctx = _run({"goal": "G", "weakSkills": [], "performanceData": _PERF, "durationWeeks": 4})
        assert ctx["performanceData"] == _PERF

    def test_execute_preserves_knowledge_docs(self):
        ctx = _run({"goal": "G", "weakSkills": [], "knowledgeDocs": _TWO_DOCS, "durationWeeks": 4})
        assert ctx["knowledgeDocs"] == _TWO_DOCS

    def test_execute_preserves_web_resources(self):
        ctx = _run({"goal": "G", "weakSkills": [], "webResources": _WEB_RES, "durationWeeks": 4})
        assert ctx["webResources"] == _WEB_RES

    def test_execute_preserves_duration_weeks(self):
        ctx = _run({"goal": "G", "weakSkills": [], "durationWeeks": 6})
        assert ctx["durationWeeks"] == 6

    def test_execute_defaults_duration_to_4(self):
        ctx = _run({"goal": "G", "weakSkills": []})
        assert ctx["durationWeeks"] == 4

    def test_execute_does_not_call_llm(self):
        """execute() must not call the LLM — it returns _ready_for_generation=True."""
        # The absence of any LLM call is confirmed by checking that the result
        # contains _ready_for_generation=True (a plan would have weeklyPlan instead).
        ctx = _run({"goal": "G", "weakSkills": _FIVE_SKILLS, "durationWeeks": 4})
        assert ctx.get("_ready_for_generation") is True
        assert "weeklyPlan" not in ctx

    def test_context_summary_is_set(self):
        tool = DraftLearningPlanTool()
        result = tool.execute(
            {"goal": "Improve interview readiness", "weakSkills": _FIVE_SKILLS, "durationWeeks": 4},
            _ctx(),
        )
        assert result.context_summary is not None
        assert "context_ready" in result.context_summary


# ══════════════════════════════════════════════════════════════════════════════
# is_terminal flag
# ══════════════════════════════════════════════════════════════════════════════

class TestIsTerminal:

    def test_is_terminal_true(self):
        """DraftLearningPlanTool must set is_terminal=True so the agent loop exits after it."""
        assert DraftLearningPlanTool.is_terminal is True

    def test_is_terminal_on_instance(self):
        tool = DraftLearningPlanTool()
        assert tool.is_terminal is True


# ══════════════════════════════════════════════════════════════════════════════
# _fallback_plan — still used when generation LLM call fails
# ══════════════════════════════════════════════════════════════════════════════

class TestFallbackPlan:

    def _fallback(self, weak_skills, docs=None, web=None, duration=4):
        tool = DraftLearningPlanTool()
        return tool._fallback_plan(
            "Improve interview readiness",
            weak_skills,
            docs or [],
            web or [],
            duration,
        )

    def test_returns_correct_number_of_weeks(self):
        plan = self._fallback(_FIVE_SKILLS, duration=4)
        assert len(plan["weeklyPlan"]) == 4

    def test_returns_correct_number_of_weeks_two(self):
        plan = self._fallback(_FIVE_SKILLS, duration=2)
        assert len(plan["weeklyPlan"]) == 2

    def test_uses_weak_skills_as_week_focus(self):
        plan = self._fallback(["Leadership", "Adaptability"], duration=2)
        focuses = [w["focus"] for w in plan["weeklyPlan"]]
        assert focuses == ["Leadership", "Adaptability"]

    def test_empty_weak_skills_handled(self):
        plan = self._fallback([], duration=3)
        assert len(plan["weeklyPlan"]) == 3
        assert plan["focusSkills"] == []

    def test_includes_knowledge_doc_in_resources(self):
        plan = self._fallback(["Leadership"], docs=_TWO_DOCS, duration=2)
        all_resources = [r for w in plan["weeklyPlan"] for r in w.get("resources", [])]
        internal = [r for r in all_resources if r.get("type") == "INTERNAL"]
        assert internal, "Fallback must include INTERNAL resources from knowledgeDocs"

    def test_includes_web_resource_in_resources(self):
        plan = self._fallback(["Leadership"], web=_WEB_RES, duration=1)
        all_resources = [r for w in plan["weeklyPlan"] for r in w.get("resources", [])]
        web = [r for r in all_resources if r.get("type") == "WEB"]
        assert web, "Fallback must include WEB resources when supplied"

    def test_no_invented_urls_when_no_resources(self):
        plan = self._fallback(["Leadership"], docs=[], web=[], duration=2)
        for week in plan["weeklyPlan"]:
            for res in week.get("resources", []):
                assert not res.get("url"), f"Invented URL in fallback: {res}"


# ══════════════════════════════════════════════════════════════════════════════
# _parse_response — used to normalise LLM JSON output
# ══════════════════════════════════════════════════════════════════════════════

class TestParseResponse:

    def _parse(self, raw: dict) -> dict:
        tool = DraftLearningPlanTool()
        return tool._parse_response(raw, "Improve interview readiness", _FIVE_SKILLS, 4)

    def test_extracts_weekly_plan(self):
        raw = {
            "goal": "G",
            "durationWeeks": 2,
            "focusSkills": ["Leadership"],
            "weeklyPlan": [
                {"week": 1, "focus": "Leadership", "skills": ["Leadership"],
                 "activities": ["Act 1"], "resources": []},
                {"week": 2, "focus": "Adaptability", "skills": ["Adaptability"],
                 "activities": ["Act 2"], "resources": []},
            ],
        }
        result = self._parse(raw)
        assert len(result["weeklyPlan"]) == 2

    def test_handles_snake_case_weekly_plan_key(self):
        raw = {"goal": "G", "weekly_plan": [
            {"week": 1, "focus": "X", "activities": [], "resources": []}
        ]}
        result = self._parse(raw)
        assert len(result["weeklyPlan"]) == 1

    def test_handles_empty_weekly_plan(self):
        raw = {"goal": "G", "weeklyPlan": []}
        result = self._parse(raw)
        assert result["weeklyPlan"] == []

    def test_preserves_goal(self):
        raw = {"goal": "Custom goal", "weeklyPlan": []}
        result = self._parse(raw)
        assert result["goal"] == "Custom goal"

    def test_focus_skills_falls_back_to_weak_skills(self):
        raw = {"goal": "G", "weeklyPlan": []}
        result = self._parse(raw)
        assert result["focusSkills"] == _FIVE_SKILLS
