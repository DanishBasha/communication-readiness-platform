"""
Tests for RetrieveLearningKnowledge tool cache behaviour.

Unlike performance/skill-gap, knowledge documents are shared across all students.
Verifies: shared cache key, HIT, MISS+fill, Redis failure fallback.
"""
from unittest.mock import patch

import pytest

from app.tools.knowledge import RetrieveLearningKnowledgeTool
from app.tools.base import ToolContext
from app.cache.cache_keys import CacheKeys


STUDENT_A = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_B = "bbbbbbbb-0000-0000-0000-000000000002"


def _ctx(student_id: str = STUDENT_A) -> ToolContext:
    return ToolContext(student_id=student_id, agent_run_id="run-1")


def _docs(n: int = 3) -> list[dict]:
    return [{"id": f"doc-{i}", "title": f"Document {i}", "content": "..."} for i in range(n)]


class TestKnowledgeCacheSharedKey:
    def test_both_students_use_same_cache_key(self):
        """Knowledge docs are not student-specific — both students share one key."""
        keys_read: list[str] = []

        def capturing_get(key: str):
            keys_read.append(key)
            return None

        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", side_effect=capturing_get),
            patch("app.tools.knowledge.cache_set"),
            patch("app.tools.knowledge.knowledge_repository") as mock_repo,
        ):
            mock_repo.get_public_documents.return_value = _docs()

            tool.execute({"categories": ["TECHNICAL"]}, _ctx(STUDENT_A))
            tool.execute({"categories": ["TECHNICAL"]}, _ctx(STUDENT_B))

        assert len(keys_read) == 2
        assert keys_read[0] == keys_read[1], "Knowledge cache key must be shared across students"
        assert keys_read[0] == CacheKeys.knowledge_public()


class TestKnowledgeCacheHit:
    def test_hit_skips_db(self):
        cached = {"documents": _docs(5)}
        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", return_value=cached),
            patch("app.tools.knowledge.knowledge_repository") as mock_repo,
        ):
            result = tool.execute({"categories": ["TECHNICAL"]}, _ctx())

        assert result.success is True
        assert result.data == cached
        mock_repo.get_public_documents.assert_not_called()

    def test_hit_returns_full_document_list(self):
        cached = {"documents": _docs(10)}
        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", return_value=cached),
            patch("app.tools.knowledge.knowledge_repository"),
        ):
            result = tool.execute({"categories": ["TECHNICAL"]}, _ctx())

        assert len(result.data["documents"]) == 10


class TestKnowledgeCacheMiss:
    def test_miss_queries_db_and_fills_cache(self):
        docs = _docs(7)
        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", return_value=None),
            patch("app.tools.knowledge.cache_set") as mock_set,
            patch("app.tools.knowledge.knowledge_repository") as mock_repo,
        ):
            mock_repo.get_public_documents.return_value = docs

            result = tool.execute({"categories": ["TECHNICAL"]}, _ctx())

        assert result.success is True
        mock_set.assert_called_once()
        key_used = mock_set.call_args[0][0]
        assert key_used == CacheKeys.knowledge_public()

    def test_miss_empty_db_succeeds(self):
        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", return_value=None),
            patch("app.tools.knowledge.cache_set"),
            patch("app.tools.knowledge.knowledge_repository") as mock_repo,
        ):
            mock_repo.get_public_documents.return_value = []

            result = tool.execute({}, _ctx())

        assert result.success is True
        assert result.data["documents"] == []


class TestKnowledgeCacheRedisFailure:
    def test_get_exception_falls_back_to_db(self):
        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", side_effect=Exception("Redis unavailable")),
            patch("app.tools.knowledge.cache_set"),
            patch("app.tools.knowledge.knowledge_repository") as mock_repo,
        ):
            mock_repo.get_public_documents.return_value = _docs(3)

            result = tool.execute({"categories": ["TECHNICAL"]}, _ctx())

        assert result.success is True
        assert len(result.data["documents"]) == 3

    def test_set_exception_does_not_raise(self):
        tool = RetrieveLearningKnowledgeTool()

        with (
            patch("app.tools.knowledge.cache_get", return_value=None),
            patch("app.tools.knowledge.cache_set", side_effect=Exception("write refused")),
            patch("app.tools.knowledge.knowledge_repository") as mock_repo,
        ):
            mock_repo.get_public_documents.return_value = _docs(2)

            result = tool.execute({"categories": ["TECHNICAL"]}, _ctx())

        assert result.success is True
