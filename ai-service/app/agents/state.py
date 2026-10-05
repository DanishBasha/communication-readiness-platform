from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class TerminationReason(str, Enum):
    NATURAL = "NATURAL"
    MAX_STEPS = "MAX_STEPS"
    MAX_TOOL_CALLS = "MAX_TOOL_CALLS"
    TIMEOUT = "TIMEOUT"
    LLM_ERROR = "LLM_ERROR"
    SCOPE_VIOLATION = "SCOPE_VIOLATION"
    GUARD_REQUIRED_TOOLS = "GUARD_REQUIRED_TOOLS"


@dataclass
class AgentMetrics:
    llm_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    retry_count: int = 0
    cache_hits: int = 0
    cache_misses: int = 0


@dataclass
class AgentLoopConfig:
    agent_run_id: str
    student_id: str
    system_prompt: str
    user_message: str
    tools: list
    max_steps: int
    max_tool_calls: int
    timeout_seconds: float
    # Application-level guard: tools that MUST be called before final_answer is accepted.
    # When final_answer fires with missing required tools, the loop injects a nudge
    # message and continues. Exhausting max_plan_nudges returns GUARD_REQUIRED_TOOLS.
    required_tools: list = field(default_factory=list)
    max_plan_nudges: int = 3


@dataclass
class AgentLoopResult:
    tool_results: dict[str, Any] = field(default_factory=dict)
    step_count: int = 0
    tool_call_count: int = 0
    termination_reason: TerminationReason = TerminationReason.NATURAL
    metrics: AgentMetrics = field(default_factory=AgentMetrics)
