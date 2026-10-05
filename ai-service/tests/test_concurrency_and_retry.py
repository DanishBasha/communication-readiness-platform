"""
Regression tests for concurrent multi-user execution and 429 rate-limit retry.

Covers:
  1. Provider retries on 429 and succeeds on the next attempt
  2. Provider respects "try again in Xs" from the Groq error message
  3. Provider raises after _MAX_RATE_LIMIT_RETRIES exhausted
  4. chat_complete also retries on 429
  5. Two concurrent agent loops keep their message histories fully isolated
  6. Two concurrent agent loops keep their student IDs isolated
  7. Two concurrent agent loops produce independent tool_results dicts
"""
from __future__ import annotations

import json
import threading
import time
from typing import Any
from unittest.mock import MagicMock, call, patch

import pytest

from app.services.providers import OpenAICompatibleProvider, _MAX_RATE_LIMIT_RETRIES
from app.agents.agent_loop import run_agent_loop
from app.agents.state import AgentLoopConfig, TerminationReason
from app.tools.base import ToolContext, ToolDefinition, ToolResult


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _make_rate_limit_error(wait_s: float | None = None) -> Exception:
    msg = "Error code: 429 - rate_limit_exceeded"
    if wait_s is not None:
        msg += f" Please try again in {wait_s}s."
    return Exception(msg)


def _make_resp(content: str = "ok"):
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = []
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _provider() -> OpenAICompatibleProvider:
    p = OpenAICompatibleProvider.__new__(OpenAICompatibleProvider)
    p._model = "test-model"
    return p


def _noop_tool(tool_name: str) -> ToolDefinition:
    class _T(ToolDefinition):
        name = tool_name
        description = tool_name
        input_schema: dict = {}
        requires_student_scope = False

        def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
            return ToolResult(success=True, data={"tool": tool_name, "student": ctx.student_id})

    return _T()


def _stub_repo():
    r = MagicMock()
    r.upsert_completed_step.return_value = None
    r.insert_running_tool_step.return_value = None
    r.update_tool_step.return_value = None
    return r


# ══════════════════════════════════════════════════════════════════════════════
# 1–4: 429 retry behaviour in OpenAICompatibleProvider
# ══════════════════════════════════════════════════════════════════════════════

class TestRateLimitRetry:

    def test_chat_complete_with_tools_retries_on_429_and_succeeds(self):
        """Provider must retry after 429 and return the successful response."""
        p = _provider()
        call_count = 0

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise _make_rate_limit_error(wait_s=0.01)
            return _make_resp("done")

        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = side_effect

        with patch("app.services.providers.time") as mock_time:
            mock_time.sleep = MagicMock()
            result = p.chat_complete_with_tools([], [])

        assert result["type"] == "final_answer"
        assert call_count == 2
        mock_time.sleep.assert_called_once()

    def test_retry_uses_groq_suggested_wait_time(self):
        """Retry delay must be parsed from "try again in Xs" in the error message."""
        p = _provider()
        call_count = 0

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise _make_rate_limit_error(wait_s=11.325)
            return _make_resp("done")

        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = side_effect

        waited: list[float] = []
        with patch("app.services.providers.time") as mock_time:
            mock_time.sleep.side_effect = lambda s: waited.append(s)
            p.chat_complete_with_tools([], [])

        assert len(waited) == 1
        # Should be 11.325 + 1.0 buffer = 12.325
        assert abs(waited[0] - 12.325) < 0.01

    def test_raises_after_max_retries_exceeded(self):
        """After _MAX_RATE_LIMIT_RETRIES retries, the exception must propagate."""
        p = _provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = _make_rate_limit_error(wait_s=0.01)

        with patch("app.services.providers.time") as mock_time:
            mock_time.sleep = MagicMock()
            with pytest.raises(Exception, match="429"):
                p.chat_complete_with_tools([], [])

        assert p._client.chat.completions.create.call_count == _MAX_RATE_LIMIT_RETRIES + 1

    def test_chat_complete_also_retries_on_429(self):
        """chat_complete (used by DraftLearningPlanTool) must also retry on 429."""
        p = _provider()
        call_count = 0

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise _make_rate_limit_error(wait_s=0.01)
            return _make_resp("json_result")

        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = side_effect

        with patch("app.services.providers.time") as mock_time:
            mock_time.sleep = MagicMock()
            result = p.chat_complete([])

        assert result == "json_result"
        assert call_count == 2

    def test_non_rate_limit_exception_propagates_immediately(self):
        """Non-429 errors must not be retried."""
        p = _provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = ValueError("model not found")

        with pytest.raises(ValueError, match="model not found"):
            p.chat_complete_with_tools([], [])

        assert p._client.chat.completions.create.call_count == 1


