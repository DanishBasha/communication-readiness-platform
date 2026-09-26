from __future__ import annotations

from typing import Any

from app.repositories import performance_repository
from app.tools.base import ToolContext, ToolDefinition, ToolResult


class GetStudentPerformanceTool(ToolDefinition):
    name = "GetStudentPerformance"
    description = (
        "Retrieve the student's current performance profile (technical, communication, "
        "listening scores) and the five most recent assessment snapshots."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "studentId": {"type": "string", "description": "UUID of the student"},
        },
        "required": ["studentId"],
    }
    read_only = True
    requires_student_scope = True

    def execute(self, args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        student_id = args.get("studentId", "")
        if student_id != ctx.student_id:
            return ToolResult(
                success=False,
                data=None,
                error_code="SCOPE_VIOLATION",
                error_message="Cannot access another student's data",
            )
        try:
            profile = performance_repository.get_performance_profile(student_id)
            snapshots = performance_repository.get_recent_snapshots(student_id)
            return ToolResult(
                success=True,
                data={"profile": profile, "recentSnapshots": snapshots},
            )
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error_code="DB_ERROR",
                error_message=str(e),
            )
