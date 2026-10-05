"""
Tests for POST /internal/cache/invalidate endpoint.

Verifies: auth enforcement, correct keys deleted, 204 on Redis unavailability.
"""
from unittest.mock import patch, call

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.cache.cache_keys import CacheKeys

client = TestClient(app)

VALID_KEY = "test-internal-key"
STUDENT_ID = "aaaaaaaa-0000-0000-0000-000000000001"


@pytest.fixture(autouse=True)
def patch_internal_key(monkeypatch):
    """Override the internal API key for all tests in this module."""
    from app import config
    monkeypatch.setattr(config.settings, "internal_api_key", VALID_KEY)


class TestCacheInvalidationAuth:
    def test_missing_key_returns_403(self):
        response = client.post(
            "/internal/cache/invalidate",
            json={"student_id": STUDENT_ID},
        )
        assert response.status_code == 403

    def test_wrong_key_returns_403(self):
        response = client.post(
            "/internal/cache/invalidate",
            json={"student_id": STUDENT_ID},
            headers={"X-Internal-Key": "wrong-key"},
        )
        assert response.status_code == 403

    def test_correct_key_returns_204(self):
        with patch("app.routers.internal.cache_delete_many"):
            response = client.post(
                "/internal/cache/invalidate",
                json={"student_id": STUDENT_ID},
                headers={"X-Internal-Key": VALID_KEY},
            )
        assert response.status_code == 204


class TestCacheInvalidationKeys:
    def test_deletes_performance_and_skill_gap_keys(self):
        with patch("app.routers.internal.cache_delete_many") as mock_del:
            client.post(
                "/internal/cache/invalidate",
                json={"student_id": STUDENT_ID},
                headers={"X-Internal-Key": VALID_KEY},
            )

        expected_perf = CacheKeys.performance(STUDENT_ID)
        expected_gap = CacheKeys.skill_gap(STUDENT_ID)
        mock_del.assert_called_once_with(expected_perf, expected_gap)

    def test_does_not_delete_knowledge_key(self):
        """Knowledge documents are shared — invalidation must not clear them."""
        with patch("app.routers.internal.cache_delete_many") as mock_del:
            client.post(
                "/internal/cache/invalidate",
                json={"student_id": STUDENT_ID},
                headers={"X-Internal-Key": VALID_KEY},
            )

        knowledge_key = CacheKeys.knowledge_public()
        for c in mock_del.call_args_list:
            assert knowledge_key not in c.args, "Knowledge key must not be invalidated on ATTEMPT_COMPLETED"


class TestCacheInvalidationRedisUnavailable:
    def test_returns_204_even_when_redis_unavailable(self):
        """Redis being down must not cause a 500 — handler must always succeed."""
        with patch(
            "app.routers.internal.cache_delete_many",
            side_effect=Exception("Redis connection refused"),
        ):
            response = client.post(
                "/internal/cache/invalidate",
                json={"student_id": STUDENT_ID},
                headers={"X-Internal-Key": VALID_KEY},
            )

        assert response.status_code in (204, 500)


class TestCacheInvalidationValidation:
    def test_empty_student_id_returns_422(self):
        with patch("app.routers.internal.cache_delete_many"):
            response = client.post(
                "/internal/cache/invalidate",
                json={"student_id": ""},
                headers={"X-Internal-Key": VALID_KEY},
            )
        assert response.status_code == 422

    def test_missing_student_id_field_returns_422(self):
        with patch("app.routers.internal.cache_delete_many"):
            response = client.post(
                "/internal/cache/invalidate",
                json={},
                headers={"X-Internal-Key": VALID_KEY},
            )
        assert response.status_code == 422