# ══════════════════════════════════════════════════════════════════════════════
# 5–7: Concurrent agent loop isolation
# ══════════════════════════════════════════════════════════════════════════════

class TestConcurrentAgentIsolation:
    """
    Run Alice and Charlie's agent loops concurrently in two threads.
    Verify that each loop keeps its own message history, student ID, and tool results.
    """

    def _make_llm(self, student_id: str, tool_name: str) -> MagicMock:
        """
        LLM that emits: tool_call(tool_name) then final_answer.
        Records the student_id it sees inside the messages on each call.
        """
        seen_student_ids: list[str] = []
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            # Extract student_id from system message
            for m in messages:
                if m.get("role") == "system":
                    seen_student_ids.append(m.get("content", ""))
            call_count += 1
            if call_count == 1:
                return {
                    "type": "tool_call",
                    "tool_name": tool_name,
                    "tool_args": {},
                }
            return {"type": "final_answer", "content": "done"}

        llm = MagicMock()
        llm.chat_complete_with_tools.side_effect = cwt
        llm._seen = seen_student_ids
        llm._provider = MagicMock()
        llm._provider._last_usage = {}
        return llm

    def _run_loop(self, student_id: str, tool: ToolDefinition, results: dict, errors: dict) -> None:
        """Thread target — agent_repository must be patched by the caller; only LLM is
        patched here because get_llm_client() is called exactly once per run, so the
        patch is safe to restore as soon as the function returns."""
        mock_llm = self._make_llm(student_id, tool.name)
        config = AgentLoopConfig(
            agent_run_id=f"run-{student_id}",
            student_id=student_id,
            system_prompt=f"agent for {student_id}",
            user_message="create plan",
            tools=[tool],
            max_steps=20,
            max_tool_calls=10,
            timeout_seconds=30,
        )
        try:
            with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm):
                result = run_agent_loop(config)
                results[student_id] = result
        except Exception as exc:
            errors[student_id] = exc

    def test_concurrent_runs_complete_independently(self):
        """Both Alice and Charlie loops must complete with NATURAL termination."""
        tool_a = _noop_tool("EchoAlice")
        tool_c = _noop_tool("EchoCharlie")
        results: dict = {}
        errors: dict = {}

        with patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            t1 = threading.Thread(target=self._run_loop, args=("alice-001", tool_a, results, errors))
            t2 = threading.Thread(target=self._run_loop, args=("charlie-002", tool_c, results, errors))
            t1.start(); t2.start()
            t1.join(timeout=10); t2.join(timeout=10)

        assert not errors, f"Errors: {errors}"
        assert results["alice-001"].termination_reason == TerminationReason.NATURAL
        assert results["charlie-002"].termination_reason == TerminationReason.NATURAL

    def test_tool_results_are_isolated_per_student(self):
        """Alice's tool_results must only contain Alice's data; Charlie's must be separate."""
        tool_a = _noop_tool("EchoAlice")
        tool_c = _noop_tool("EchoCharlie")
        results: dict = {}
        errors: dict = {}

        with patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            t1 = threading.Thread(target=self._run_loop, args=("alice-001", tool_a, results, errors))
            t2 = threading.Thread(target=self._run_loop, args=("charlie-002", tool_c, results, errors))
            t1.start(); t2.start()
            t1.join(timeout=10); t2.join(timeout=10)

        assert not errors, f"Errors: {errors}"
        alice_tools = results["alice-001"].tool_results
        charlie_tools = results["charlie-002"].tool_results

        assert "EchoAlice" in alice_tools
        assert "EchoCharlie" not in alice_tools
        assert "EchoCharlie" in charlie_tools
        assert "EchoAlice" not in charlie_tools

    def test_tool_context_student_ids_are_isolated(self):
        """Each tool execution must receive its own student_id in the ToolContext."""
        captured: dict[str, list[str]] = {"alice-001": [], "charlie-002": []}

        def _make_capturing_tool(tool_name: str, student_key: str) -> ToolDefinition:
            class _Cap(ToolDefinition):
                name = tool_name
                description = tool_name
                input_schema: dict = {}
                requires_student_scope = False

                def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
                    captured[student_key].append(ctx.student_id)
                    return ToolResult(success=True, data={"done": True})

            return _Cap()

        tool_a = _make_capturing_tool("CapAlice", "alice-001")
        tool_c = _make_capturing_tool("CapCharlie", "charlie-002")
        results: dict = {}
        errors: dict = {}

        with patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            t1 = threading.Thread(target=self._run_loop, args=("alice-001", tool_a, results, errors))
            t2 = threading.Thread(target=self._run_loop, args=("charlie-002", tool_c, results, errors))
            t1.start(); t2.start()
            t1.join(timeout=10); t2.join(timeout=10)

        assert not errors, f"Errors: {errors}"
        assert all(sid == "alice-001" for sid in captured["alice-001"])
        assert all(sid == "charlie-002" for sid in captured["charlie-002"])
        assert captured["alice-001"], "Alice's tool must have been called"
        assert captured["charlie-002"], "Charlie's tool must have been called"


