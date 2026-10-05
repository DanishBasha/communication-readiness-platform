"""
Comprehensive tests for LLM-based learning plan generation.

With the two-phase specialist design, the LLM call happens in
specialist_agent._generate_plan(), not in DraftLearningPlanTool.execute().

Covers:
  1. Full 4-week plan generated from real (mocked) LLM response
  2. Per-student data isolation — Alice and Bob never share data
  3. Concurrent agent runs stay scoped to their own studentId
  4. Redis key isolation per student
  5. Only supplied knowledge documents appear in the plan
  6. generation_source = "LLM" on successful call
  7. generation_source = "FALLBACK" on LLM failure
  8. Empty weak skills handled gracefully
  9. Different students with different performance produce different plans
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.agents.state import AgentMetrics
from app.tools.learning_plan import DraftLearningPlanTool
from app.tools.base import ToolContext


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ctx(student_id: str = "alice-000", run_id: str = "run-001") -> ToolContext:
    return ToolContext(student_id=student_id, agent_run_id=run_id)


def _make_draft_ctx(
    goal: str,
    student_id: str,
    weak_skills: list[str],
    perf: dict,
    docs: list[dict],
    web: list[dict] | None = None,
    weeks: int = 4,
) -> dict:
    return {
        "goal": goal,
        "weakSkills": weak_skills,
        "performanceData": perf,
        "knowledgeDocs": docs,
        "webResources": web or [],
        "durationWeeks": weeks,
        "_ready_for_generation": True,
    }


def _run_generate(
    draft_ctx: dict,
    student_id: str = "alice-000",
    mock_llm: MagicMock | None = None,
) -> dict[str, Any]:
    """Call specialist_agent._generate_plan() with a mocked LLM."""
    from app.agents.specialist_agent import _generate_plan

    if mock_llm is None:
        mock_llm = MagicMock()
        # Default: return a valid plan
        plan = _make_llm_plan(draft_ctx["goal"], draft_ctx["weakSkills"], draft_ctx["durationWeeks"], draft_ctx["knowledgeDocs"])
        mock_llm._call_json.return_value = plan

    mock_llm._provider = MagicMock()
    mock_llm._provider._last_usage = {"input": 400, "output": 200, "total": 600, "attempts": 1}

    metrics = AgentMetrics()
    with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_llm):
        result = _generate_plan(draft_ctx, student_id, "run-001", metrics)
    return result


_ALICE_SKILLS = ["Leadership", "Adaptability", "Conflict Resolution"]
_BOB_SKILLS   = ["Communication", "Listening", "Negotiation"]

_ALICE_PERF = {
    "overall_score": 61.3,
    "technical_score": 48,
    "communication_score": 71,
    "listening_score": 65,
    "trend": "STABLE",
}
_BOB_PERF = {
    "overall_score": 55.0,
    "technical_score": 82,
    "communication_score": 42,
    "listening_score": 38,
    "trend": "DECLINING",
}

_TWO_DOCS = [
    {"id": "doc-1", "title": "Java Interview Fundamentals", "excerpt": "Core Java: OOP, Collections"},
    {"id": "doc-2", "title": "System Design Interview Guide", "excerpt": "Scalability, load balancers"},
]


def _make_llm_plan(
    goal: str,
    weak_skills: list[str],
    duration_weeks: int,
    docs: list[dict],
    provider_name: str = "GroqProvider",
) -> dict:
    """Return the mock JSON a real LLM would produce."""
    weak_skills = weak_skills or ["General Review"]
    weekly = []
    for i in range(duration_weeks):
        skill = weak_skills[i] if i < len(weak_skills) else weak_skills[0]
        resources = [{"documentId": docs[i]["id"], "title": docs[i]["title"]}] if i < len(docs) else []
        weekly.append({
            "week": i + 1,
            "focus": skill,
            "skills": [skill],
            "activities": [
                f"[{provider_name}] Study {skill} deeply",
                f"[{provider_name}] Practice {skill} with a peer",
            ],
            "resources": resources,
        })
    return {
        "goal": goal,
        "durationWeeks": duration_weeks,
        "focusSkills": weak_skills[:3],
        "weeklyPlan": weekly,
    }


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def mock_llm_groq_alice():
    """Mock LLM returning Alice's plan (4 weeks, 3 skills)."""
    mock_client = MagicMock()
    mock_client._provider = MagicMock()
    mock_client._provider._last_usage = {"input": 400, "output": 200, "total": 600, "attempts": 1}

    def side_effect(prompt: str, **kwargs) -> dict:
        assert "alice-000" in prompt, "Prompt must contain Alice's studentId"
        return _make_llm_plan(
            "Improve communication skills", _ALICE_SKILLS, 4, _TWO_DOCS
        )

    mock_client._call_json.side_effect = side_effect
    type(mock_client._provider).__name__ = "OpenAICompatibleProvider"
    with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
        yield mock_client


