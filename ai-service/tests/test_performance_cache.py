"""
Tests for GetStudentPerformance tool cache behaviour.

Verifies: cache HIT, cache MISS+fill, Redis failure fallback,
per-student key isolation, and scope enforcement.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.tools.performance import GetStudentPerformanceTool
from app.tools.base import ToolContext, ToolResult


STUDENT_A = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_B = "bbbbbbbb-0000-0000-0000-000000000002"


def _ctx(student_id: str) -> ToolContext:
    return ToolContext(student_id=student_id, agent_run_id="run-1")


def _make_db_data(student_id: str) -> dict:
    return {
        "profile": {
            "student_id": student_id,
            "overall_score": 72.0,
            "technical_score": 70.0,
            "communication_score": 74.0,
            "listening_score": 71.0,
            "trend": "STABLE",
        },
        "recentSnapshots": [],
    }


class TestPerformanceCacheHit:
    def test_cache_hit_skips_db(self):
        """When cache has data, DB is never queried."""
        db_data = _make_db_data(STUDENT_A)
        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", return_value=db_data) as mock_get,
            patch("app.tools.performance.performance_repository") as mock_repo,
        ):
            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True
        assert result.data == db_data
        mock_get.assert_called_once()
        mock_repo.get_performance_profile.assert_not_called()
        mock_repo.get_recent_snapshots.assert_not_called()

    def test_cache_hit_returns_correct_data(self):
        cached = {"profile": {"overall_score": 88.0}, "recentSnapshots": [{"overall_score": 88.0}]}
        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", return_value=cached),
            patch("app.tools.performance.performance_repository"),
        ):
            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.data["profile"]["overall_score"] == 88.0


class TestPerformanceCacheMiss:
    def test_cache_miss_queries_db_and_fills_cache(self):
        """On cache miss the tool queries DB and writes the result to cache."""
        db_data = _make_db_data(STUDENT_A)
        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", return_value=None),
            patch("app.tools.performance.cache_set") as mock_set,
            patch("app.tools.performance.performance_repository") as mock_repo,
        ):
            mock_repo.get_performance_profile.return_value = db_data["profile"]
            mock_repo.get_recent_snapshots.return_value = []

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True
        mock_set.assert_called_once()
        key_used = mock_set.call_args[0][0]
        assert STUDENT_A in key_used, "Cache key must include student_id"

    def test_cache_miss_missing_profile_returns_error(self):
        """No profile in DB → tool returns failure (existing behaviour preserved)."""
        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", return_value=None),
            patch("app.tools.performance.cache_set"),
            patch("app.tools.performance.performance_repository") as mock_repo,
        ):
            mock_repo.get_performance_profile.return_value = None

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is False


class TestPerformanceCacheRedisFailure:
    def test_redis_failure_falls_back_to_db(self):
        """If cache_get raises, the tool still queries DB successfully."""
        db_data = _make_db_data(STUDENT_A)
        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", side_effect=Exception("Redis down")),
            patch("app.tools.performance.cache_set"),
            patch("app.tools.performance.performance_repository") as mock_repo,
        ):
            mock_repo.get_performance_profile.return_value = db_data["profile"]
            mock_repo.get_recent_snapshots.return_value = []

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True

    def test_redis_failure_on_set_does_not_raise(self):
        """If cache_set raises, the tool still returns successfully."""
        db_data = _make_db_data(STUDENT_A)
        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", return_value=None),
            patch("app.tools.performance.cache_set", side_effect=Exception("Redis write error")),
            patch("app.tools.performance.performance_repository") as mock_repo,
        ):
            mock_repo.get_performance_profile.return_value = db_data["profile"]
            mock_repo.get_recent_snapshots.return_value = []

            result = tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))

        assert result.success is True


class TestPerformanceCacheStudentIsolation:
    def test_different_students_use_different_cache_keys(self):
        """Verifies that two different students hit different cache keys."""
        keys_written: list[str] = []

        def capturing_set(key: str, value, ttl: int) -> None:
            keys_written.append(key)

        def miss(_key: str):
            return None

        tool = GetStudentPerformanceTool()

        with (
            patch("app.tools.performance.cache_get", side_effect=miss),
            patch("app.tools.performance.cache_set", side_effect=capturing_set),
            patch("app.tools.performance.performance_repository") as mock_repo,
        ):
            mock_repo.get_performance_profile.side_effect = lambda sid: _make_db_data(sid)["profile"]
            mock_repo.get_recent_snapshots.return_value = []

            tool.execute({"studentId": STUDENT_A}, _ctx(STUDENT_A))
            tool.execute({"studentId": STUDENT_B}, _ctx(STUDENT_B))

        assert len(keys_written) == 2
        assert keys_written[0] != keys_written[1]
        assert STUDENT_A in keys_written[0]
        assert STUDENT_B in keys_written[1]


class TestPerformanceScopeEnforcement:
    def test_scope_violation_blocked(self):
        """Tool must reject requests where studentId != context.student_id."""
        tool = GetStudentPerformanceTool()
        ctx = _ctx(STUDENT_A)

        with patch("app.tools.performance.cache_get") as mock_get:
            result = tool.execute({"studentId": STUDENT_B}, ctx)

        assert result.success is False
        mock_get.assert_not_called()