# ══════════════════════════════════════════════════════════════════════════════
# 8–12: LLM error diagnostics — logging and DB field population
# ══════════════════════════════════════════════════════════════════════════════

class TestLLMErrorDiagnostics:
    """Verify that LLM failures produce visible diagnostic output in Docker logs
    and store the exception type in the agent_steps output field."""

    # ── provider-level logging ────────────────────────────────────────────────

    def test_provider_logs_non_rate_limit_failure_before_raising(self, capsys):
        """Provider must print exc_type and exc before re-raising a non-429 error."""
        p = _provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = ValueError("model not found")

        with pytest.raises(ValueError):
            p.chat_complete_with_tools([], [])

        out = capsys.readouterr().out
        assert "[providers]" in out
        assert "ValueError" in out
        assert "model not found" in out

    def test_provider_chat_complete_logs_non_rate_limit_failure(self, capsys):
        """chat_complete must also print before raising on non-429 errors."""
        p = _provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = ConnectionError("network down")

        with pytest.raises(ConnectionError):
            p.chat_complete([])

        out = capsys.readouterr().out
        assert "[providers]" in out
        assert "ConnectionError" in out
        assert "network down" in out

    def test_provider_logs_after_retries_exhausted(self, capsys):
        """Provider must print before raising when rate-limit retries are exhausted."""
        p = _provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = _make_rate_limit_error(wait_s=0.01)

        with patch("app.services.providers.time") as mock_time:
            mock_time.sleep = MagicMock()
            with pytest.raises(Exception, match="429"):
                p.chat_complete_with_tools([], [])

        out = capsys.readouterr().out
        assert "[providers]" in out
        assert "chat_complete_with_tools FAILED" in out

    def test_provider_logs_request_on_success(self, capsys):
        """Provider emits a [providers] request line on every successful call."""
        p = _provider()
        p._client = MagicMock()
        p._client.chat.completions.create.return_value = _make_resp("all good")

        p.chat_complete_with_tools([], [])

        out = capsys.readouterr().out
        assert "[providers] request" in out
        assert "call=chat_complete_with_tools" in out
        assert "attempt=1" in out

    # ── agent_loop-level logging and DB storage ───────────────────────────────

    def _run_loop_with_failing_llm(self, exc: Exception):
        """Run agent loop with an LLM that raises exc; return (result, mock_repo)."""
        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = exc
        mock_repo = _stub_repo()
        config = AgentLoopConfig(
            agent_run_id="run-diag-001",
            student_id="student-abc",
            system_prompt="test",
            user_message="go",
            tools=[],
            max_steps=10,
            max_tool_calls=10,
            timeout_seconds=30,
        )
        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", mock_repo):
            result = run_agent_loop(config)
        return result, mock_repo

    def test_agent_loop_prints_llm_error_to_stdout(self, capsys):
        """agent_loop must print the exc_type and run ID when LLM raises."""
        result, _ = self._run_loop_with_failing_llm(RuntimeError("context too long"))

        assert result.termination_reason == TerminationReason.LLM_ERROR
        out = capsys.readouterr().out
        assert "[agent_loop] LLM_ERROR" in out
        assert "RuntimeError" in out
        assert "context too long" in out
        assert "run-diag-001" in out

    def test_agent_loop_stores_exc_type_in_output_field(self):
        """agent_loop must store exc_type in the output JSON (was None before fix)."""
        _, mock_repo = self._run_loop_with_failing_llm(ValueError("bad request"))

        call_args = mock_repo.upsert_completed_step.call_args
        # upsert_completed_step(run_id, seq, type, tool_name, input, output, status, error_code, error_message, duration_ms)
        output_arg = call_args.args[5]  # 6th positional arg = output
        assert output_arg is not None, "output must not be None on LLM failure"
        parsed = json.loads(output_arg)
        assert parsed["exc_type"] == "ValueError"
        assert "bad request" in parsed["exc_repr"]

    def test_agent_loop_stores_exc_type_in_input_field(self):
        """agent_loop must include exc_type in the input JSON alongside msgCount."""
        _, mock_repo = self._run_loop_with_failing_llm(TypeError("wrong type"))

        call_args = mock_repo.upsert_completed_step.call_args
        input_arg = call_args.args[4]  # 5th positional arg = input
        parsed = json.loads(input_arg)
        assert "msgCount" in parsed
        assert parsed["exc_type"] == "TypeError"

    def test_agent_loop_error_code_stays_llm_error(self):
        """error_code must remain 'LLM_ERROR' so downstream checks are unaffected."""
        _, mock_repo = self._run_loop_with_failing_llm(Exception("unknown failure"))

        call_args = mock_repo.upsert_completed_step.call_args
        error_code = call_args.args[7]  # 8th positional arg = error_code
        assert error_code == "LLM_ERROR"

    def test_agent_loop_error_message_contains_str_of_exception(self):
        """error_message must still carry str(e) for DB diagnostics."""
        _, mock_repo = self._run_loop_with_failing_llm(Exception("groq 400 bad payload"))

        call_args = mock_repo.upsert_completed_step.call_args
        error_message = call_args.args[8]  # 9th positional arg = error_message
        assert "groq 400 bad payload" in error_message