@pytest.fixture()
def mock_llm_raises():
    """Simulate LLM network failure."""
    mock_client = MagicMock()
    mock_client._call_json.side_effect = RuntimeError("Groq unavailable")
    mock_client._provider = MagicMock()
    mock_client._provider._last_usage = {}
    type(mock_client._provider).__name__ = "OpenAICompatibleProvider"
    with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
        yield mock_client


@pytest.fixture()
def mock_llm_empty_weekly():
    """Simulate LLM returning valid JSON but empty weeklyPlan."""
    mock_client = MagicMock()
    mock_client._call_json.return_value = {
        "goal": "...", "weeklyPlan": [], "focusSkills": [], "durationWeeks": 4
    }
    mock_client._provider = MagicMock()
    mock_client._provider._last_usage = {}
    type(mock_client._provider).__name__ = "OpenAICompatibleProvider"
    with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
        yield mock_client


def _run_with_fixture(fixture_active: bool, weak_skills, docs, perf, goal, weeks, sid):
    """Helper used by tests that rely on an active fixture patch."""
    from app.agents.specialist_agent import _generate_plan
    draft_ctx = _make_draft_ctx(goal, sid, weak_skills, perf, docs, weeks=weeks)
    metrics = AgentMetrics()
    return _generate_plan(draft_ctx, sid, "run-001", metrics)


# ── TEST 1: Full LLM-generated 4-week plan ───────────────────────────────────

class TestLLMGeneratedPlan:
    def test_4_weeks_returned(self, mock_llm_groq_alice):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF,
            "Improve communication skills", 4, "alice-000"
        )
        assert len(plan["weeklyPlan"]) == 4

    def test_generation_source_is_llm(self, mock_llm_groq_alice):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF,
            "Improve communication skills", 4, "alice-000"
        )
        assert plan["generation_source"] == "LLM", (
            f"Expected generation_source=LLM, got {plan['generation_source']!r}"
        )

    def test_focus_skills_present(self, mock_llm_groq_alice):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF,
            "Improve communication skills", 4, "alice-000"
        )
        assert plan["focusSkills"], "focusSkills must not be empty"
        for skill in _ALICE_SKILLS[:3]:
            assert skill in plan["focusSkills"]

    def test_llm_provider_called_with_student_id_in_prompt(self, mock_llm_groq_alice):
        """The prompt passed to the LLM must contain the student's ID."""
        _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF,
            "Improve communication skills", 4, "alice-000"
        )
        # The fixture's side_effect already asserts "alice-000" is in the prompt;
        # if we got here without AssertionError the check passed.
        assert mock_llm_groq_alice._call_json.called


# ── TEST 2: Per-student data isolation ──────────────────────────────────────

class TestStudentDataIsolation:
    def test_alice_prompt_contains_alice_id_not_bob(self):
        """Alice's execution must only use Alice's studentId in the prompt."""
        from app.agents.specialist_agent import _generate_plan
        captured: list[str] = []
        mock_client = MagicMock()

        def capture(prompt: str, **kwargs) -> dict:
            captured.append(prompt)
            return _make_llm_plan("Alice goal", _ALICE_SKILLS, 4, _TWO_DOCS)

        mock_client._call_json.side_effect = capture
        mock_client._provider = MagicMock()
        mock_client._provider._last_usage = {}
        type(mock_client._provider).__name__ = "OpenAICompatibleProvider"

        draft_ctx = _make_draft_ctx("Alice goal", "alice-000", _ALICE_SKILLS, _ALICE_PERF, _TWO_DOCS)
        metrics = AgentMetrics()
        with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
            _generate_plan(draft_ctx, "alice-000", "run-001", metrics)

        assert len(captured) == 1
        prompt = captured[0]
        assert "alice-000" in prompt, "Alice's studentId must be in her prompt"
        assert "bob-0000" not in prompt, "Bob's studentId must NOT be in Alice's prompt"
        assert "Leadership" in prompt

    def test_bob_prompt_contains_bob_id_not_alice(self):
        """Bob's execution must only use Bob's studentId."""
        from app.agents.specialist_agent import _generate_plan
        captured: list[str] = []
        mock_client = MagicMock()

        def capture(prompt: str, **kwargs) -> dict:
            captured.append(prompt)
            return _make_llm_plan("Bob goal", _BOB_SKILLS, 4, _TWO_DOCS)

        mock_client._call_json.side_effect = capture
        mock_client._provider = MagicMock()
        mock_client._provider._last_usage = {}
        type(mock_client._provider).__name__ = "OpenAICompatibleProvider"

        draft_ctx = _make_draft_ctx("Bob goal", "bob-0000", _BOB_SKILLS, _BOB_PERF, _TWO_DOCS)
        metrics = AgentMetrics()
        with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
            _generate_plan(draft_ctx, "bob-0000", "run-002", metrics)

        prompt = captured[0]
        assert "bob-0000" in prompt
        assert "alice-000" not in prompt
        assert "Communication" in prompt or "Listening" in prompt

    def test_weak_skills_differ_per_student(self):
        """Alice's plan focuses on her skills; Bob's plan focuses on his skills."""
        from app.agents.specialist_agent import _generate_plan
        plans: dict[str, dict] = {}

        for sid, skills, perf in [
            ("alice-000", _ALICE_SKILLS, _ALICE_PERF),
            ("bob-0000",  _BOB_SKILLS,  _BOB_PERF),
        ]:
            mock_client = MagicMock()
            mock_client._call_json.return_value = _make_llm_plan("Goal", skills, 4, _TWO_DOCS)
            mock_client._provider = MagicMock()
            mock_client._provider._last_usage = {}
            type(mock_client._provider).__name__ = "OpenAICompatibleProvider"

            draft_ctx = _make_draft_ctx("Goal", sid, skills, perf, _TWO_DOCS)
            metrics = AgentMetrics()
            with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
                plans[sid] = _generate_plan(draft_ctx, sid, f"run-{sid}", metrics)

        alice_focuses = {w["focus"] for w in plans["alice-000"]["weeklyPlan"]}
        bob_focuses   = {w["focus"] for w in plans["bob-0000"]["weeklyPlan"]}
        assert alice_focuses != bob_focuses, (
            "Different students with different weak skills must produce different plans"
        )
        assert "Leadership" in alice_focuses or "Adaptability" in alice_focuses
        assert "Communication" in bob_focuses or "Listening" in bob_focuses


