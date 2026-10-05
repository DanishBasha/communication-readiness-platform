from __future__ import annotations

from typing import Any

from app.cache.cache_keys import CacheKeys
from app.cache.cache_service import cache_get, cache_set
from app.config import settings
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
        key = CacheKeys.performance(student_id)

        # ── Cache lookup (Redis failure is non-fatal) ─────────────────────────
        try:
            cached = cache_get(key)
            if cached is not None:
                return ToolResult(
                    success=True, data=cached,
                    cache_hit=True,
                    context_summary=_perf_summary(cached),
                )
        except Exception:
            pass

        # ── Cache miss — fetch from database ──────────────────────────────────
        try:
            profile = performance_repository.get_performance_profile(student_id)
            if profile is None:
                return ToolResult(
                    success=False,
                    data=None,
                    error_code="NOT_FOUND",
                    error_message="Performance profile not found",
                )
            snapshots = performance_repository.get_recent_snapshots(student_id)
            data = {"profile": profile, "recentSnapshots": snapshots}
        except Exception as e:
            return ToolResult(
                success=False,
                data=None,
                error_code="DB_ERROR",
                error_message=str(e),
            )

        # ── Store in cache (failure is non-fatal) ─────────────────────────────
        try:
            cache_set(key, data, settings.module3_performance_cache_ttl)
        except Exception:
            pass

        return ToolResult(
            success=True, data=data,
            cache_hit=False,
            context_summary=_perf_summary(data),
        )


def _perf_summary(data: dict) -> str:
    profile = data.get("profile") or {}
    snapshots = data.get("recentSnapshots") or []
    overall = profile.get("overall_score")
    technical = profile.get("technical_score")
    communication = profile.get("communication_score")
    listening = profile.get("listening_score")
    trend = profile.get("trend", "STABLE")
    return (
        f"ok. overall={overall} tech={technical} comm={communication} "
        f"listen={listening} trend={trend}. snapshots={len(snapshots)}"
    )