# ══════════════════════════════════════════════════════════════════════════════
# 13–18: Agent loop diagnostic logging — LLM/tool start-done, TIMEOUT, not-found
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentLoopDiagnosticLogging:
    """Verify the per-step diagnostic logging added to run_agent_loop."""

    def _make_two_step_loop(self) -> tuple:
        """
        Build an (llm_mock, repo_mock, config) for a loop that:
        - LLM call 1: decides EchoTool
        - EchoTool: succeeds
        - LLM call 2: final_answer
        """
        tool = _noop_tool("EchoTool")
        mock_repo = _stub_repo()
        call_count = 0

        def llm_side_effect(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "EchoTool", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = llm_side_effect

        config = AgentLoopConfig(
            agent_run_id="run-log-001",
            student_id="student-log",
            system_prompt="test",
            user_message="go",
            tools=[tool],
            max_steps=10,
            max_tool_calls=10,
            timeout_seconds=30,
        )
        return mock_llm, mock_repo, config

    def _run(self, mock_llm, mock_repo, config):
        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", mock_repo):
            return run_agent_loop(config)

    def test_llm_start_logged_for_each_call(self, capsys):
        """[agent_loop] LLM_start must appear for each LLM invocation."""
        mock_llm, mock_repo, config = self._make_two_step_loop()
        self._run(mock_llm, mock_repo, config)

        out = capsys.readouterr().out
        assert out.count("[agent_loop] LLM_start") == 2
        assert "run-log-001" in out
        assert "seq=1" in out
        assert "seq=2" in out

    def test_llm_done_logged_with_decided_tool(self, capsys):
        """[agent_loop] LLM_done must include the decided tool name."""
        mock_llm, mock_repo, config = self._make_two_step_loop()
        self._run(mock_llm, mock_repo, config)

        out = capsys.readouterr().out
        assert "[agent_loop] LLM_done" in out
        assert "decided=EchoTool" in out

    def test_llm_done_logged_with_final_answer(self, capsys):
        """[agent_loop] LLM_done must show decided=final_answer on natural completion."""
        mock_llm, mock_repo, config = self._make_two_step_loop()
        self._run(mock_llm, mock_repo, config)

        out = capsys.readouterr().out
        assert "decided=final_answer" in out

    def test_tool_start_logged_with_tool_name(self, capsys):
        """[agent_loop] tool_start must appear with the correct tool name."""
        mock_llm, mock_repo, config = self._make_two_step_loop()
        self._run(mock_llm, mock_repo, config)

        out = capsys.readouterr().out
        assert "[agent_loop] tool_start" in out
        assert "tool=EchoTool" in out

    def test_tool_done_logged_with_success(self, capsys):
        """[agent_loop] tool_done must appear with success=True after a successful call."""
        mock_llm, mock_repo, config = self._make_two_step_loop()
        self._run(mock_llm, mock_repo, config)

        out = capsys.readouterr().out
        assert "[agent_loop] tool_done" in out
        assert "success=True" in out

    def test_timeout_logged_when_deadline_exceeded(self, capsys):
        """[agent_loop] TIMEOUT must appear in stdout when deadline fires."""
        mock_llm = MagicMock()
        mock_repo = _stub_repo()
        # Empty tool list — LLM says "call SlowTool" which isn't found → loop iterates
        # rapidly until deadline fires.
        mock_llm.chat_complete_with_tools.return_value = {
            "type": "tool_call", "tool_name": "SlowTool", "tool_args": {}
        }
        config = AgentLoopConfig(
            agent_run_id="run-timeout-log",
            student_id="student-t",
            system_prompt="test",
            user_message="go",
            tools=[],
            max_steps=100,
            max_tool_calls=100,
            timeout_seconds=0.001,  # expires immediately
        )
        result = self._run(mock_llm, mock_repo, config)

        assert result.termination_reason == TerminationReason.TIMEOUT
        out = capsys.readouterr().out
        assert "[agent_loop] TIMEOUT" in out
        assert "run-timeout-log" in out

    def test_tool_not_found_logged(self, capsys):
        """[agent_loop] tool_not_found must appear when LLM requests a missing tool."""
        mock_repo = _stub_repo()
        call_count = 0

        def llm_side_effect(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "GhostTool", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = llm_side_effect

        config = AgentLoopConfig(
            agent_run_id="run-notfound-log",
            student_id="student-nf",
            system_prompt="test",
            user_message="go",
            tools=[],  # GhostTool not present
            max_steps=10,
            max_tool_calls=10,
            timeout_seconds=30,
        )
        self._run(mock_llm, mock_repo, config)

        out = capsys.readouterr().out
        assert "[agent_loop] tool_not_found" in out
        assert "GhostTool" in out
        assert "run-notfound-log" in out


# ══════════════════════════════════════════════════════════════════════════════
# 25–33: agent_runner diagnostic logging — boundary prints at each stage
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentRunnerLogging:
    """Verify execute_agent_run emits diagnostic prints at each execution boundary."""

    from app.agents.agent_runner import execute_agent_run as _execute  # imported at class level for patching

    def _stub_run(self, status: str = "QUEUED") -> dict:
        return {
            "id": "run-ar-001",
            "status": status,
            "student_id": "student-ar",
            "goal_snapshot": "Pass tech interviews",
            "triggered_by_user_id": None,
        }

    def _make_repo(
        self,
        run_data: dict | None,
        spec_def_data: dict | None = None,
        cas_result: bool = True,
    ) -> MagicMock:
        repo = MagicMock()
        repo.load_run.return_value = run_data
        repo.load_specialist_def.return_value = spec_def_data or {"id": "spec-1", "max_steps": 12}
        repo.cas_start_run.return_value = cas_result
        repo.update_run_status.return_value = None
        return repo

    def _run(self, repo: MagicMock, supervisor_side_effect: Any = None) -> str:
        from app.agents import agent_runner
        import io, contextlib
        buf = io.StringIO()
        mock_sup = MagicMock()
        if supervisor_side_effect is not None:
            mock_sup.side_effect = supervisor_side_effect
        with patch("app.agents.agent_runner.agent_repository", repo), \
             patch("app.agents.agent_runner.run_supervisor_agent", mock_sup), \
             contextlib.redirect_stdout(buf):
            agent_runner.execute_agent_run("run-ar-001")
        return buf.getvalue()

    def test_logs_start(self):
        """execute_agent_run must log [agent_runner] start immediately."""
        out = self._run(self._make_repo(self._stub_run()))
        assert "[agent_runner] start run=run-ar-001" in out

    def test_logs_load_run_found(self):
        """Must log load_run done with found=True when the run exists."""
        out = self._run(self._make_repo(self._stub_run()))
        assert "[agent_runner] load_run done" in out
        assert "found=True" in out

    def test_logs_load_run_not_found(self):
        """Must log load_run done with found=False when the run is absent."""
        out = self._run(self._make_repo(None))
        assert "[agent_runner] load_run done" in out
        assert "found=False" in out

    def test_logs_skip_when_not_queued(self):
        """Must log a skip message and stop when run.status != QUEUED."""
        out = self._run(self._make_repo(self._stub_run(status="RUNNING")))
        assert "[agent_runner] skip" in out
        assert "RUNNING" in out
        assert "[agent_runner] calling supervisor" not in out

    def test_logs_specialist_def_loaded(self):
        """Must log specialist_def loaded with found=True."""
        out = self._run(self._make_repo(self._stub_run()))
        assert "[agent_runner] specialist_def loaded" in out
        assert "found=True" in out

    def test_logs_cas_start_run_result(self):
        """Must log cas_start_run result."""
        out = self._run(self._make_repo(self._stub_run()))
        assert "[agent_runner] cas_start_run result=True" in out

    def test_logs_calling_supervisor(self):
        """Must log 'calling supervisor' before delegating."""
        out = self._run(self._make_repo(self._stub_run()))
        assert "[agent_runner] calling supervisor" in out
        assert "student=student-ar" in out

    def test_logs_succeeded_on_normal_completion(self):
        """Must log SUCCEEDED when run_supervisor_agent returns normally."""
        out = self._run(self._make_repo(self._stub_run()))
        assert "[agent_runner] SUCCEEDED run=run-ar-001" in out

    def test_logs_failed_with_exc_type_on_exception(self):
        """Must log FAILED with exc_type when run_supervisor_agent raises."""
        out = self._run(
            self._make_repo(self._stub_run()),
            supervisor_side_effect=RuntimeError("specialist timed out"),
        )
        assert "[agent_runner] FAILED" in out
        assert "RuntimeError" in out
        assert "[agent_runner] SUCCEEDED" not in out
