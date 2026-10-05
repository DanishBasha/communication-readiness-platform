from __future__ import annotations

from typing import Any

from app.cache.cache_keys import CacheKeys
from app.cache.cache_service import cache_get, cache_set
from app.config import settings
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
        key = CacheKeys.skill_gap(student_id)

        # ── Cache lookup (Redis failure is non-fatal) ─────────────────────────
        try:
            cached = cache_get(key)
            if cached is not None:
                return ToolResult(
                    success=True, data=cached,
                    cache_hit=True,
                    context_summary=_skills_summary(cached),
                )
        except Exception:
            pass

        # ── Cache miss — compute from database ────────────────────────────────
        try:
            weak_skills = performance_repository.get_weak_skills(student_id)
            data = {"weakSkills": weak_skills}
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error_code="DB_ERROR",
                error_message=str(e),
            )

        # ── Store in cache (failure is non-fatal) ─────────────────────────────
        try:
            cache_set(key, data, settings.module3_skill_gap_cache_ttl)
        except Exception:
            pass

        return ToolResult(
            success=True, data=data,
            cache_hit=False,
            context_summary=_skills_summary(data),
        )


def _skills_summary(data: dict) -> str:
    weak_skills = data.get("weakSkills") or []
    if not weak_skills:
        return "ok. 0 weak skills."
    parts = []
    for s in weak_skills[:5]:
        if isinstance(s, dict):
            parts.append(f"{s.get('category', s.get('name', '?'))}({s.get('avg_score', '?')})")
        else:
            parts.append(str(s))
    return f"ok. {len(weak_skills)} weak skills: {', '.join(parts)}"
