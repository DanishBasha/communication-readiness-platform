from __future__ import annotations

import json
import time
from typing import Any

from app.agents.state import AgentLoopConfig, AgentLoopResult, TerminationReason
from app.repositories import agent_repository
from app.services.llm_client import get_llm_client
from app.tools.base import ToolContext, ToolDefinition, to_llm_tool_spec


def run_agent_loop(config: AgentLoopConfig) -> AgentLoopResult:
    deadline = time.time() + config.timeout_seconds
    tool_specs = [to_llm_tool_spec(t) for t in config.tools]

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": config.system_prompt},
        {"role": "user",   "content": config.user_message},
    ]

    tool_results: dict[str, Any] = {}
    seq = 0
    tool_call_count = 0
    llm = get_llm_client()

    while True:
        # ── Hard limits ──────────────────────────────────────────────────────────
        if time.time() > deadline:
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.TIMEOUT)
        if seq >= config.max_steps:
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.MAX_STEPS)
        if tool_call_count >= config.max_tool_calls:
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.MAX_TOOL_CALLS)

        # ── Call LLM ─────────────────────────────────────────────────────────────
        seq += 1
        llm_seq = seq
        llm_start = time.time()

        try:
            action = llm.chat_complete_with_tools(messages, tool_specs)
        except Exception as e:
            agent_repository.upsert_completed_step(
                config.agent_run_id, llm_seq, "LLM", None,
                json.dumps({"msgCount": len(messages)}), None,
                "FAILED", "LLM_ERROR", str(e),
                int((time.time() - llm_start) * 1000),
            )
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.LLM_ERROR)

        llm_ms = int((time.time() - llm_start) * 1000)

        # ── Final answer ─────────────────────────────────────────────────────────
        if action.get("type") == "final_answer":
            agent_repository.upsert_completed_step(
                config.agent_run_id, llm_seq, "LLM", None,
                json.dumps({"msgCount": len(messages)}),
                json.dumps({"content": action.get("content", "")}),
                "COMPLETED", None, None, llm_ms,
            )
            break

        # ── Unexpected response ──────────────────────────────────────────────────
        if action.get("type") != "tool_call" or not action.get("tool_name"):
            agent_repository.upsert_completed_step(
                config.agent_run_id, llm_seq, "LLM", None,
                json.dumps({"msgCount": len(messages)}),
                json.dumps({"raw": action}),
                "FAILED", "INVALID_ACTION", "LLM returned unexpected action type", llm_ms,
            )
            break

        tool_name = action["tool_name"]
        tool_args = action.get("tool_args") or {}

        # ── LLM decided to call a tool ────────────────────────────────────────────
        agent_repository.upsert_completed_step(
            config.agent_run_id, llm_seq, "LLM", tool_name,
            json.dumps({"msgCount": len(messages), "args": tool_args}),
            json.dumps({"decided": tool_name}),
            "COMPLETED", None, None, llm_ms,
        )

        tool: ToolDefinition | None = next(
            (t for t in config.tools if t.name == tool_name), None
        )
        if not tool:
            messages.append({"role": "assistant", "content": f"[unknown tool: {tool_name}]"})
            messages.append({"role": "tool", "name": tool_name, "content": json.dumps({"error": "Tool not found"})})
            continue

        # ── Scope check ───────────────────────────────────────────────────────────
        if tool.requires_student_scope:
            req_student_id = tool_args.get("studentId")
            if req_student_id and req_student_id != config.student_id:
                seq += 1
                agent_repository.upsert_completed_step(
                    config.agent_run_id, seq, "TOOL", tool.name,
                    json.dumps(tool_args), None,
                    "FAILED", "SCOPE_VIOLATION", "Cannot access another student's data", 0,
                )
                return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.SCOPE_VIOLATION)

        # ── Execute tool ──────────────────────────────────────────────────────────
        seq += 1
        tool_seq = seq
        tool_call_count += 1

        agent_repository.insert_running_tool_step(
            config.agent_run_id, tool_seq, tool.name, json.dumps(tool_args)
        )

        tool_start = time.time()
        ctx = ToolContext(student_id=config.student_id, agent_run_id=config.agent_run_id)
        result = tool.execute(tool_args, ctx)
        tool_ms = int((time.time() - tool_start) * 1000)

        if result.success:
            agent_repository.update_tool_step(
                config.agent_run_id, tool_seq,
                json.dumps(result.data), "COMPLETED", None, None, tool_ms,
            )
            tool_results[tool.name] = result.data
            messages.append({"role": "assistant", "content": f"[called: {tool.name}]"})
            messages.append({"role": "tool", "name": tool.name, "content": json.dumps(result.data)})
        else:
            agent_repository.update_tool_step(
                config.agent_run_id, tool_seq,
                None, "FAILED",
                result.error_code or "TOOL_ERROR",
                result.error_message or "Unknown tool error",
                tool_ms,
            )
            messages.append({"role": "assistant", "content": f"[called: {tool.name}]"})
            messages.append({"role": "tool", "name": tool.name, "content": json.dumps({"error": result.error_message})})

    return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.NATURAL)
