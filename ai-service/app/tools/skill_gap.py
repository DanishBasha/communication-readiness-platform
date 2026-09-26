from __future__ import annotations

from typing import Any

from app.repositories import performance_repository
from app.tools.base import ToolContext, ToolDefinition, ToolResult


class GetSkillGapAnalysisTool(ToolDefinition):
    name = "GetSkillGapAnalysis"
    description = (
        "Identify the student's weak skills (average score below 70) ranked by score "
        "ascending. Returns skill_id, name, category, avg_score."
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
            weak_skills = performance_repository.get_weak_skills(student_id)
            return ToolResult(success=True, data={"weakSkills": weak_skills})
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error_code="DB_ERROR",
                error_message=str(e),
            )
