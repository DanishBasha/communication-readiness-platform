"""
test_agent_loop_guard.py

Verifies the application-level required-tools guard in agent_loop.py.

The guard prevents the LLM from short-circuiting a learning-plan workflow by
returning final_answer before DraftLearningPlan (or RetrieveLearningKnowledge)
has been called.

Test cases:
  A. final_answer before DraftLearningPlan → nudge injected, loop continues
  B. After nudge, LLM calls DraftLearningPlan → loop exits NATURAL
  C. Nudge limit exhausted → GUARD_REQUIRED_TOOLS termination
  D. final_answer after all required tools → accepted normally (no nudge)
  E. No required_tools set → final_answer always accepted (legacy behaviour)
  F. Required tools partially done → only missing ones trigger nudge
  G. RetrieveLearningKnowledge required and missing → nudge fires for it
  H. Normal full happy-path: all tools called, DraftLearningPlan is terminal
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, call, patch

import pytest

from app.agents.agent_loop import run_agent_loop
from app.agents.state import AgentLoopConfig, AgentMetrics, TerminationReason
from app.tools.base import ToolContext, ToolDefinition, ToolResult


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _stub_repo() -> MagicMock:
    r = MagicMock()
    r.upsert_completed_step.return_value = None
    r.insert_running_tool_step.return_value = None
    r.update_tool_step.return_value = None
    return r


def _noop_tool(tool_name: str, terminal: bool = False) -> ToolDefinition:
    class _T(ToolDefinition):
        name = tool_name
        description = tool_name
        input_schema: dict = {}
        requires_student_scope = False
        is_terminal = terminal

        def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
            return ToolResult(
                success=True,
                data={"tool": tool_name},
                context_summary=f"ok_{tool_name}",
            )

    return _T()


def _make_llm_mock(responses: list[dict]) -> MagicMock:
    """Return a mock LLMClient whose chat_complete_with_tools yields responses in order."""
    provider = MagicMock()
    provider._last_usage = {}

    llm = MagicMock()
    llm._provider = provider

    call_iter = iter(responses)

    def _side_effect(messages, tools):
        return next(call_iter)

    llm.chat_complete_with_tools.side_effect = _side_effect
    return llm


def _final_answer(content: str = "done") -> dict:
    return {"type": "final_answer", "content": content}


def _tool_call(tool_name: str, args: dict | None = None) -> dict:
    return {
        "type": "tool_call",
        "tool_name": tool_name,
        "tool_args": args or {},
        "tool_call_id": f"tc_{tool_name}",
        "assistant_message": {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": f"tc_{tool_name}",
                    "type": "function",
                    "function": {"name": tool_name, "arguments": json.dumps(args or {})},
                }
            ],
        },
    }


def _config(
    tools: list,
    required_tools: list | None = None,
    max_plan_nudges: int = 3,
) -> AgentLoopConfig:
    return AgentLoopConfig(
        agent_run_id="run-test",
        student_id="s1",
        system_prompt="You are a test agent.",
        user_message="Do something.",
        tools=tools,
        max_steps=20,
        max_tool_calls=10,
        timeout_seconds=60.0,
        required_tools=required_tools or [],
        max_plan_nudges=max_plan_nudges,
    )


# ══════════════════════════════════════════════════════════════════════════════
# A. final_answer before required tool → nudge injected
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardNudge:

    def test_final_answer_before_draft_triggers_nudge_and_continues(self):
        """final_answer before DraftLearningPlan should NOT terminate the loop."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        llm_mock = _make_llm_mock([
            _final_answer("I'm done"),         # premature — nudge should fire
            _tool_call("DraftLearningPlan"),   # after nudge, LLM calls required tool
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=["DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "DraftLearningPlan" in result.tool_results

    def test_nudge_count_increments(self):
        """Each premature final_answer increments the nudge counter."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        llm_mock = _make_llm_mock([
            _final_answer("early 1"),          # nudge 1
            _final_answer("early 2"),          # nudge 2
            _tool_call("DraftLearningPlan"),   # then calls required tool
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=["DraftLearningPlan"],
                max_plan_nudges=3,
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "DraftLearningPlan" in result.tool_results

    def test_nudge_message_injected_into_conversation(self):
        """After nudge, the messages list should contain the correction."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        captured_messages: list[list] = []

        def _side_effect(messages, tools):
            captured_messages.append(list(messages))
            if len(captured_messages) == 1:
                return _final_answer("done early")
            return _tool_call("DraftLearningPlan")

        provider = MagicMock()
        provider._last_usage = {}
        llm_mock = MagicMock()
        llm_mock._provider = provider
        llm_mock.chat_complete_with_tools.side_effect = _side_effect

        repo = _stub_repo()
        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=["DraftLearningPlan"],
            ))

        # The second LLM call should see the nudge in messages
        second_call_messages = captured_messages[1]
        roles = [m["role"] for m in second_call_messages]
        assert "user" in roles
        # The last user message should mention DraftLearningPlan
        last_user = next(
            m for m in reversed(second_call_messages) if m["role"] == "user"
        )
        assert "DraftLearningPlan" in last_user["content"]


