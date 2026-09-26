from __future__ import annotations

from typing import Any

from app.database.connection import execute_query


def get_performance_profile(student_id: str) -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT technical_score, communication_score, listening_score,
               overall_score, trend, updated_at
        FROM performance.performance_profiles
        WHERE student_id = %s
        """,
        [student_id],
    )
    return rows[0] if rows else None


def get_recent_snapshots(student_id: str, limit: int = 5) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT overall_score, captured_at
        FROM performance.performance_snapshots
        WHERE student_id = %s
        ORDER BY captured_at DESC
        LIMIT %s
        """,
        [student_id, limit],
    )


def get_weak_skills(student_id: str) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT sp.skill_id, sk.name, sk.category,
               AVG(sp.score) AS avg_score,
               MAX(sp.measured_at) AS last_measured
        FROM performance.skill_performances sp
        JOIN performance.skills sk ON sk.id = sp.skill_id
        WHERE sp.student_id = %s
        GROUP BY sp.skill_id, sk.name, sk.category
        HAVING AVG(sp.score) < 70 OR AVG(sp.score) IS NULL
        ORDER BY avg_score ASC NULLS FIRST
        """,
        [student_id],
    )
