"""
Tests for the Phase 2–10 optimizations of the Module 3 agent loop.

Covers:
  - AgentMetrics dataclass
  - ToolResult context_summary and cache_hit fields
  - ToolDefinition is_terminal field
  - Provider _last_usage and _is_tpd_exhausted
  - TPD error raises immediately (no retry)
  - CacheKeys.web_resources
  - config.module3_web_cache_ttl
  - Tool compact context_summary values
  - WebSearch Redis caching (hit / miss / cache_hit flag)
  - DraftLearningPlanTool context collection (is_terminal, no LLM)
  - Agent loop: dedup, terminal tool, compact context, metrics accumulation
  - Specialist agent: post-loop generation, metrics print, [agent_metrics] log
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, call, patch

import pytest

from app.agents.state import AgentLoopConfig, AgentLoopResult, AgentMetrics, TerminationReason
from app.agents.agent_loop import run_agent_loop
from app.cache.cache_keys import CacheKeys
from app.config import settings
from app.services.providers import OpenAICompatibleProvider, _MAX_RATE_LIMIT_RETRIES
from app.tools.base import ToolContext, ToolDefinition, ToolResult
from app.tools.learning_plan import DraftLearningPlanTool


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _ctx(student_id: str = "s1", run_id: str = "run-1") -> ToolContext:
    return ToolContext(student_id=student_id, agent_run_id=run_id)


def _stub_repo():
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
                success=True, data={"tool": tool_name, "student": ctx.student_id},
                context_summary=f"ok_{tool_name}",
            )

    return _T()


def _make_provider() -> OpenAICompatibleProvider:
    p = OpenAICompatibleProvider.__new__(OpenAICompatibleProvider)
    p._model = "test-model"
    p._last_usage = {}
    return p


def _make_resp(content: str = "ok"):
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = []
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    resp.usage = None
    return resp


# ══════════════════════════════════════════════════════════════════════════════
# AgentMetrics dataclass
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentMetrics:

    def test_default_values(self):
        m = AgentMetrics()
        assert m.llm_calls == 0
        assert m.input_tokens == 0
        assert m.output_tokens == 0
        assert m.total_tokens == 0
        assert m.retry_count == 0
        assert m.cache_hits == 0
        assert m.cache_misses == 0

    def test_accumulation(self):
        m = AgentMetrics()
        m.llm_calls += 2
        m.input_tokens += 500
        m.output_tokens += 100
        m.total_tokens += 600
        assert m.llm_calls == 2
        assert m.total_tokens == 600

    def test_agent_loop_result_has_metrics(self):
        r = AgentLoopResult()
        assert isinstance(r.metrics, AgentMetrics)


# ══════════════════════════════════════════════════════════════════════════════
# ToolResult and ToolDefinition new fields
# ══════════════════════════════════════════════════════════════════════════════

class TestToolResultFields:

    def test_context_summary_defaults_none(self):
        r = ToolResult(success=True)
        assert r.context_summary is None

    def test_context_summary_set(self):
        r = ToolResult(success=True, context_summary="ok. 3 docs")
        assert r.context_summary == "ok. 3 docs"

    def test_cache_hit_defaults_none(self):
        r = ToolResult(success=True)
        assert r.cache_hit is None

    def test_cache_hit_true(self):
        r = ToolResult(success=True, cache_hit=True)
        assert r.cache_hit is True

    def test_cache_hit_false(self):
        r = ToolResult(success=True, cache_hit=False)
        assert r.cache_hit is False


class TestToolDefinitionIsTerminal:

    def test_default_is_false(self):
        class _T(ToolDefinition):
            name = "T"
            description = "T"
            input_schema: dict = {}
            def execute(self, args, ctx): ...

        assert _T.is_terminal is False

    def test_draft_learning_plan_is_terminal(self):
        assert DraftLearningPlanTool.is_terminal is True


# ══════════════════════════════════════════════════════════════════════════════
# Provider _last_usage
# ══════════════════════════════════════════════════════════════════════════════

class TestProviderLastUsage:

    def test_last_usage_initialized_empty(self):
        p = _make_provider()
        assert p._last_usage == {}

    def test_last_usage_updated_after_chat_complete(self):
        p = _make_provider()
        resp = _make_resp("result")
        usage = MagicMock()
        usage.prompt_tokens = 100
        usage.completion_tokens = 50
        usage.total_tokens = 150
        resp.usage = usage
        p._client = MagicMock()
        p._client.chat.completions.create.return_value = resp

        p.chat_complete([{"role": "user", "content": "hi"}])

        assert p._last_usage["input"] == 100
        assert p._last_usage["output"] == 50
        assert p._last_usage["total"] == 150
        assert p._last_usage["attempts"] == 1

    def test_last_usage_updated_after_chat_complete_with_tools(self):
        p = _make_provider()
        resp = _make_resp("result")
        usage = MagicMock()
        usage.prompt_tokens = 200
        usage.completion_tokens = 80
        usage.total_tokens = 280
        resp.usage = usage
        p._client = MagicMock()
        p._client.chat.completions.create.return_value = resp

        p.chat_complete_with_tools([], [])

        assert p._last_usage["input"] == 200
        assert p._last_usage["output"] == 80
        assert p._last_usage["total"] == 280

    def test_last_usage_none_usage_defaults_to_zero(self):
        p = _make_provider()
        resp = _make_resp("ok")
        resp.usage = None
        p._client = MagicMock()
        p._client.chat.completions.create.return_value = resp

        p.chat_complete([])

        assert p._last_usage["input"] == 0
        assert p._last_usage["output"] == 0
        assert p._last_usage["total"] == 0


# ══════════════════════════════════════════════════════════════════════════════
# Provider TPD exhaustion — no retry
# ══════════════════════════════════════════════════════════════════════════════

class TestTPDExhaustion:

    def _tpd_error(self, phrase: str) -> Exception:
        return Exception(f"429 - rate_limit: {phrase}")

    def test_is_tpd_exhausted_detects_tokens_per_day(self):
        p = _make_provider()
        assert p._is_tpd_exhausted(Exception("tokens per day limit exceeded")) is True

    def test_is_tpd_exhausted_detects_tpd(self):
        p = _make_provider()
        assert p._is_tpd_exhausted(Exception("TPD limit reached")) is True

    def test_is_tpd_exhausted_detects_daily_token_limit(self):
        p = _make_provider()
        assert p._is_tpd_exhausted(Exception("daily token limit exhausted")) is True

    def test_is_tpd_exhausted_detects_daily_limit(self):
        p = _make_provider()
        assert p._is_tpd_exhausted(Exception("daily limit reached")) is True

    def test_is_tpd_exhausted_false_for_regular_429(self):
        p = _make_provider()
        assert p._is_tpd_exhausted(Exception("429 rate limit per minute")) is False

    def test_tpd_error_raises_without_retry_chat_complete(self):
        """chat_complete must raise immediately on TPD (no sleep/retry)."""
        p = _make_provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = Exception(
            "429 - tokens per day limit exceeded"
        )

        with patch("app.services.providers.time") as mock_time:
            with pytest.raises(Exception, match="tokens per day"):
                p.chat_complete([])

        mock_time.sleep.assert_not_called()
        assert p._client.chat.completions.create.call_count == 1

    def test_tpd_error_raises_without_retry_chat_complete_with_tools(self):
        """chat_complete_with_tools must raise immediately on TPD."""
        p = _make_provider()
        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = Exception(
            "429 - tokens per day limit exceeded"
        )

        with patch("app.services.providers.time") as mock_time:
            with pytest.raises(Exception, match="tokens per day"):
                p.chat_complete_with_tools([], [])

        mock_time.sleep.assert_not_called()
        assert p._client.chat.completions.create.call_count == 1

    def test_non_tpd_429_still_retries(self):
        """Per-minute 429 must still retry."""
        p = _make_provider()
        call_count = 0

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("429 rate limit per minute please try again in 2s")
            return _make_resp("ok")

        p._client = MagicMock()
        p._client.chat.completions.create.side_effect = side_effect

        with patch("app.services.providers.time") as mock_time:
            mock_time.sleep = MagicMock()
            p.chat_complete_with_tools([], [])

        assert call_count == 2
        mock_time.sleep.assert_called_once()


# ══════════════════════════════════════════════════════════════════════════════
# CacheKeys.web_resources
# ══════════════════════════════════════════════════════════════════════════════

class TestCacheKeysWebResources:

    def test_web_resources_key_format(self):
        key = CacheKeys.web_resources("leadership|teamwork")
        assert key == "module3:v1:web_resources:leadership|teamwork"

    def test_web_resources_key_prefix(self):
        key = CacheKeys.web_resources("conflict resolution")
        assert key.startswith("module3:v1:")

    def test_web_resources_key_contains_sig(self):
        sig = "communication|technical"
        key = CacheKeys.web_resources(sig)
        assert sig in key


# ══════════════════════════════════════════════════════════════════════════════
# config.module3_web_cache_ttl
# ══════════════════════════════════════════════════════════════════════════════

class TestConfig:

    def test_module3_web_cache_ttl_exists(self):
        assert hasattr(settings, "module3_web_cache_ttl")

    def test_module3_web_cache_ttl_positive(self):
        assert settings.module3_web_cache_ttl > 0

    def test_module3_web_cache_ttl_default(self):
        assert settings.module3_web_cache_ttl == 3600


# ══════════════════════════════════════════════════════════════════════════════
# WebSearch Redis caching
# ══════════════════════════════════════════════════════════════════════════════

class TestWebSearchCaching:

    def _tool(self):
        from app.tools.web_search import SearchWebResourcesTool
        return SearchWebResourcesTool()

    def test_skill_signature_sorted(self):
        from app.tools.web_search import _skill_signature
        sig = _skill_signature(["teamwork", "Leadership", "communication"])
        assert sig == "communication|leadership|teamwork"

    def test_skill_signature_empty(self):
        from app.tools.web_search import _skill_signature
        assert _skill_signature([]) == ""

    def test_skill_signature_single(self):
        from app.tools.web_search import _skill_signature
        assert _skill_signature(["Leadership"]) == "leadership"

    def test_cache_hit_returns_cached_data(self):
        """When Redis has a hit, execute() returns cached data without searching."""
        cached_data = {
            "skills": ["leadership"],
            "query": "leadership interview",
            "webResources": [{"type": "WEB", "title": "T", "url": "https://x.com", "source": "x.com", "snippet": ""}],
            "totalFound": 1,
        }
        import app.tools.web_search as ws
        with patch("app.tools.web_search.cache_get", return_value=cached_data) as mock_get, \
             patch("app.tools.web_search.cache_set") as mock_set, \
             patch.object(ws, "DDGS", None):
            tool = self._tool()
            result = tool.execute(
                {"query": "leadership interview", "skills": ["leadership"]}, _ctx()
            )

        assert result.success
        assert result.data == cached_data
        assert result.cache_hit is True
        mock_set.assert_not_called()

    def test_cache_miss_writes_to_cache(self):
        """On cache miss, execute() searches and writes results to cache."""
        import app.tools.web_search as ws
        fake_rows = [{"title": "T", "href": "https://example.com/t", "body": "Body"}]
        ddgs_instance = MagicMock()
        ddgs_instance.text.return_value = iter(fake_rows)
        ddgs_instance.__enter__ = MagicMock(return_value=ddgs_instance)
        ddgs_instance.__exit__ = MagicMock(return_value=False)
        ddgs_class = MagicMock(return_value=ddgs_instance)

        with patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set") as mock_set, \
             patch.object(ws, "DDGS", ddgs_class):
            tool = self._tool()
            result = tool.execute(
                {"query": "leadership", "skills": ["leadership"], "include_youtube": False},
                _ctx(),
            )

        assert result.success
        assert result.cache_hit is False
        mock_set.assert_called_once()

    def test_cache_key_uses_skill_signature(self):
        """Cache lookup must use a query-hash key (12 hex chars), not a skill signature."""
        import app.tools.web_search as ws
        with patch("app.tools.web_search.cache_get", return_value=None) as mock_get, \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws, "DDGS", None):
            self._tool().execute(
                {"query": "q", "skills": ["Teamwork", "Leadership"], "include_youtube": False},
                _ctx(),
            )

        # Resource relevance fix: cache key is now based on query hash, not skill signature.
        mock_get.assert_called_once()
        call_key = mock_get.call_args[0][0]
        # Key format: "module3:v1:web_resources:<12-hex-chars>"
        assert call_key.startswith("module3:v1:web_resources:")
        assert len(call_key.split(":")[-1]) == 12

    def test_no_cache_when_no_skills(self):
        """Without skills, cache is still consulted using the raw query hash."""
        import app.tools.web_search as ws
        with patch("app.tools.web_search.cache_get") as mock_get, \
             patch.object(ws, "DDGS", None):
            self._tool().execute(
                {"query": "q", "include_youtube": False},
                _ctx(),
            )

        # Resource relevance fix: cache IS consulted even without skills (raw query hash).
        mock_get.assert_called_once()

    def test_cache_hit_flag_in_result(self):
        """cache_hit=True must be set on cache-hit results."""
        cached_data = {"webResources": [], "skills": [], "query": "q", "totalFound": 0}
        import app.tools.web_search as ws
        with patch("app.tools.web_search.cache_get", return_value=cached_data):
            result = self._tool().execute(
                {"query": "q", "skills": ["leadership"]}, _ctx()
            )

        assert result.cache_hit is True

    def test_cache_miss_flag_in_result(self):
        """cache_hit=False must be set on cache-miss results."""
        import app.tools.web_search as ws
        with patch("app.tools.web_search.cache_get", return_value=None), \
             patch("app.tools.web_search.cache_set"), \
             patch.object(ws, "DDGS", None):
            result = self._tool().execute(
                {"query": "q", "skills": ["leadership"], "include_youtube": False},
                _ctx(),
            )

        assert result.cache_hit is False


# ══════════════════════════════════════════════════════════════════════════════
# Agent loop: dedup
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentLoopDedup:

    def test_duplicate_tool_call_is_skipped(self, capsys):
        """If LLM tries to call a tool that already succeeded, loop skips re-execution."""
        tool = _noop_tool("Echo")
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "Echo", "tool_args": {}}
            if call_count == 2:
                # Try to call the same tool again — should be deduped
                return {"type": "tool_call", "tool_name": "Echo", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = cwt
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        config = AgentLoopConfig(
            agent_run_id="run-dedup", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        out = capsys.readouterr().out
        assert "tool_dedup" in out
        assert "already executed" in out
        assert result.tool_call_count == 1  # only executed once despite 2 LLM requests

    def test_dedup_does_not_run_tool_twice(self):
        """The tool execute() method must be called only once even if LLM requests it twice."""
        execution_count = 0

        class _CountingTool(ToolDefinition):
            name = "CountTool"
            description = "counting tool"
            input_schema: dict = {}
            requires_student_scope = False

            def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
                nonlocal execution_count
                execution_count += 1
                return ToolResult(success=True, data={"count": execution_count})

        tool = _CountingTool()
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                return {"type": "tool_call", "tool_name": "CountTool", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = cwt
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        config = AgentLoopConfig(
            agent_run_id="run-dedup2", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            run_agent_loop(config)

        assert execution_count == 1


# ══════════════════════════════════════════════════════════════════════════════
# Agent loop: terminal tool exits immediately
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentLoopTerminalTool:

    def test_terminal_tool_exits_without_final_answer_call(self, capsys):
        """After a terminal tool succeeds, the loop must exit without another LLM call."""
        tool = _noop_tool("TermTool", terminal=True)
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "TermTool", "tool_args": {}}
            # This should NEVER be called
            return {"type": "final_answer", "content": "should not reach"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = cwt
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        config = AgentLoopConfig(
            agent_run_id="run-terminal", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        # Only 1 LLM call (the one that decided to call TermTool)
        assert mock_llm.chat_complete_with_tools.call_count == 1
        assert result.termination_reason == TerminationReason.NATURAL
        out = capsys.readouterr().out
        assert "terminal_tool_exit" in out

    def test_terminal_tool_result_is_in_tool_results(self):
        """Terminal tool data must still be in tool_results after exit."""
        tool = _noop_tool("TermTool", terminal=True)

        def cwt(messages, tools):
            return {"type": "tool_call", "tool_name": "TermTool", "tool_args": {}}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.return_value = {"type": "tool_call", "tool_name": "TermTool", "tool_args": {}}
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        config = AgentLoopConfig(
            agent_run_id="run-term-data", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=1, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        assert "TermTool" in result.tool_results


# ══════════════════════════════════════════════════════════════════════════════
# Agent loop: compact context in messages
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentLoopCompactContext:

    def test_compact_summary_used_in_tool_message(self):
        """When a tool returns context_summary, the tool message content must use it."""
        class _SummaryTool(ToolDefinition):
            name = "SummaryTool"
            description = "tool with summary"
            input_schema: dict = {}
            requires_student_scope = False

            def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
                return ToolResult(
                    success=True,
                    data={"full": "large data blob " * 100},
                    context_summary="compact: 5 items",
                )

        tool = _SummaryTool()
        captured_messages: list = []
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            captured_messages.extend(messages)
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "SummaryTool", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = cwt
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        config = AgentLoopConfig(
            agent_run_id="run-compact", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            run_agent_loop(config)

        # Check messages sent to the second LLM call
        tool_msgs = [m for m in captured_messages if m.get("role") == "tool"]
        assert tool_msgs, "Expected at least one tool message"
        tool_msg_content = tool_msgs[-1]["content"]
        assert "compact: 5 items" in tool_msg_content
        assert "large data blob" not in tool_msg_content


# ══════════════════════════════════════════════════════════════════════════════
# Agent loop: metrics accumulation
# ══════════════════════════════════════════════════════════════════════════════

class TestAgentLoopMetrics:

    def test_llm_calls_counted(self):
        """metrics.llm_calls must equal the number of successful LLM calls."""
        tool = _noop_tool("Echo")
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "Echo", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.side_effect = cwt
        mock_provider = MagicMock()
        mock_provider._last_usage = {"input": 100, "output": 50, "total": 150, "attempts": 1}
        mock_llm._provider = mock_provider

        config = AgentLoopConfig(
            agent_run_id="run-metrics", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        assert result.metrics.llm_calls == 2  # one for tool_call, one for final_answer

    def test_tokens_accumulated(self):
        """metrics.total_tokens must accumulate across all LLM calls."""
        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.return_value = {"type": "final_answer", "content": "done"}
        mock_provider = MagicMock()
        mock_provider._last_usage = {"input": 300, "output": 100, "total": 400, "attempts": 1}
        mock_llm._provider = mock_provider

        config = AgentLoopConfig(
            agent_run_id="run-tokens", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        assert result.metrics.total_tokens == 400

    def test_cache_hits_tracked(self):
        """metrics.cache_hits must count tools that returned cache_hit=True."""
        class _CacheHitTool(ToolDefinition):
            name = "CacheTool"
            description = "cached tool"
            input_schema: dict = {}
            requires_student_scope = False

            def execute(self, args: dict, ctx: ToolContext) -> ToolResult:
                return ToolResult(success=True, data={}, cache_hit=True)

        tool = _CacheHitTool()
        mock_llm = MagicMock()
        call_count = 0

        def cwt(messages, tools):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"type": "tool_call", "tool_name": "CacheTool", "tool_args": {}}
            return {"type": "final_answer", "content": "done"}

        mock_llm.chat_complete_with_tools.side_effect = cwt
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        config = AgentLoopConfig(
            agent_run_id="run-cache", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[tool], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        assert result.metrics.cache_hits == 1
        assert result.metrics.cache_misses == 0

    def test_retry_count_tracked(self):
        """metrics.retry_count must increase when attempts > 1."""
        mock_llm = MagicMock()
        mock_llm.chat_complete_with_tools.return_value = {"type": "final_answer", "content": "done"}
        mock_provider = MagicMock()
        # Simulate 2 attempts (1 retry)
        mock_provider._last_usage = {"input": 100, "output": 50, "total": 150, "attempts": 2}
        mock_llm._provider = mock_provider

        config = AgentLoopConfig(
            agent_run_id="run-retry-metric", student_id="s1",
            system_prompt="test", user_message="go",
            tools=[], max_steps=20, max_tool_calls=10, timeout_seconds=30,
        )

        with patch("app.agents.agent_loop.get_llm_client", return_value=mock_llm), \
             patch("app.agents.agent_loop.agent_repository", _stub_repo()):
            result = run_agent_loop(config)

        assert result.metrics.retry_count >= 1


# ══════════════════════════════════════════════════════════════════════════════
# Specialist agent: post-loop generation and metrics print
# ══════════════════════════════════════════════════════════════════════════════

class TestSpecialistAgentGeneration:

    def _make_draft_ctx(self, goal="Improve readiness", weeks=4):
        return {
            "goal": goal,
            "weakSkills": ["Leadership", "Communication"],
            "performanceData": {"overall_score": 60, "trend": "STABLE"},
            "knowledgeDocs": [{"id": "doc-1", "title": "Guide 1", "excerpt": "..."}],
            "webResources": [],
            "durationWeeks": weeks,
            "_ready_for_generation": True,
        }

    def _run_generate_plan(self, draft_ctx, llm_response=None):
        """Run specialist_agent._generate_plan() with a mocked LLM."""
        from app.agents.specialist_agent import _generate_plan

        valid_plan = {
            "goal": draft_ctx["goal"],
            "durationWeeks": draft_ctx["durationWeeks"],
            "focusSkills": draft_ctx["weakSkills"],
            "weeklyPlan": [
                {"week": i + 1, "focus": "Leadership", "skills": [], "activities": [], "resources": []}
                for i in range(draft_ctx["durationWeeks"])
            ],
        }

        mock_llm = MagicMock()
        if llm_response is None:
            mock_llm._call_json.return_value = valid_plan
        else:
            mock_llm._call_json.return_value = llm_response
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {"input": 500, "output": 300, "total": 800, "attempts": 1}

        metrics = AgentMetrics()
        with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_llm):
            plan = _generate_plan(draft_ctx, "student-xyz", "spec-run-1", metrics)
        return plan, metrics, mock_llm

    def test_generate_plan_calls_llm(self):
        """_generate_plan() must call llm._call_json exactly once."""
        plan, metrics, mock_llm = self._run_generate_plan(self._make_draft_ctx())
        mock_llm._call_json.assert_called_once()

    def test_generate_plan_returns_plan_dict(self):
        plan, _, _ = self._run_generate_plan(self._make_draft_ctx())
        assert plan is not None
        assert "weeklyPlan" in plan

    def test_generate_plan_sets_generation_source_llm(self):
        plan, _, _ = self._run_generate_plan(self._make_draft_ctx())
        assert plan["generation_source"] == "LLM"

    def test_generate_plan_uses_fallback_when_llm_fails(self):
        from app.agents.specialist_agent import _generate_plan
        draft_ctx = self._make_draft_ctx()

        mock_llm = MagicMock()
        mock_llm._call_json.side_effect = RuntimeError("LLM unavailable")
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {}

        metrics = AgentMetrics()
        with patch("app.agents.specialist_agent.get_llm_client", return_value=mock_llm):
            plan = _generate_plan(draft_ctx, "s1", "run-1", metrics)

        assert plan is not None
        assert plan["generation_source"] == "FALLBACK"
        assert len(plan["weeklyPlan"]) == draft_ctx["durationWeeks"]

    def test_generate_plan_accumulates_metrics(self):
        """_generate_plan() must add to the metrics (llm_calls, tokens)."""
        _, metrics, _ = self._run_generate_plan(self._make_draft_ctx())
        assert metrics.llm_calls == 1
        assert metrics.total_tokens > 0

    def test_generate_plan_returns_none_when_incomplete(self):
        """If LLM returns fewer weeks than required on every attempt, returns None."""
        draft_ctx = self._make_draft_ctx(weeks=4)
        incomplete_response = {
            "goal": "G", "durationWeeks": 4, "focusSkills": [],
            "weeklyPlan": [{"week": 1, "focus": "X", "activities": [], "resources": []}],
        }
        plan, _, _ = self._run_generate_plan(draft_ctx, llm_response=incomplete_response)
        # Fixed-duration contract: incomplete plan is never persisted
        assert plan is None

    def test_agent_metrics_log_emitted(self, capsys):
        """specialist_agent must print [agent_metrics] after plan generation."""
        from app.agents.specialist_agent import run_specialist_agent

        draft_ctx = self._make_draft_ctx()
        valid_plan = {
            "goal": draft_ctx["goal"],
            "durationWeeks": 4,
            "focusSkills": draft_ctx["weakSkills"],
            "weeklyPlan": [
                {"week": i + 1, "focus": "L", "skills": [], "activities": [], "resources": []}
                for i in range(4)
            ],
        }

        mock_loop_result = AgentLoopResult(
            tool_results={"DraftLearningPlan": draft_ctx},
            step_count=6,
            tool_call_count=5,
            termination_reason=TerminationReason.NATURAL,
            metrics=AgentMetrics(llm_calls=4, total_tokens=3200),
        )

        mock_llm = MagicMock()
        mock_llm._call_json.return_value = valid_plan
        mock_llm._provider = MagicMock()
        mock_llm._provider._last_usage = {"input": 400, "output": 200, "total": 600, "attempts": 1}

        mock_repo = MagicMock()
        mock_repo.create_specialist_run.return_value = "spec-run-123"
        mock_repo.update_run_status.return_value = None

        task = {
            "studentId": "s1",
            "goal": "Improve readiness",
            "supervisorRunId": "sup-1",
        }
        spec_def = {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150}

        with patch("app.agents.specialist_agent.run_agent_loop", return_value=mock_loop_result), \
             patch("app.agents.specialist_agent.get_llm_client", return_value=mock_llm), \
             patch("app.agents.specialist_agent.agent_repository", mock_repo):
            run_specialist_agent(task, spec_def)

        out = capsys.readouterr().out
        assert "[agent_metrics]" in out
        assert "llm_calls=" in out
        assert "total_tokens=" in out

    def test_specialist_uses_fallback_when_no_draft_ctx(self, capsys):
        """When DraftLearningPlan never ran, specialist_agent must still not crash."""
        from app.agents.specialist_agent import run_specialist_agent

        mock_loop_result = AgentLoopResult(
            tool_results={},  # No DraftLearningPlan result
            step_count=2,
            tool_call_count=1,
            termination_reason=TerminationReason.LLM_ERROR,
            metrics=AgentMetrics(),
        )

        mock_repo = MagicMock()
        mock_repo.create_specialist_run.return_value = "spec-run-999"
        mock_repo.update_run_status.return_value = None

        task = {"studentId": "s1", "goal": "G", "supervisorRunId": "sup-1"}
        spec_def = {"id": "spec-1", "max_steps": 12, "max_tool_calls": 8, "timeout_seconds": 150}

        with patch("app.agents.specialist_agent.run_agent_loop", return_value=mock_loop_result), \
             patch("app.agents.specialist_agent.agent_repository", mock_repo):
            result = run_specialist_agent(task, spec_def)

        assert result["draft_plan"] is None
        mock_repo.update_run_status.assert_called_with("spec-run-999", "FAILED", "LLM_ERROR")
