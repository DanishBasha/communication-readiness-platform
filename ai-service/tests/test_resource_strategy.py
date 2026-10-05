"""
test_resource_strategy.py

Verifies the post-loop resource relevance check in specialist_agent.py.

The system must distinguish:
  Case 1 — Relevant internal content exists:
      Internal docs + external resources are both available to the LLM.
  Case 2 — No relevant internal content:
      Unrelated internal docs are NOT passed to the LLM.
      SearchWebResources is triggered at the application level if the LLM skipped it.

Test cases:
  A. _is_knowledge_relevant returns True when doc title matches skill name.
  B. _is_knowledge_relevant returns False when docs are completely unrelated.
  C. _is_knowledge_relevant returns False for empty doc list.
  D. _is_knowledge_relevant returns False for empty skill list.
  E. _is_knowledge_relevant uses chunk_text / excerpt / content fields.
  F. Short words (≤3 chars) are NOT used as keywords (avoids false positives).
  G. post-loop: irrelevant internal docs are cleared before plan generation.
  H. post-loop: relevant internal docs are kept in plan context.
  I. post-loop: web search fires when internal docs are irrelevant and LLM skipped it.
  J. post-loop: no web search when LLM already called SearchWebResources.
  K. post-loop: no web search when internal docs ARE relevant.
  L. final_answer before DraftLearningPlan does NOT succeed (integration with guard).
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch, call

import pytest

from app.agents.specialist_agent import _is_knowledge_relevant, _format_weak_skills


# ══════════════════════════════════════════════════════════════════════════════
# Fixtures
# ══════════════════════════════════════════════════════════════════════════════

JAVA_DOC = {
    "id": "doc-java",
    "title": "Java Programming Fundamentals",
    "chunk_text": "Learn Java data structures and algorithms for technical interviews.",
}

SYSTEM_DESIGN_DOC = {
    "id": "doc-sd",
    "title": "System Design Interview Preparation",
    "chunk_text": "Covers scalability, databases, and distributed systems.",
}

LEADERSHIP_DOC = {
    "id": "doc-lead",
    "title": "Leadership and Team Management",
    "chunk_text": "Developing leadership skills for workplace and interviews.",
}

LEADERSHIP_SKILL = {"skill_id": "s1", "name": "Leadership", "category": "BEHAVIORAL", "avg_score": 38.0}
ADAPTABILITY_SKILL = {"skill_id": "s2", "name": "Adaptability", "category": "BEHAVIORAL", "avg_score": 45.0}
CONFLICT_SKILL = {"skill_id": "s3", "name": "Conflict Resolution", "category": "BEHAVIORAL", "avg_score": 52.0}
TIME_MGMT_SKILL = {"skill_id": "s4", "name": "Time Management", "category": "BEHAVIORAL", "avg_score": 55.0}
TEAMWORK_SKILL = {"skill_id": "s5", "name": "Teamwork", "category": "BEHAVIORAL", "avg_score": 67.0}

ALICE_SKILLS = [LEADERSHIP_SKILL, ADAPTABILITY_SKILL, CONFLICT_SKILL, TIME_MGMT_SKILL, TEAMWORK_SKILL]


# ══════════════════════════════════════════════════════════════════════════════
# A–F: _is_knowledge_relevant unit tests
# ══════════════════════════════════════════════════════════════════════════════

class TestIsKnowledgeRelevant:

    def test_title_match_returns_true(self):
        """Doc title containing skill keyword → relevant."""
        result = _is_knowledge_relevant([LEADERSHIP_DOC], [LEADERSHIP_SKILL])
        assert result is True

    def test_chunk_text_match_returns_true(self):
        """Doc chunk_text containing skill keyword → relevant."""
        doc = {
            "id": "doc-x",
            "title": "General Study Guide",
            "chunk_text": "Covers leadership principles and management techniques.",
        }
        result = _is_knowledge_relevant([doc], [LEADERSHIP_SKILL])
        assert result is True

    def test_unrelated_doc_returns_false(self):
        """Docs about Java/System Design are NOT relevant for Leadership skills."""
        result = _is_knowledge_relevant(
            [JAVA_DOC, SYSTEM_DESIGN_DOC], ALICE_SKILLS
        )
        assert result is False

    def test_empty_doc_list_returns_false(self):
        result = _is_knowledge_relevant([], ALICE_SKILLS)
        assert result is False

    def test_empty_skill_list_returns_false(self):
        result = _is_knowledge_relevant([LEADERSHIP_DOC], [])
        assert result is False

    def test_excerpt_field_matched(self):
        """excerpt field is also searched for skill keywords."""
        doc = {
            "id": "doc-y",
            "title": "Interview Tips",
            "excerpt": "Improving teamwork and collaboration in professional settings.",
        }
        result = _is_knowledge_relevant([doc], [TEAMWORK_SKILL])
        assert result is True

    def test_content_field_matched(self):
        """content field (alternative name) is also searched."""
        doc = {
            "id": "doc-z",
            "title": "Study Notes",
            "content": "Adaptability training for rapidly changing environments.",
        }
        result = _is_knowledge_relevant([doc], [ADAPTABILITY_SKILL])
        assert result is True

    def test_short_words_not_used_as_keywords(self):
        """Skills like 'SQL' (3 chars) should not be used as keywords."""
        doc = {"id": "d", "title": "No relevance here", "chunk_text": "nothing"}
        # Use a skill with a very short name to ensure short-word filtering
        short_skill = {"name": "SQL", "avg_score": 30.0}
        # SQL has 3 chars → filtered → no keywords → False
        result = _is_knowledge_relevant([doc], [short_skill])
        assert result is False

    def test_string_skill_names_supported(self):
        """Skills passed as plain strings (not dicts) are matched correctly."""
        result = _is_knowledge_relevant([LEADERSHIP_DOC], ["Leadership"])
        assert result is True

    def test_partial_word_overlap(self):
        """'conflict' in doc text should match 'Conflict Resolution' skill."""
        doc = {
            "id": "d-conflict",
            "title": "Conflict Management Strategies",
            "chunk_text": "",
        }
        result = _is_knowledge_relevant([doc], [CONFLICT_SKILL])
        assert result is True

    def test_multiple_docs_any_match_returns_true(self):
        """True if ANY doc is relevant — not all of them need to be."""
        result = _is_knowledge_relevant(
            [JAVA_DOC, SYSTEM_DESIGN_DOC, LEADERSHIP_DOC], [LEADERSHIP_SKILL]
        )
        assert result is True


# ══════════════════════════════════════════════════════════════════════════════
# G–L: post-loop specialist agent behaviour
# ══════════════════════════════════════════════════════════════════════════════

def _make_loop_result(tool_results: dict) -> MagicMock:
    """Create a fake AgentLoopResult with the given tool_results."""
    from app.agents.state import AgentLoopResult, AgentMetrics, TerminationReason
    result = MagicMock()
    result.tool_results = tool_results
    result.termination_reason = TerminationReason.NATURAL
    result.step_count = len(tool_results) * 2
    result.tool_call_count = len(tool_results)
    result.metrics = AgentMetrics()
    return result


def _make_specialist_patch_context(loop_result, plan_return=None):
    """Patch all external dependencies for run_specialist_agent."""
    if plan_return is None:
        plan_return = {
            "goal": "test",
            "durationWeeks": 4,
            "focusSkills": ["Leadership"],
            "weeklyPlan": [
                {
                    "week": i + 1,
                    "objective": f"Week {i+1}",
                    "focus": "Leadership",
                    "skills": ["Leadership"],
                    "whyThisSkill": "Leadership is 38/100",
                    "activities": ["Activity"],
                    "practiceExercises": ["Exercise"],
                    "applicationTask": "Task",
                    "resources": [],
                    "measurableOutcome": "Outcome",
                    "estimatedHours": 5,
                    "progressCheck": "Check",
                }
                for i in range(4)
            ],
            "generation_source": "LLM",
        }
    return plan_return


class TestSpecialistPostLoopResourceStrategy:

    def _run(self, tool_results: dict, plan_data: dict | None = None) -> dict:
        """
        Call run_specialist_agent with mocked dependencies.
        Returns the specialist result dict.
        """
        from app.agents.specialist_agent import run_specialist_agent

        loop_result = _make_loop_result(tool_results)
        _plan = plan_data or _make_specialist_patch_context(loop_result)

        spec_def = {
            "id": "spec-1",
            "max_steps": 12,
            "max_tool_calls": 8,
            "timeout_seconds": 150,
        }
        task = {
            "studentId": "s1",
            "goal": "Test goal",
            "supervisorRunId": "sup-1",
            "triggeredByUserId": None,
        }

        with (
            patch("app.agents.specialist_agent.run_agent_loop", return_value=loop_result),
            patch("app.agents.specialist_agent.agent_repository") as mock_repo,
            patch("app.agents.specialist_agent._generate_plan", return_value=_plan),
            patch("app.agents.specialist_agent.SearchWebResourcesTool") as MockWebSearch,
        ):
            mock_repo.create_specialist_run.return_value = "spec-run-1"
            mock_repo.update_run_status.return_value = None

            # Mock web search tool so we can detect if it's called
            mock_web_instance = MagicMock()
            mock_web_instance.name = "SearchWebResources"
            from app.tools.base import ToolResult
            mock_web_instance.execute.return_value = ToolResult(
                success=True,
                data={"webResources": [{"type": "WEB", "url": "https://example.com", "title": "Test"}]},
            )
            MockWebSearch.return_value = mock_web_instance

            result = run_specialist_agent(task, spec_def)

        return result

    def test_irrelevant_internal_docs_cleared_case2(self):
        """
        Case 2: Java/System Design docs are not relevant to Leadership skills.
        They should be cleared from the plan context.
        The plan should NOT receive the unrelated docs as knowledge_docs.
        """
        tool_results = {
            "GetStudentPerformance": {"profile": {"overall_score": 60}},
            "GetSkillGapAnalysis": {"weakSkills": [LEADERSHIP_SKILL]},
            "RetrieveLearningKnowledge": {"documents": [JAVA_DOC, SYSTEM_DESIGN_DOC]},
            "DraftLearningPlan": {
                "_ready_for_generation": True,
                "goal": "Test goal",
                "weakSkills": ["Leadership"],
                "performanceData": {},
                "knowledgeDocs": [JAVA_DOC, SYSTEM_DESIGN_DOC],
                "webResources": [],
                "durationWeeks": 4,
            },
        }
        from app.agents.specialist_agent import run_specialist_agent
        loop_result = _make_loop_result(tool_results)

        with (
            patch("app.agents.specialist_agent.run_agent_loop", return_value=loop_result),
            patch("app.agents.specialist_agent.agent_repository") as mock_repo,
            patch("app.agents.specialist_agent._generate_plan") as mock_gen,
            patch("app.agents.specialist_agent.SearchWebResourcesTool") as MockSearch,
        ):
            mock_repo.create_specialist_run.return_value = "spec-run-1"
            mock_repo.update_run_status.return_value = None

            # Capture the draft_ctx passed to _generate_plan
            captured_ctx: list[dict] = []
            mock_gen.side_effect = lambda ctx, *args, **kw: (
                captured_ctx.append(ctx) or {
                    "goal": "test", "durationWeeks": 4, "focusSkills": [],
                    "weeklyPlan": [
                        {
                            "week": i + 1, "objective": "", "focus": "Leadership",
                            "skills": [], "whyThisSkill": "", "activities": [],
                            "practiceExercises": [], "applicationTask": "",
                            "resources": [], "measurableOutcome": "", "estimatedHours": 4,
                            "progressCheck": "",
                        }
                        for i in range(4)
                    ],
                    "generation_source": "LLM",
                }
            )

            mock_web = MagicMock()
            mock_web.name = "SearchWebResources"
            from app.tools.base import ToolResult
            mock_web.execute.return_value = ToolResult(
                success=True,
                data={"webResources": [{"type": "WEB", "url": "https://example.com/lead", "title": "Leadership Guide"}]},
            )
            MockSearch.return_value = mock_web

            result = run_specialist_agent(
                {"studentId": "s1", "goal": "Test goal", "supervisorRunId": "sup-1", "triggeredByUserId": None},
                {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150},
            )

        # The draft_ctx passed to _generate_plan should have empty knowledgeDocs
        assert len(captured_ctx) == 1
        ctx = captured_ctx[0]
        # knowledgeDocs should be empty because Java/SystemDesign are not relevant
        assert ctx.get("knowledgeDocs") == [] or not ctx.get("knowledgeDocs")

    def test_relevant_internal_docs_kept_case1(self):
        """
        Case 1: Leadership doc IS relevant to Leadership skills.
        The docs should be kept in plan context.
        """
        tool_results = {
            "GetStudentPerformance": {"profile": {"overall_score": 60}},
            "GetSkillGapAnalysis": {"weakSkills": [LEADERSHIP_SKILL]},
            "RetrieveLearningKnowledge": {"documents": [LEADERSHIP_DOC]},
            "DraftLearningPlan": {
                "_ready_for_generation": True,
                "goal": "Test goal",
                "weakSkills": ["Leadership"],
                "performanceData": {},
                "knowledgeDocs": [LEADERSHIP_DOC],
                "webResources": [],
                "durationWeeks": 4,
            },
        }
        from app.agents.specialist_agent import run_specialist_agent
        loop_result = _make_loop_result(tool_results)

        with (
            patch("app.agents.specialist_agent.run_agent_loop", return_value=loop_result),
            patch("app.agents.specialist_agent.agent_repository") as mock_repo,
            patch("app.agents.specialist_agent._generate_plan") as mock_gen,
            patch("app.agents.specialist_agent.SearchWebResourcesTool"),
        ):
            mock_repo.create_specialist_run.return_value = "spec-run-1"
            mock_repo.update_run_status.return_value = None

            captured_ctx: list[dict] = []
            mock_gen.side_effect = lambda ctx, *a, **kw: (
                captured_ctx.append(ctx) or {
                    "goal": "test", "durationWeeks": 4, "focusSkills": [],
                    "weeklyPlan": [
                        {
                            "week": i + 1, "objective": "", "focus": "Leadership",
                            "skills": [], "whyThisSkill": "", "activities": [],
                            "practiceExercises": [], "applicationTask": "",
                            "resources": [], "measurableOutcome": "", "estimatedHours": 4,
                            "progressCheck": "",
                        }
                        for i in range(4)
                    ],
                    "generation_source": "LLM",
                }
            )

            run_specialist_agent(
                {"studentId": "s1", "goal": "Test goal", "supervisorRunId": "sup-1", "triggeredByUserId": None},
                {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150},
            )

        assert len(captured_ctx) == 1
        ctx = captured_ctx[0]
        # Leadership doc should be present in knowledgeDocs (it IS relevant)
        assert any(
            d.get("title") == LEADERSHIP_DOC["title"]
            for d in (ctx.get("knowledgeDocs") or [])
        )

    def test_post_loop_web_search_fires_when_no_relevant_internal(self):
        """
        When internal docs are NOT relevant and LLM skipped SearchWebResources,
        the application triggers a web search post-loop.
        """
        tool_results = {
            "GetStudentPerformance": {"profile": {"overall_score": 60}},
            "GetSkillGapAnalysis": {"weakSkills": [LEADERSHIP_SKILL, ADAPTABILITY_SKILL]},
            "RetrieveLearningKnowledge": {"documents": [JAVA_DOC]},
            "DraftLearningPlan": {
                "_ready_for_generation": True,
                "goal": "Test goal",
                "weakSkills": ["Leadership", "Adaptability"],
                "performanceData": {},
                "knowledgeDocs": [],
                "webResources": [],
                "durationWeeks": 4,
            },
        }
        from app.agents.specialist_agent import run_specialist_agent
        loop_result = _make_loop_result(tool_results)

        web_execute_calls: list = []

        with (
            patch("app.agents.specialist_agent.run_agent_loop", return_value=loop_result),
            patch("app.agents.specialist_agent.agent_repository") as mock_repo,
            patch("app.agents.specialist_agent._generate_plan") as mock_gen,
            patch("app.agents.specialist_agent.SPECIALIST_TOOLS") as mock_tools,
        ):
            mock_repo.create_specialist_run.return_value = "spec-run-1"
            mock_repo.update_run_status.return_value = None

            mock_gen.return_value = {
                "goal": "test", "durationWeeks": 4, "focusSkills": ["Leadership"],
                "weeklyPlan": [
                    {
                        "week": i + 1, "objective": "", "focus": "Leadership",
                        "skills": [], "whyThisSkill": "", "activities": [],
                        "practiceExercises": [], "applicationTask": "",
                        "resources": [], "measurableOutcome": "", "estimatedHours": 4,
                        "progressCheck": "",
                    }
                    for i in range(4)
                ],
                "generation_source": "LLM",
            }

            # Set up mock tools list with a web search tool that we can detect
            from app.tools.base import ToolResult
            mock_web_tool = MagicMock()
            mock_web_tool.name = "SearchWebResources"
            mock_web_tool.execute.side_effect = lambda args, ctx: (
                web_execute_calls.append(args) or
                ToolResult(
                    success=True,
                    data={"webResources": [{"type": "WEB", "url": "https://example.com", "title": "Leadership"}]},
                )
            )
            mock_tools.__iter__ = MagicMock(return_value=iter([mock_web_tool]))

            run_specialist_agent(
                {"studentId": "s1", "goal": "Test goal", "supervisorRunId": "sup-1", "triggeredByUserId": None},
                {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150},
            )

        # Web search should have been called at the application level
        assert len(web_execute_calls) >= 1
        # Query should contain skill names
        query = web_execute_calls[0].get("query", "")
        # Should contain at least one of the skill names
        assert any(name in query for name in ["Leadership", "Adaptability"])

    def test_no_post_loop_web_search_when_llm_already_searched(self):
        """
        If the LLM already called SearchWebResources, no duplicate search.
        """
        tool_results = {
            "GetStudentPerformance": {"profile": {"overall_score": 60}},
            "GetSkillGapAnalysis": {"weakSkills": [LEADERSHIP_SKILL]},
            "RetrieveLearningKnowledge": {"documents": [JAVA_DOC]},
            "SearchWebResources": {
                "webResources": [{"type": "WEB", "url": "https://example.com", "title": "Lead"}],
                "skills": ["Leadership"],
                "query": "Leadership",
                "totalFound": 1,
            },
            "DraftLearningPlan": {
                "_ready_for_generation": True,
                "goal": "Test goal",
                "weakSkills": ["Leadership"],
                "performanceData": {},
                "knowledgeDocs": [],
                "webResources": [{"type": "WEB", "url": "https://example.com", "title": "Lead"}],
                "durationWeeks": 4,
            },
        }
        from app.agents.specialist_agent import run_specialist_agent
        loop_result = _make_loop_result(tool_results)
        web_execute_calls: list = []

        with (
            patch("app.agents.specialist_agent.run_agent_loop", return_value=loop_result),
            patch("app.agents.specialist_agent.agent_repository") as mock_repo,
            patch("app.agents.specialist_agent._generate_plan") as mock_gen,
            patch("app.agents.specialist_agent.SPECIALIST_TOOLS") as mock_tools,
        ):
            mock_repo.create_specialist_run.return_value = "spec-run-1"
            mock_repo.update_run_status.return_value = None
            mock_gen.return_value = {
                "goal": "test", "durationWeeks": 4, "focusSkills": ["Leadership"],
                "weeklyPlan": [
                    {
                        "week": i + 1, "objective": "", "focus": "Leadership",
                        "skills": [], "whyThisSkill": "", "activities": [],
                        "practiceExercises": [], "applicationTask": "",
                        "resources": [], "measurableOutcome": "", "estimatedHours": 4,
                        "progressCheck": "",
                    }
                    for i in range(4)
                ],
                "generation_source": "LLM",
            }

            from app.tools.base import ToolResult
            mock_web_tool = MagicMock()
            mock_web_tool.name = "SearchWebResources"
            mock_web_tool.execute.side_effect = lambda args, ctx: (
                web_execute_calls.append(args) or
                ToolResult(success=True, data={"webResources": []})
            )
            mock_tools.__iter__ = MagicMock(return_value=iter([mock_web_tool]))

            run_specialist_agent(
                {"studentId": "s1", "goal": "Test goal", "supervisorRunId": "sup-1", "triggeredByUserId": None},
                {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150},
            )

        # Application-level search should NOT have fired (LLM already did it)
        assert len(web_execute_calls) == 0

    def test_post_loop_web_search_fires_even_when_internal_is_relevant(self):
        """
        SearchWebResources is now always required.  The POST_LOOP_WEB_SEARCH
        safety net fires whenever the LLM skipped web search, regardless of
        whether internal docs are relevant.
        """
        tool_results = {
            "GetStudentPerformance": {"profile": {"overall_score": 60}},
            "GetSkillGapAnalysis": {"weakSkills": [LEADERSHIP_SKILL]},
            "RetrieveLearningKnowledge": {"documents": [LEADERSHIP_DOC]},
            "DraftLearningPlan": {
                "_ready_for_generation": True,
                "goal": "Test goal",
                "weakSkills": ["Leadership"],
                "performanceData": {},
                "knowledgeDocs": [LEADERSHIP_DOC],
                "webResources": [],
                "durationWeeks": 4,
            },
        }
        from app.agents.specialist_agent import run_specialist_agent
        loop_result = _make_loop_result(tool_results)
        web_execute_calls: list = []

        with (
            patch("app.agents.specialist_agent.run_agent_loop", return_value=loop_result),
            patch("app.agents.specialist_agent.agent_repository") as mock_repo,
            patch("app.agents.specialist_agent._generate_plan") as mock_gen,
            patch("app.agents.specialist_agent.SPECIALIST_TOOLS") as mock_tools,
        ):
            mock_repo.create_specialist_run.return_value = "spec-run-1"
            mock_repo.update_run_status.return_value = None
            mock_gen.return_value = {
                "goal": "test", "durationWeeks": 4, "focusSkills": ["Leadership"],
                "weeklyPlan": [
                    {
                        "week": i + 1, "objective": "", "focus": "Leadership",
                        "skills": [], "whyThisSkill": "", "activities": [],
                        "practiceExercises": [], "applicationTask": "",
                        "resources": [], "measurableOutcome": "", "estimatedHours": 4,
                        "progressCheck": "",
                    }
                    for i in range(4)
                ],
                "generation_source": "LLM",
            }

            from app.tools.base import ToolResult
            mock_web_tool = MagicMock()
            mock_web_tool.name = "SearchWebResources"
            mock_web_tool.execute.side_effect = lambda args, ctx: (
                web_execute_calls.append(args) or
                ToolResult(success=True, data={"webResources": []})
            )
            mock_tools.__iter__ = MagicMock(return_value=iter([mock_web_tool]))

            run_specialist_agent(
                {"studentId": "s1", "goal": "Test goal", "supervisorRunId": "sup-1", "triggeredByUserId": None},
                {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150},
            )

        # POST_LOOP_WEB_SEARCH fires because web search was skipped (always required now)
        assert len(web_execute_calls) == 1