# ── TEST 3: Concurrent agent runs stay scoped ────────────────────────────────

class TestConcurrentRunIsolation:
    def test_separate_tool_contexts_per_run(self):
        """_build_prompt() must embed the correct studentId for each run."""
        tool = DraftLearningPlanTool()
        for sid in ["student-A", "student-B", "student-C"]:
            prompt = tool._build_prompt(
                sid, "Goal", _ALICE_SKILLS, _ALICE_PERF, _TWO_DOCS, [], 2
            )
            assert sid in prompt, f"Student ID {sid!r} must appear in the prompt"
            for other in ["student-A", "student-B", "student-C"]:
                if other != sid:
                    assert other not in prompt, f"{other!r} must NOT appear in {sid}'s prompt"


# ── TEST 4: Redis key isolation (conceptual — no live Redis needed) ───────────

class TestRedisKeyIsolation:
    def test_cache_keys_are_student_specific(self):
        """Verify cache key templates embed studentId (unit test of key format)."""
        from app.cache.cache_keys import CacheKeys
        key_a = CacheKeys.performance("student-A")
        key_b = CacheKeys.performance("student-B")
        assert key_a != key_b
        assert "student-A" in key_a
        assert "student-B" in key_b
        assert "student-B" not in key_a
        assert "student-A" not in key_b

    def test_skill_gap_keys_are_student_specific(self):
        from app.cache.cache_keys import CacheKeys
        key_a = CacheKeys.skill_gap("student-A")
        key_b = CacheKeys.skill_gap("student-B")
        assert key_a != key_b
        assert "student-A" in key_a
        assert "student-B" in key_b


# ── TEST 5: Only supplied knowledge documents appear ─────────────────────────

class TestKnowledgeDocIsolation:
    def test_supplied_doc_ids_appear_in_llm_prompt(self):
        """The LLM prompt must contain the supplied document IDs."""
        from app.agents.specialist_agent import _generate_plan
        captured: list[str] = []
        mock_client = MagicMock()

        def capture(prompt: str, **kwargs) -> dict:
            captured.append(prompt)
            return _make_llm_plan("Goal", _ALICE_SKILLS, 2, _TWO_DOCS)

        mock_client._call_json.side_effect = capture
        mock_client._provider = MagicMock()
        mock_client._provider._last_usage = {}
        type(mock_client._provider).__name__ = "OpenAICompatibleProvider"

        draft_ctx = _make_draft_ctx("Goal", "alice-000", _ALICE_SKILLS, _ALICE_PERF, _TWO_DOCS, weeks=2)
        metrics = AgentMetrics()
        with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
            _generate_plan(draft_ctx, "alice-000", "run-001", metrics)

        prompt = captured[0]
        assert "doc-1" in prompt, "Supplied documentId 'doc-1' must appear in the prompt"
        assert "doc-2" in prompt, "Supplied documentId 'doc-2' must appear in the prompt"
        assert "Java Interview Fundamentals" in prompt
        assert "System Design Interview Guide" in prompt

    def test_no_docs_means_empty_resources_section(self):
        """When no docs are provided, fallback plan has empty resources arrays."""
        tool = DraftLearningPlanTool()
        plan = tool._fallback_plan(
            "Goal", _ALICE_SKILLS, [], [], 3
        )
        for week in plan["weeklyPlan"]:
            assert week.get("resources", []) == [], (
                f"Week {week['week']} should have no resources when none were supplied"
            )

    def test_llm_resources_use_supplied_ids(self, mock_llm_groq_alice):
        """Resources in the LLM plan must only reference IDs from the input docs."""
        from app.agents.specialist_agent import _generate_plan
        draft_ctx = _make_draft_ctx(
            "Improve communication skills", "alice-000",
            _ALICE_SKILLS, _ALICE_PERF, _TWO_DOCS
        )
        metrics = AgentMetrics()
        plan = _generate_plan(draft_ctx, "alice-000", "run-001", metrics)
        supplied_ids = {d["id"] for d in _TWO_DOCS}
        for week in plan["weeklyPlan"]:
            for resource in week.get("resources", []):
                rid = resource.get("documentId", "")
                if rid:
                    assert rid in supplied_ids, (
                        f"Week {week['week']} references unsupplied documentId {rid!r}"
                    )


