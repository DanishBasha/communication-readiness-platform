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


@dataclass
class AgentLoopResult:
    tool_results: dict[str, Any] = field(default_factory=dict)
    step_count: int = 0
    tool_call_count: int = 0
    termination_reason: TerminationReason = TerminationReason.NATURAL