# ══════════════════════════════════════════════════════════════════════════════
# B. Successful completion after nudge
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardNudgeThenSuccess:

    def test_after_nudge_terminal_tool_exits_naturally(self):
        """After being nudged, the LLM calls the terminal tool and exits cleanly."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        llm_mock = _make_llm_mock([
            _final_answer("premature"),
            _tool_call("DraftLearningPlan"),
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=["DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert result.tool_call_count == 1
        assert result.tool_results["DraftLearningPlan"]["tool"] == "DraftLearningPlan"


# ══════════════════════════════════════════════════════════════════════════════
# C. Nudge limit exhausted → GUARD_REQUIRED_TOOLS
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardNudgeExhausted:

    def test_max_nudges_returns_guard_termination(self):
        """When all nudges are used without compliance, return GUARD_REQUIRED_TOOLS."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        llm_mock = _make_llm_mock([
            _final_answer("no 1"),
            _final_answer("no 2"),
            _final_answer("no 3"),
            _final_answer("no 4"),   # one more — exhausted
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=["DraftLearningPlan"],
                max_plan_nudges=3,
            ))

        assert result.termination_reason == TerminationReason.GUARD_REQUIRED_TOOLS
        assert "DraftLearningPlan" not in result.tool_results

    def test_guard_fail_with_max_nudges_1(self):
        """With max_plan_nudges=1, only one nudge fires before GUARD_REQUIRED_TOOLS."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        llm_mock = _make_llm_mock([
            _final_answer("early"),
            _final_answer("still early"),
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=["DraftLearningPlan"],
                max_plan_nudges=1,
            ))

        assert result.termination_reason == TerminationReason.GUARD_REQUIRED_TOOLS


# ══════════════════════════════════════════════════════════════════════════════
# D. final_answer after all required tools → accepted normally
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardNoNudgeNeeded:

    def test_final_answer_accepted_after_all_required_tools(self):
        """If all required tools ran, final_answer is accepted without nudge."""
        tool_a = _noop_tool("ToolA")
        tool_b = _noop_tool("ToolB")
        llm_mock = _make_llm_mock([
            _tool_call("ToolA"),
            _tool_call("ToolB"),
            _final_answer("done"),   # both required tools already ran
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[tool_a, tool_b],
                required_tools=["ToolA", "ToolB"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "ToolA" in result.tool_results
        assert "ToolB" in result.tool_results


# ══════════════════════════════════════════════════════════════════════════════
# E. No required_tools → final_answer always accepted (legacy behaviour)
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardDisabled:

    def test_no_required_tools_final_answer_terminates(self):
        """Without required_tools, final_answer terminates normally."""
        draft_tool = _noop_tool("DraftLearningPlan", terminal=True)
        llm_mock = _make_llm_mock([_final_answer("bye")])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[draft_tool],
                required_tools=[],   # no guard
            ))

        # Loop exits NATURAL (from final_answer break)
        assert result.termination_reason == TerminationReason.NATURAL
        assert "DraftLearningPlan" not in result.tool_results


# ══════════════════════════════════════════════════════════════════════════════
# F. Partial: some required tools done, only missing ones nudge
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardPartialRequired:

    def test_only_missing_tool_triggers_nudge(self):
        """If ToolA is done but ToolB is missing, nudge only mentions ToolB."""
        tool_a = _noop_tool("ToolA")
        tool_b = _noop_tool("ToolB", terminal=True)
        captured: list[str] = []

        def _side_effect(messages, tools):
            if not captured:
                captured.append("first")
                return _tool_call("ToolA")
            if len(captured) == 1:
                captured.append("final_before_b")
                return _final_answer("done")
            captured.append("calls_b")
            return _tool_call("ToolB")

        provider = MagicMock()
        provider._last_usage = {}
        llm_mock = MagicMock()
        llm_mock._provider = provider
        llm_mock.chat_complete_with_tools.side_effect = _side_effect
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[tool_a, tool_b],
                required_tools=["ToolA", "ToolB"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "ToolA" in result.tool_results
        assert "ToolB" in result.tool_results


# ══════════════════════════════════════════════════════════════════════════════
# G. RetrieveLearningKnowledge required (specialist scenario)
# ══════════════════════════════════════════════════════════════════════════════

class TestGuardSpecialistRequired:

    def test_retrieve_knowledge_required_triggers_nudge(self):
        """If RetrieveLearningKnowledge is in required_tools and skipped, nudge fires."""
        retrieve_tool = _noop_tool("RetrieveLearningKnowledge")
        draft_tool    = _noop_tool("DraftLearningPlan", terminal=True)

        llm_mock = _make_llm_mock([
            _final_answer("skipping knowledge"),               # premature
            _tool_call("RetrieveLearningKnowledge"),           # nudged into calling it
            _tool_call("DraftLearningPlan"),                   # then drafts
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[retrieve_tool, draft_tool],
                required_tools=["RetrieveLearningKnowledge", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "RetrieveLearningKnowledge" in result.tool_results
        assert "DraftLearningPlan" in result.tool_results

    def test_final_answer_after_retrieve_but_before_draft_nudges_for_draft(self):
        """If RetrieveLearningKnowledge done but DraftLearningPlan missing, nudge for Draft."""
        retrieve_tool = _noop_tool("RetrieveLearningKnowledge")
        draft_tool    = _noop_tool("DraftLearningPlan", terminal=True)
        nudge_msgs: list[str] = []

        def _side_effect(messages, tools):
            if "RetrieveLearningKnowledge" not in [
                r.get("data", {}).get("tool") for r in []
            ]:
                pass
            # Check what's in the messages to decide what to return
            contents = [m.get("content") or "" for m in messages if m.get("role") == "user"]
            if any("DraftLearningPlan" in c for c in contents):
                nudge_msgs.append("nudged_for_draft")
                return _tool_call("DraftLearningPlan")
            if any("RetrieveLearningKnowledge" in c for c in contents):
                return _tool_call("DraftLearningPlan")
            # First: call RetrieveLearningKnowledge
            tool_names = [
                m.get("content", "") for m in messages
                if m.get("role") == "tool"
            ]
            if not tool_names:
                return _tool_call("RetrieveLearningKnowledge")
            # Then try final_answer before calling Draft
            return _final_answer("skipping draft")

        provider = MagicMock()
        provider._last_usage = {}
        llm_mock = MagicMock()
        llm_mock._provider = provider
        llm_mock.chat_complete_with_tools.side_effect = _side_effect
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[retrieve_tool, draft_tool],
                required_tools=["RetrieveLearningKnowledge", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "DraftLearningPlan" in result.tool_results


# ══════════════════════════════════════════════════════════════════════════════
# H. Normal happy path: all tools called, no final_answer at all
# ══════════════════════════════════════════════════════════════════════════════

class TestHappyPath:

    def test_full_workflow_draft_is_terminal(self):
        """
        Full path: GetStudentPerformance → GetSkillGapAnalysis →
        RetrieveLearningKnowledge → DraftLearningPlan (terminal).
        No nudges, terminates NATURAL.
        """
        perf_tool     = _noop_tool("GetStudentPerformance")
        gap_tool      = _noop_tool("GetSkillGapAnalysis")
        knowledge_tool= _noop_tool("RetrieveLearningKnowledge")
        draft_tool    = _noop_tool("DraftLearningPlan", terminal=True)

        llm_mock = _make_llm_mock([
            _tool_call("GetStudentPerformance"),
            _tool_call("GetSkillGapAnalysis"),
            _tool_call("RetrieveLearningKnowledge"),
            _tool_call("DraftLearningPlan"),
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=[perf_tool, gap_tool, knowledge_tool, draft_tool],
                required_tools=["RetrieveLearningKnowledge", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert result.tool_call_count == 4
        assert all(k in result.tool_results for k in [
            "GetStudentPerformance",
            "GetSkillGapAnalysis",
            "RetrieveLearningKnowledge",
            "DraftLearningPlan",
        ])

    def test_full_workflow_with_web_search(self):
        """
        Full path includes SearchWebResources, still terminates at DraftLearningPlan.
        """
        tools = [
            _noop_tool("GetStudentPerformance"),
            _noop_tool("GetSkillGapAnalysis"),
            _noop_tool("RetrieveLearningKnowledge"),
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        llm_mock = _make_llm_mock([
            _tool_call("GetStudentPerformance"),
            _tool_call("GetSkillGapAnalysis"),
            _tool_call("RetrieveLearningKnowledge"),
            _tool_call("SearchWebResources"),
            _tool_call("DraftLearningPlan"),
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=tools,
                required_tools=["RetrieveLearningKnowledge", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert result.tool_call_count == 5
        assert "DraftLearningPlan" in result.tool_results
        assert "SearchWebResources" in result.tool_results


# ══════════════════════════════════════════════════════════════════════════════
# I. Pre-terminal guard: blocks DraftLearningPlan when SearchWebResources skipped
# ══════════════════════════════════════════════════════════════════════════════

class TestPreTerminalGuard:
    """
    The pre-terminal guard blocks a terminal tool (DraftLearningPlan) when
    required non-terminal tools (SearchWebResources) have not yet been called.

    This is distinct from the final_answer guard: the LLM can bypass the
    final_answer guard by calling the terminal tool directly.  The pre-terminal
    guard closes that gap.
    """

    def test_draft_before_web_search_is_blocked_and_nudged(self):
        """
        If the LLM calls DraftLearningPlan before SearchWebResources,
        the call is blocked and a nudge fires directing it to SearchWebResources.
        """
        tools = [
            _noop_tool("RetrieveLearningKnowledge"),
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        llm_mock = _make_llm_mock([
            _tool_call("RetrieveLearningKnowledge"),
            _tool_call("DraftLearningPlan"),       # skipped SearchWebResources — blocked
            _tool_call("SearchWebResources"),       # nudged into calling it
            _tool_call("DraftLearningPlan"),        # now succeeds
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=tools,
                required_tools=["RetrieveLearningKnowledge", "SearchWebResources", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert "SearchWebResources" in result.tool_results
        assert "DraftLearningPlan" in result.tool_results

    def test_nudge_message_mentions_missing_tool(self):
        """The blocked response message names the missing required tool."""
        tools = [
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        captured_messages: list[list] = []

        def _side_effect(messages, tools_spec):
            captured_messages.append(list(messages))
            call_n = len(captured_messages)
            if call_n == 1:
                return _tool_call("DraftLearningPlan")   # skip SearchWebResources
            if call_n == 2:
                return _tool_call("SearchWebResources")   # after nudge
            return _tool_call("DraftLearningPlan")        # now proceeds

        provider = MagicMock()
        provider._last_usage = {}
        llm_mock = MagicMock()
        llm_mock._provider = provider
        llm_mock.chat_complete_with_tools.side_effect = _side_effect
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            run_agent_loop(_config(
                tools=tools,
                required_tools=["SearchWebResources", "DraftLearningPlan"],
            ))

        # The second LLM call should see a "tool" message saying SearchWebResources is required
        second_call = captured_messages[1]
        tool_messages = [m for m in second_call if m.get("role") == "tool"]
        assert any("SearchWebResources" in json.dumps(m) for m in tool_messages), (
            "Nudge message should mention SearchWebResources"
        )

    def test_pre_terminal_nudge_does_not_execute_terminal_tool(self):
        """When the pre-terminal guard fires, DraftLearningPlan is NOT executed."""
        tools = [
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        llm_mock = _make_llm_mock([
            _tool_call("DraftLearningPlan"),    # skipped SearchWebResources — blocked
            _tool_call("SearchWebResources"),   # after nudge
            _tool_call("DraftLearningPlan"),    # executes now
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=tools,
                required_tools=["SearchWebResources", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        # Only 2 actual tool executions: SearchWebResources + DraftLearningPlan
        assert result.tool_call_count == 2

    def test_pre_terminal_guard_exhausted_returns_guard_termination(self):
        """If the LLM keeps skipping SearchWebResources until nudges are exhausted."""
        tools = [
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        # LLM always tries DraftLearningPlan without SearchWebResources
        llm_mock = _make_llm_mock([
            _tool_call("DraftLearningPlan"),
            _tool_call("DraftLearningPlan"),
            _tool_call("DraftLearningPlan"),
            _tool_call("DraftLearningPlan"),
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=tools,
                required_tools=["SearchWebResources", "DraftLearningPlan"],
                max_plan_nudges=3,
            ))

        assert result.termination_reason == TerminationReason.GUARD_REQUIRED_TOOLS
        assert "DraftLearningPlan" not in result.tool_results

    def test_pre_terminal_guard_not_triggered_when_web_search_called(self):
        """When SearchWebResources is called before DraftLearningPlan, no block."""
        tools = [
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        llm_mock = _make_llm_mock([
            _tool_call("SearchWebResources"),   # correct order
            _tool_call("DraftLearningPlan"),    # proceeds unblocked
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=tools,
                required_tools=["SearchWebResources", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert result.tool_call_count == 2  # both executed (no blocked calls)
        assert "SearchWebResources" in result.tool_results
        assert "DraftLearningPlan" in result.tool_results

    def test_full_required_sequence_with_pre_terminal_guard(self):
        """
        Full specialist flow with SearchWebResources in required_tools.
        GetStudentPerformance → GetSkillGapAnalysis → RetrieveLearningKnowledge
        → SearchWebResources → DraftLearningPlan — no nudges fired.
        """
        tools = [
            _noop_tool("GetStudentPerformance"),
            _noop_tool("GetSkillGapAnalysis"),
            _noop_tool("RetrieveLearningKnowledge"),
            _noop_tool("SearchWebResources"),
            _noop_tool("DraftLearningPlan", terminal=True),
        ]
        llm_mock = _make_llm_mock([
            _tool_call("GetStudentPerformance"),
            _tool_call("GetSkillGapAnalysis"),
            _tool_call("RetrieveLearningKnowledge"),
            _tool_call("SearchWebResources"),
            _tool_call("DraftLearningPlan"),
        ])
        repo = _stub_repo()

        with (
            patch("app.agents.agent_loop.get_llm_client", return_value=llm_mock),
            patch("app.agents.agent_loop.agent_repository", repo),
        ):
            result = run_agent_loop(_config(
                tools=tools,
                required_tools=["RetrieveLearningKnowledge", "SearchWebResources", "DraftLearningPlan"],
            ))

        assert result.termination_reason == TerminationReason.NATURAL
        assert result.tool_call_count == 5
        assert all(k in result.tool_results for k in [
            "GetStudentPerformance", "GetSkillGapAnalysis",
            "RetrieveLearningKnowledge", "SearchWebResources", "DraftLearningPlan",
        ])
