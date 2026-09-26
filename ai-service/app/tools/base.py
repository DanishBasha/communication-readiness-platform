from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class ToolContext:
    student_id: str
    agent_run_id: str


@dataclass
class ToolResult:
    success: bool
    data: Any = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class ToolDefinition(ABC):
    name: str = ""
    description: str = ""
    input_schema: dict = {}
    read_only: bool = True
    requires_student_scope: bool = False

    @abstractmethod
    def execute(self, args: dict[str, Any], ctx: ToolContext) -> ToolResult: ...


def to_llm_tool_spec(tool: ToolDefinition) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.input_schema,
        },
    }
