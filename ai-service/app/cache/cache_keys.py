"""
Centralised cache-key definitions for Module 3.

Version prefix (v1) allows safe future key-format changes without
leaving incompatible cached values in place.

Usage:
    key = CacheKeys.performance(student_id)
    key = CacheKeys.skill_gap(student_id)
    key = CacheKeys.knowledge_public()
"""
from __future__ import annotations

_PREFIX = "module3:v1"


class CacheKeys:
    @staticmethod
    def performance(student_id: str) -> str:
        """Running-average profile + recent snapshots for one student."""
        return f"{_PREFIX}:performance:{student_id}"

    @staticmethod
    def skill_gap(student_id: str) -> str:
        """Weak-skill list for one student (avg score < 70)."""
        return f"{_PREFIX}:skill_gap:{student_id}"

    @staticmethod
    def knowledge_public() -> str:
        """Public knowledge documents (shared across all students)."""
        return f"{_PREFIX}:knowledge:public"

    @staticmethod
    def web_resources(skills_sig: str) -> str:
        """Web search results keyed by a sorted skill signature (shared across students)."""
        return f"{_PREFIX}:web_resources:{skills_sig}"

    @staticmethod
    def student_pattern(student_id: str) -> str:
        """Glob pattern matching ALL cache keys for a student.
        Used for bulk invalidation after performance update.
        """
        return f"{_PREFIX}:*:{student_id}"
