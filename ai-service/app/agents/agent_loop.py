from __future__ import annotations

import json
import time
from typing import Any

from app.agents.state import AgentLoopConfig, AgentLoopResult, AgentMetrics, TerminationReason
from app.repositories import agent_repository
from app.services.llm_client import get_llm_client
from app.tools.base import ToolContext, ToolDefinition, to_llm_tool_spec


def _accumulate_usage(llm: Any, metrics: AgentMetrics) -> None:
    """Read _last_usage from the provider (if available) and add to metrics."""
    provider = getattr(llm, "_provider", None)
    last_usage = getattr(provider, "_last_usage", {})
    if not isinstance(last_usage, dict):
        last_usage = {}
    metrics.llm_calls += 1
    metrics.input_tokens  += last_usage.get("input",  0)
    metrics.output_tokens += last_usage.get("output", 0)
    metrics.total_tokens  += last_usage.get("total",  0)
    attempts = last_usage.get("attempts", 1)
    if isinstance(attempts, int) and attempts > 1:
        metrics.retry_count += attempts - 1


def run_agent_loop(config: AgentLoopConfig) -> AgentLoopResult:
    _loop_start = time.time()
    deadline = _loop_start + config.timeout_seconds
    tool_specs = [to_llm_tool_spec(t) for t in config.tools]

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": config.system_prompt},
        {"role": "user",   "content": config.user_message},
    ]

    tool_results: dict[str, Any] = {}
    metrics = AgentMetrics()
    seq = 0
    tool_call_count = 0
    nudge_count = 0
    llm = get_llm_client()

    while True:
        # ── Hard limits ──────────────────────────────────────────────────────────
        if time.time() > deadline:
            print(
                f"[agent_loop] TIMEOUT"
                f" run={config.agent_run_id} seq={seq}"
                f" elapsed={time.time() - _loop_start:.1f}s"
                f" limit={config.timeout_seconds}s",
                flush=True,
            )
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.TIMEOUT, metrics)
        if seq >= config.max_steps:
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.MAX_STEPS, metrics)
        if tool_call_count >= config.max_tool_calls:
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.MAX_TOOL_CALLS, metrics)

        # ── Call LLM ─────────────────────────────────────────────────────────────
        seq += 1
        llm_seq = seq
        llm_start = time.time()
        print(
            f"[agent_loop] LLM_start"
            f" run={config.agent_run_id} seq={llm_seq}"
            f" elapsed={llm_start - _loop_start:.1f}s"
            f" remaining={deadline - llm_start:.1f}s",
            flush=True,
        )

        try:
            action = llm.chat_complete_with_tools(messages, tool_specs)
        except Exception as e:
            exc_type = type(e).__name__
            print(
                f"[agent_loop] LLM_ERROR"
                f" run={config.agent_run_id} seq={llm_seq}"
                f" exc_type={exc_type} exc={e!r}",
                flush=True,
            )
            agent_repository.upsert_completed_step(
                config.agent_run_id, llm_seq, "LLM", None,
                json.dumps({"msgCount": len(messages), "exc_type": exc_type}),
                json.dumps({"exc_type": exc_type, "exc_repr": repr(e)[:2000]}),
                "FAILED", "LLM_ERROR", str(e),
                int((time.time() - llm_start) * 1000),
            )
            return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.LLM_ERROR, metrics)

        llm_ms = int((time.time() - llm_start) * 1000)
        _decided = (
            action.get("tool_name") if action.get("type") == "tool_call"
            else action.get("type", "unknown")
        )
        print(
            f"[agent_loop] LLM_done"
            f" run={config.agent_run_id} seq={llm_seq}"
            f" duration={llm_ms / 1000:.2f}s decided={_decided}",
            flush=True,
        )
        _accumulate_usage(llm, metrics)

        # ── Final answer ─────────────────────────────────────────────────────────
        if action.get("type") == "final_answer":
            # Application-level guard: required tools must all complete before
            # final_answer is accepted.  If any are missing, inject a nudge
            # message and continue.  This prevents the LLM from short-circuiting
            # the workflow (e.g. stopping after GetSkillGapAnalysis without
            # calling DraftLearningPlan).
            if config.required_tools:
                missing = [t for t in config.required_tools if t not in tool_results]
                if missing:
                    if nudge_count < config.max_plan_nudges:
                        nudge_count += 1
                        next_required = missing[0]
                        print(
                            f"[agent_loop] GUARD_NUDGE"
                            f" run={config.agent_run_id} seq={llm_seq}"
                            f" missing={missing}"
                            f" nudge={nudge_count}/{config.max_plan_nudges}",
                            flush=True,
                        )
                        agent_repository.upsert_completed_step(
                            config.agent_run_id, llm_seq, "LLM", None,
                            json.dumps({"msgCount": len(messages)}),
                            json.dumps({
                                "content": action.get("content", ""),
                                "guard": "early_final_answer",
                                "missing": missing,
                            }),
                            "COMPLETED", None, None, llm_ms,
                        )
                        # Add the assistant's premature final-answer to context,
                        # then inject a user nudge so the LLM continues.
                        messages.append({"role": "assistant", "content": action.get("content", "")})
                        messages.append({
                            "role": "user",
                            "content": (
                                f"You have not yet called {next_required}, which is required "
                                f"before completing this task. The following tool(s) still need "
                                f"to be called: {missing}. Please proceed by calling "
                                f"{next_required} now."
                            ),
                        })
                        continue
                    else:
                        # Nudge limit exhausted — fail explicitly with diagnostics.
                        print(
                            f"[agent_loop] GUARD_FAIL"
                            f" run={config.agent_run_id} seq={llm_seq}"
                            f" missing={missing}"
                            f" nudges_exhausted={nudge_count}",
                            flush=True,
                        )
                        agent_repository.upsert_completed_step(
                            config.agent_run_id, llm_seq, "LLM", None,
                            json.dumps({"msgCount": len(messages)}),
                            json.dumps({
                                "content": action.get("content", ""),
                                "guard": "nudges_exhausted",
                                "missing": missing,
                            }),
                            "FAILED",
                            "GUARD_REQUIRED_TOOLS_NOT_CALLED",
                            f"Required tools not called after {nudge_count} nudges: {missing}",
                            llm_ms,
                        )
                        return AgentLoopResult(
                            tool_results, seq, tool_call_count,
                            TerminationReason.GUARD_REQUIRED_TOOLS, metrics,
                        )

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

        # ── Dedup: skip re-execution of already-completed tools ───────────────────
        if tool_name in tool_results:
            print(
                f"[agent_loop] tool_dedup"
                f" run={config.agent_run_id} seq={llm_seq}"
                f" tool={tool_name} (already executed — skipping)",
                flush=True,
            )
            agent_repository.upsert_completed_step(
                config.agent_run_id, llm_seq, "LLM", tool_name,
                json.dumps({"msgCount": len(messages), "args": tool_args}),
                json.dumps({"decided": tool_name, "skipped": "already_executed"}),
                "COMPLETED", None, None, llm_ms,
            )
            if "assistant_message" in action:
                messages.append(action["assistant_message"])
            else:
                messages.append({"role": "assistant", "content": f"[called: {tool_name}]"})
            dedup_msg: dict[str, Any] = {
                "role": "tool", "name": tool_name,
                "content": json.dumps({"status": "already_executed", "note": f"{tool_name} was already called"}),
            }
            if "tool_call_id" in action:
                dedup_msg["tool_call_id"] = action["tool_call_id"]
            messages.append(dedup_msg)
            continue

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
            print(
                f"[agent_loop] tool_not_found"
                f" run={config.agent_run_id} seq={llm_seq}"
                f" tool={tool_name}",
                flush=True,
            )
            if "assistant_message" in action:
                messages.append(action["assistant_message"])
            else:
                messages.append({"role": "assistant", "content": f"[unknown tool: {tool_name}]"})
            unknown_msg: dict[str, Any] = {"role": "tool", "name": tool_name, "content": json.dumps({"error": "Tool not found"})}
            if "tool_call_id" in action:
                unknown_msg["tool_call_id"] = action["tool_call_id"]
            messages.append(unknown_msg)
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
                return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.SCOPE_VIOLATION, metrics)

        # ── Pre-terminal guard ────────────────────────────────────────────────────
        # If the LLM calls a terminal tool but non-terminal required tools have not
        # been called yet, block the execution and nudge.  This enforces the full
        # tool sequence even when the LLM tries to shortcut to DraftLearningPlan
        # without first running SearchWebResources (or any other required step).
        if getattr(tool, "is_terminal", False) and config.required_tools:
            _missing_pre = [
                t for t in config.required_tools
                if t not in tool_results and t != tool.name
            ]
            if _missing_pre:
                if nudge_count < config.max_plan_nudges:
                    nudge_count += 1
                    _next_missing = _missing_pre[0]
                    print(
                        f"[agent_loop] PRE_TERMINAL_GUARD_NUDGE"
                        f" run={config.agent_run_id} seq={llm_seq}"
                        f" blocked_terminal={tool.name}"
                        f" missing={_missing_pre}"
                        f" nudge={nudge_count}/{config.max_plan_nudges}",
                        flush=True,
                    )
                    if "assistant_message" in action:
                        messages.append(action["assistant_message"])
                    else:
                        messages.append({"role": "assistant", "content": f"[called: {tool.name}]"})
                    _blocked_msg: dict[str, Any] = {
                        "role": "tool", "name": tool.name,
                        "content": json.dumps({
                            "status": "not_ready",
                            "reason": (
                                f"You must call {_next_missing} before {tool.name}. "
                                f"Required tools not yet called: {_missing_pre}."
                            ),
                        }),
                    }
                    if "tool_call_id" in action:
                        _blocked_msg["tool_call_id"] = action["tool_call_id"]
                    messages.append(_blocked_msg)
                    continue
                else:
                    print(
                        f"[agent_loop] PRE_TERMINAL_GUARD_FAIL"
                        f" run={config.agent_run_id} seq={llm_seq}"
                        f" missing={_missing_pre}"
                        f" nudges_exhausted={nudge_count}",
                        flush=True,
                    )
                    agent_repository.upsert_completed_step(
                        config.agent_run_id, llm_seq, "LLM", tool_name,
                        json.dumps({"msgCount": len(messages), "args": tool_args}),
                        json.dumps({
                            "decided": tool_name,
                            "guard": "pre_terminal_nudges_exhausted",
                            "missing": _missing_pre,
                        }),
                        "FAILED",
                        "GUARD_REQUIRED_TOOLS_NOT_CALLED",
                        f"Required tools not called after {nudge_count} nudges: {_missing_pre}",
                        llm_ms,
                    )
                    return AgentLoopResult(
                        tool_results, seq, tool_call_count,
                        TerminationReason.GUARD_REQUIRED_TOOLS, metrics,
                    )

        # ── Execute tool ──────────────────────────────────────────────────────────
        seq += 1
        tool_seq = seq
        tool_call_count += 1
        print(
            f"[agent_loop] tool_start"
            f" run={config.agent_run_id} seq={tool_seq}"
            f" tool={tool.name} elapsed={time.time() - _loop_start:.1f}s",
            flush=True,
        )

        agent_repository.insert_running_tool_step(
            config.agent_run_id, tool_seq, tool.name, json.dumps(tool_args)
        )

        tool_start = time.time()
        ctx = ToolContext(student_id=config.student_id, agent_run_id=config.agent_run_id)
        result = tool.execute(tool_args, ctx)
        tool_ms = int((time.time() - tool_start) * 1000)
        print(
            f"[agent_loop] tool_done"
            f" run={config.agent_run_id} seq={tool_seq}"
            f" tool={tool.name} duration={tool_ms / 1000:.2f}s success={result.success}",
            flush=True,
        )

        # Track cache hits/misses
        if result.cache_hit is True:
            metrics.cache_hits += 1
        elif result.cache_hit is False:
            metrics.cache_misses += 1

        if result.success:
            agent_repository.update_tool_step(
                config.agent_run_id, tool_seq,
                json.dumps(result.data), "COMPLETED", None, None, tool_ms,
            )
            tool_results[tool.name] = result.data

            if "assistant_message" in action:
                messages.append(action["assistant_message"])
            else:
                messages.append({"role": "assistant", "content": f"[called: {tool.name}]"})

            # Use compact summary if available to keep context lean
            display_content = result.context_summary or json.dumps(result.data)
            tool_result_msg: dict[str, Any] = {
                "role": "tool", "name": tool.name, "content": display_content,
            }
            if "tool_call_id" in action:
                tool_result_msg["tool_call_id"] = action["tool_call_id"]
            messages.append(tool_result_msg)

            # Terminal tool: exit immediately without a final-answer LLM call
            if getattr(tool, "is_terminal", False):
                print(
                    f"[agent_loop] terminal_tool_exit"
                    f" run={config.agent_run_id} seq={tool_seq}"
                    f" tool={tool.name}",
                    flush=True,
                )
                return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.NATURAL, metrics)
        else:
            agent_repository.update_tool_step(
                config.agent_run_id, tool_seq,
                None, "FAILED",
                result.error_code or "TOOL_ERROR",
                result.error_message or "Unknown tool error",
                tool_ms,
            )
            if "assistant_message" in action:
                messages.append(action["assistant_message"])
            else:
                messages.append({"role": "assistant", "content": f"[called: {tool.name}]"})
            tool_err_msg: dict[str, Any] = {"role": "tool", "name": tool.name, "content": json.dumps({"error": result.error_message})}
            if "tool_call_id" in action:
                tool_err_msg["tool_call_id"] = action["tool_call_id"]
            messages.append(tool_err_msg)

    return AgentLoopResult(tool_results, seq, tool_call_count, TerminationReason.NATURAL, metrics)
