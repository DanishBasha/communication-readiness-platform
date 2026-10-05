"""
Tests for the Groq / OpenAI tool-calling protocol fix.

Covers:
  1. OpenAICompatibleProvider preserves tool_call_id and returns assistant_message
  2. Agent loop sends tool result with matching tool_call_id
  3. Agent loop uses the verbatim assistant message (with tool_calls)
  4. Failed tool result also includes tool_call_id
  5. Multiple sequential tool calls each carry their own tool_call_id
  6. MockProvider remains compatible (no tool_call_id — agent falls back gracefully)
  7. Final answer (no tool_calls) returns clean final_answer dict
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.services.providers import MockProvider, OpenAICompatibleProvider
from app.agents.agent_loop import run_agent_loop
from app.agents.state import AgentLoopConfig, TerminationReason
from app.tools.base import ToolContext, ToolDefinition, ToolResult


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _make_openai_tool_call(call_id: str, name: str, arguments: str):
    """Build a minimal object that mimics openai.types.chat.ChatCompletionMessageToolCall."""
    fn = MagicMock()
    fn.name = name
    fn.arguments = arguments
    tc = MagicMock()
    tc.id = call_id
    tc.function = fn
    return tc


def _make_openai_response(tool_calls=None, content: str | None = None):
    """Build a minimal object that mimics openai.types.chat.ChatCompletion."""
    msg = MagicMock()
    msg.tool_calls = tool_calls or []
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _noop_tool(tool_name: str = "Echo") -> ToolDefinition:
    """Return a ToolDefinition whose execute always succeeds."""
    class _Noop(ToolDefinition):
        name = tool_name
        description = f"Echo tool {tool_name}"
        input_schema: dict = {}
        requires_student_scope = False

        def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
            return ToolResult(success=True, data={"result": args})

    return _Noop()


def _failing_tool(tool_name: str = "BadTool") -> ToolDefinition:
    """Return a ToolDefinition whose execute always fails."""
    class _Fail(ToolDefinition):
        name = tool_name
        description = f"Failing tool {tool_name}"
        input_schema: dict = {}
        requires_student_scope = False

        def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
            return ToolResult(success=False, error_code="TOOL_ERROR", error_message="intentional failure")

    return _Fail()


def _stub_agent_repo():
    """Patch agent_repository with no-op stubs."""
    repo = MagicMock()
    repo.upsert_completed_step.return_value = None
    repo.insert_running_tool_step.return_value = None
    repo.update_tool_step.return_value = None
    return repo


# ══════════════════════════════════════════════════════════════════════════════
# 1. Provider: tool_call_id and assistant_message are preserved
# ══════════════════════════════════════════════════════════════════════════════

class TestOpenAICompatibleProviderToolCallProtocol:

    def _provider_with_tool_call(self, call_id: str, name: str, args: dict) -> OpenAICompatibleProvider:
        tc = _make_openai_tool_call(call_id, name, json.dumps(args))
        resp = _make_openai_response(tool_calls=[tc])
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = resp
        provider = OpenAICompatibleProvider.__new__(OpenAICompatibleProvider)
        provider._client = mock_client
        provider._model = "test-model"
        return provider

    def test_tool_call_id_is_preserved(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["tool_call_id"] == "call_abc123"

    def test_tool_name_is_preserved(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["tool_name"] == "GetStudentPerformance"

    def test_tool_args_are_preserved(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["tool_args"] == {"studentId": "s1"}

    def test_assistant_message_is_included(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert "assistant_message" in action

    def test_assistant_message_role_is_assistant(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["assistant_message"]["role"] == "assistant"

    def test_assistant_message_has_tool_calls_array(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        tool_calls = action["assistant_message"]["tool_calls"]
        assert isinstance(tool_calls, list)
        assert len(tool_calls) == 1

    def test_assistant_message_tool_call_id_matches(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["assistant_message"]["tool_calls"][0]["id"] == "call_abc123"

    def test_assistant_message_tool_call_name_matches(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["assistant_message"]["tool_calls"][0]["function"]["name"] == "GetStudentPerformance"

    def test_action_type_is_tool_call(self):
        provider = self._provider_with_tool_call("call_abc123", "GetStudentPerformance", {"studentId": "s1"})
        action = provider.chat_complete_with_tools([], [])
        assert action["type"] == "tool_call"

    def test_final_answer_has_no_tool_call_id(self):
        resp = _make_openai_response(tool_calls=[], content="Done")
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = resp
        provider = OpenAICompatibleProvider.__new__(OpenAICompatibleProvider)
        provider._client = mock_client
        provider._model = "test-model"
        action = provider.chat_complete_with_tools([], [])
        assert action["type"] == "final_answer"
        assert "tool_call_id" not in action
        assert "assistant_message" not in action


# ══════════════════════════════════════════════════════════════════════════════
# 2. Agent loop: tool result message carries tool_call_id
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentLoopToolCallId:
    """Use a fake LLM that returns one tool call then a final answer."""

    def _run_loop(self, tool: ToolDefinition, call_id: str = "call_xyz") -> list[dict]:
        """
        Run the agent loop with a mock provider:
          turn 1 → tool_call (call_id, tool.name, {})
          turn 2 → final_answer "done"
        Returns the full messages list captured by the provider.
        """
        captured_messages: list[list[dict]] = []
        call_count = 0

        def fake_chat_complete_with_tools(messages, tools):
            nonlocal call_count
            captured_messages.append(list(messages))
            call_count += 1
            if call_count == 1:
                return {
                    "type": "tool_call",
                    "tool_name": tool.name,
                    "tool_args": {},
                    "tool_call_id": call_id,
                    "assistant_message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": call_id,
                                "type": "function",
                                "function": {"name": tool.name, "arguments": "{}"},
                            }
                        ],
                    },
                }
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = fake_chat_complete_with_tools

        mock_repo = _stub_agent_repo()

        config = AgentLoopConfig(
            agent_run_id="run-test",
            student_id="student-test",
            system_prompt="system",
            user_message="user",
            tools=[tool],
            max_steps=20,
            max_tool_calls=10,
            timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", mock_repo):
            run_agent_loop(config)

        # The second LLM call receives the messages including the tool result
        return captured_messages[1] if len(captured_messages) > 1 else []

    def test_tool_result_message_has_tool_call_id(self):
        msgs = self._run_loop(_noop_tool("Echo"))
        tool_msgs = [m for m in msgs if m.get("role") == "tool"]
        assert len(tool_msgs) == 1
        assert tool_msgs[0]["tool_call_id"] == "call_xyz"

    def test_assistant_message_has_tool_calls_not_content_string(self):
        msgs = self._run_loop(_noop_tool("Echo"))
        asst_msgs = [m for m in msgs if m.get("role") == "assistant"]
        assert len(asst_msgs) >= 1
        # The assistant message must have tool_calls (not the fake "[called: ...]" string)
        assert "tool_calls" in asst_msgs[-1]
        assert asst_msgs[-1]["tool_calls"][0]["id"] == "call_xyz"

    def test_tool_result_tool_call_id_matches_assistant(self):
        msgs = self._run_loop(_noop_tool("Echo"))
        asst_msgs = [m for m in msgs if m.get("role") == "assistant" and "tool_calls" in m]
        tool_msgs = [m for m in msgs if m.get("role") == "tool"]
        assert asst_msgs and tool_msgs
        assert asst_msgs[-1]["tool_calls"][0]["id"] == tool_msgs[-1]["tool_call_id"]

    def test_failed_tool_result_also_has_tool_call_id(self):
        msgs = self._run_loop(_failing_tool("BadTool"))
        tool_msgs = [m for m in msgs if m.get("role") == "tool"]
        assert len(tool_msgs) == 1
        assert tool_msgs[0]["tool_call_id"] == "call_xyz"


# ══════════════════════════════════════════════════════════════════════════════
# 3. Multiple sequential tool calls each carry their own tool_call_id
# ══════════════════════════════════════════════════════════════════════════════

class TestMultipleToolCallIds:

    def test_second_tool_call_uses_different_id(self):
        """Two sequential tool calls must each produce a message with their own id."""
        tool_a = _noop_tool("ToolA")
        tool_b = _noop_tool("ToolB")
        captured_messages: list[list[dict]] = []
        call_count = 0

        def fake_cwt(messages, tools):
            nonlocal call_count
            captured_messages.append(list(messages))
            call_count += 1
            if call_count == 1:
                return {
                    "type": "tool_call", "tool_name": "ToolA", "tool_args": {},
                    "tool_call_id": "call_first",
                    "assistant_message": {
                        "role": "assistant", "content": None,
                        "tool_calls": [{"id": "call_first", "type": "function",
                                        "function": {"name": "ToolA", "arguments": "{}"}}],
                    },
                }
            if call_count == 2:
                return {
                    "type": "tool_call", "tool_name": "ToolB", "tool_args": {},
                    "tool_call_id": "call_second",
                    "assistant_message": {
                        "role": "assistant", "content": None,
                        "tool_calls": [{"id": "call_second", "type": "function",
                                        "function": {"name": "ToolB", "arguments": "{}"}}],
                    },
                }
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = fake_cwt
        mock_repo = _stub_agent_repo()

        config = AgentLoopConfig(
            agent_run_id="run-multi",
            student_id="student-multi",
            system_prompt="system",
            user_message="user",
            tools=[tool_a, tool_b],
            max_steps=20,
            max_tool_calls=10,
            timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", mock_repo):
            run_agent_loop(config)

        # After the second tool call, the messages sent to LLM on turn 3
        third_call_msgs = captured_messages[2]
        tool_msgs = [m for m in third_call_msgs if m.get("role") == "tool"]
        assert len(tool_msgs) == 2
        ids = {m["tool_call_id"] for m in tool_msgs}
        assert ids == {"call_first", "call_second"}


# ══════════════════════════════════════════════════════════════════════════════
# 4. MockProvider: no tool_call_id — agent falls back gracefully
# ══════════════════════════════════════════════════════════════════════════════

class TestMockProviderCompatibility:

    def test_mock_provider_action_has_no_tool_call_id(self):
        """MockProvider must not include tool_call_id (it's an offline stub)."""
        provider = MockProvider()
        messages = [
            {"role": "system", "content": "agent for student 00000000-0000-0000-0000-000000000001"},
            {"role": "user", "content": "create learning plan"},
        ]
        action = provider.chat_complete_with_tools(messages, [])
        assert action["type"] == "tool_call"
        assert "tool_call_id" not in action
        assert "assistant_message" not in action

    def test_agent_loop_works_without_tool_call_id_in_action(self):
        """
        When the provider returns no tool_call_id (e.g. MockProvider), the agent
        loop must still complete without raising KeyError.
        """
        tool = _noop_tool("SimpleEcho")
        call_count = 0

        def fake_cwt(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # No tool_call_id — simulates MockProvider
                return {"type": "tool_call", "tool_name": "SimpleEcho", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = fake_cwt
        mock_repo = _stub_agent_repo()

        config = AgentLoopConfig(
            agent_run_id="run-mock",
            student_id="student-mock",
            system_prompt="system",
            user_message="user",
            tools=[tool],
            max_steps=20,
            max_tool_calls=10,
            timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", mock_repo):
            result = run_agent_loop(config)

        assert result.termination_reason == TerminationReason.NATURAL

    def test_agent_loop_without_tool_call_id_uses_fallback_assistant_message(self):
        """When no assistant_message in action, the fallback [called: ...] string is used."""
        captured: list[list[dict]] = []
        call_count = 0
        tool = _noop_tool("Echo2")

        def fake_cwt(messages, tools):
            nonlocal call_count
            captured.append(list(messages))
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "Echo2", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = fake_cwt
        mock_repo = _stub_agent_repo()

        config = AgentLoopConfig(
            agent_run_id="run-fallback",
            student_id="student-fb",
            system_prompt="system",
            user_message="user",
            tools=[tool],
            max_steps=20,
            max_tool_calls=10,
            timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", mock_repo):
            run_agent_loop(config)

        second_call_msgs = captured[1]
        asst_msgs = [m for m in second_call_msgs if m.get("role") == "assistant"]
        assert any("[called:" in m.get("content", "") for m in asst_msgs)