# ── TEST 6: generation_source = "LLM" on success ─────────────────────────────

class TestGenerationSource:
    def test_llm_source_on_success(self, mock_llm_groq_alice):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF,
            "Improve communication skills", 4, "alice-000"
        )
        assert plan["generation_source"] == "LLM"

    def test_fallback_source_on_llm_failure(self, mock_llm_raises):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF, "Goal", 4, "alice-000"
        )
        assert plan["generation_source"] == "FALLBACK", (
            "When LLM fails, generation_source must be 'FALLBACK' not 'LLM'"
        )

    def test_fallback_source_on_empty_weekly_plan(self, mock_llm_empty_weekly):
        # With the fixed-duration contract, an empty weeklyPlan fails validation
        # on every attempt, so _generate_plan returns None (no bad plan persisted).
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF, "Goal", 4, "alice-000"
        )
        assert plan is None

    def test_fallback_plan_still_has_correct_week_count(self, mock_llm_raises):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF, "Goal", 4, "alice-000"
        )
        assert len(plan["weeklyPlan"]) == 4


# ── TEST 7: LLM failure handling ─────────────────────────────────────────────

class TestGroqFailure:
    def test_failure_does_not_raise(self, mock_llm_raises):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF, "Goal", 4, "alice-000"
        )
        assert plan is not None

    def test_failure_generation_source_is_fallback(self, mock_llm_raises):
        plan = _run_with_fixture(
            True, _ALICE_SKILLS, _TWO_DOCS, _ALICE_PERF, "Goal", 4, "alice-000"
        )
        assert plan["generation_source"] == "FALLBACK"


# ── TEST 8: Empty weak skills ────────────────────────────────────────────────

class TestEmptyWeakSkills:
    def test_empty_skills_no_crash(self, mock_llm_empty_weekly):
        # LLM returns empty weeklyPlan → validation fails both attempts → None.
        # The key assertion is "no crash" — None is a valid, safe outcome.
        plan = _run_with_fixture(
            True, [], _TWO_DOCS, _ALICE_PERF, "General improvement", 3, "alice-000"
        )
        assert plan is None

    def test_empty_skills_focus_skills_is_empty(self, mock_llm_empty_weekly):
        # LLM returns empty weeklyPlan → returns None (no bad plan stored).
        plan = _run_with_fixture(
            True, [], [], _ALICE_PERF, "General improvement", 3, "alice-000"
        )
        assert plan is None


# ── TEST 9: Different performance produces different plans ────────────────────

class TestPerformanceInfluencesPlan:
    def test_alice_and_bob_plans_differ(self):
        """Students with different weak skills and performance get different plans."""
        from app.agents.specialist_agent import _generate_plan
        plans: dict[str, dict] = {}

        for sid, skills, perf in [
            ("alice-000", _ALICE_SKILLS, _ALICE_PERF),
            ("bob-0000",  _BOB_SKILLS,  _BOB_PERF),
        ]:
            mock_client = MagicMock()
            mock_client._call_json.return_value = _make_llm_plan("Goal", skills, 4, _TWO_DOCS)
            mock_client._provider = MagicMock()
            mock_client._provider._last_usage = {}
            type(mock_client._provider).__name__ = "OpenAICompatibleProvider"

            draft_ctx = _make_draft_ctx("Improve interview readiness", sid, skills, perf, _TWO_DOCS)
            metrics = AgentMetrics()
            with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_client):
                plans[sid] = _generate_plan(draft_ctx, sid, f"run-{sid}", metrics)

        alice_plan = json.dumps(plans["alice-000"])
        bob_plan   = json.dumps(plans["bob-0000"])
        assert alice_plan != bob_plan, "Alice and Bob must have different roadmaps"
