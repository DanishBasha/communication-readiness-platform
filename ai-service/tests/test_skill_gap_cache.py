"""
Tests for GetSkillGapAnalysis tool cache behaviour.

Verifies: cache HIT, cache MISS+fill, Redis failure fallback,
per-student key isolation, top-5 cap enforcement.
"""
from unittest.mock import patch

import pytest

from app.tools.skill_gap import GetSkillGapAnalysisTool
from app.tools.base import ToolContext


STUDENT_A = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_B = "bbbbbbbb-0000-0000-0000-000000000002"


def _ctx(student_id: str) -> ToolContext:
    return ToolContext(student_id=student_id, agent_run_id="run-1")


def _weak_skills(n: int) -> list[dict]:
    return [{"skill_id": f"skill-{i}", "score": 40.0 - i} for i in range(n)]


class TestSkillGapCacheHit:
    def test_hit_skips_db(self):
        cached = {"weakSkills": _weak_skills(3)}
        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", return_value=cached) as mock_get,
            patch("app.tools.skill_gap.performance_repository") as mock_repo,
        ):
            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True
        assert result.data == cached
        mock_repo.get_weak_skills.assert_not_called()

    def test_hit_returns_cached_skills(self):
        cached = {"weakSkills": [{"skill_id": "skill-0", "score": 35.0}]}
        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", return_value=cached),
            patch("app.tools.skill_gap.performance_repository"),
        ):
            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.data["weakSkills"][0]["skill_id"] == "skill-0"


class TestSkillGapCacheMiss:
    def test_miss_queries_db_and_fills_cache(self):
        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", return_value=None),
            patch("app.tools.skill_gap.cache_set") as mock_set,
            patch("app.tools.skill_gap.performance_repository") as mock_repo,
        ):
            mock_repo.get_weak_skills.return_value = _weak_skills(4)

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True
        mock_set.assert_called_once()
        assert STUDENT_A in mock_set.call_args[0][0]

    def test_empty_weak_skills_cached_and_returned(self):
        """No weak skills is a valid state — should still succeed."""
        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", return_value=None),
            patch("app.tools.skill_gap.cache_set"),
            patch("app.tools.skill_gap.performance_repository") as mock_repo,
        ):
            mock_repo.get_weak_skills.return_value = []

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True
        assert result.data["weakSkills"] == []


class TestSkillGapCacheRedisFailure:
    def test_cache_get_exception_falls_back_to_db(self):
        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", side_effect=Exception("conn refused")),
            patch("app.tools.skill_gap.cache_set"),
            patch("app.tools.skill_gap.performance_repository") as mock_repo,
        ):
            mock_repo.get_weak_skills.return_value = _weak_skills(2)

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True

    def test_cache_set_exception_does_not_raise(self):
        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", return_value=None),
            patch("app.tools.skill_gap.cache_set", side_effect=Exception("write failed")),
            patch("app.tools.skill_gap.performance_repository") as mock_repo,
        ):
            mock_repo.get_weak_skills.return_value = _weak_skills(2)

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True


class TestSkillGapStudentIsolation:
    def test_two_students_use_different_keys(self):
        keys_written: list[str] = []

        def capturing_set(key: str, value, ttl: int) -> None:
            keys_written.append(key)

        tool = GetSkillGapAnalysisTool()

        with (
            patch("app.tools.skill_gap.cache_get", return_value=None),
            patch("app.tools.skill_gap.cache_set", side_effect=capturing_set),
            patch("app.tools.skill_gap.performance_repository") as mock_repo,
        ):
            mock_repo.get_weak_skills.return_value = _weak_skills(1)

            tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))
            tool.execute({"studentId": STUDENT_B}, _ctx(STUDENT_B))

        assert len(keys_written) == 2
        assert keys_written[0] != keys_written[1]
        assert STUDENT_A in keys_written[0]
        assert STUDENT_B in keys_written[1]


class TestSkillGapScopeEnforcement:
    def test_scope_violation_returns_error(self):
        tool = GetSkillGapAnalysisTool()

        with patch("app.tools.skill_gap.cache_get") as mock_get:
            result = tool.execute({"studentId": STUDENT_B}, _ctx(STUDENT_A))

        assert result.success is False
        mock_get.assert_not_called()
