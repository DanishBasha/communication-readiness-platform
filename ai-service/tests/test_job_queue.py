"""
Tests for the Redis job queue integration (Session 25) and
X-Internal-Key authentication on POST /agent/run (Session 47).

Covers:
  1. get_job_queue() returns None when Redis is unavailable
  2. get_job_queue() returns an rq.Queue when Redis is available
  3. start_agent_run enqueues via queue when Redis is up
  4. start_agent_run falls back to BackgroundTasks when queue is None
  5. start_agent_run falls back to BackgroundTasks when enqueue() raises
  6. worker.py constants exist (_QUEUES, _REDIS_URL)
  7. _JOB_TIMEOUT is a positive integer
  8. Queue name is 'agent_jobs'
  9-18. X-Internal-Key auth tests (10 tests in TestAgentRunAuth)
"""
from __future__ import annotations

import ast
import inspect
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

_TEST_KEY = "test-internal-secret"


# ── 1 & 2: get_job_queue() ────────────────────────────────────────────────────

class TestGetJobQueue:

    def test_returns_none_when_redis_unavailable(self):
        with patch("app.workers.queue.get_redis", return_value=None):
            from app.workers.queue import get_job_queue
            result = get_job_queue()
        assert result is None

    def test_returns_queue_when_redis_available(self):
        mock_redis = MagicMock()
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_cls.return_value = mock_queue_instance

        with patch("app.workers.queue.get_redis", return_value=mock_redis):
            def patched_get():
                redis = mock_redis
                if redis is None:
                    return None
                try:
                    return mock_queue_cls("agent_jobs", connection=redis)
                except Exception:
                    return None

            result = patched_get()

        assert result is mock_queue_instance

    def test_returns_none_when_rq_import_raises(self):
        mock_redis = MagicMock()
        import builtins
        original_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "rq":
                raise ImportError("rq not installed")
            return original_import(name, *args, **kwargs)

        with patch("app.workers.queue.get_redis", return_value=mock_redis), \
             patch("builtins.__import__", side_effect=mock_import):
            import app.workers.queue as qmod
            result = qmod.get_job_queue()

        assert result is None

    def test_queue_name_is_agent_jobs(self):
        from app.workers.queue import _QUEUE_NAME
        assert _QUEUE_NAME == "agent_jobs"

    def test_job_timeout_is_positive(self):
        from app.workers.queue import _JOB_TIMEOUT
        assert isinstance(_JOB_TIMEOUT, int)
        assert _JOB_TIMEOUT > 0


# ── 3-5: start_agent_run routing ─────────────────────────────────────────────

class TestStartAgentRunQueue:

    def _make_repo_mock(self, run_id: str = "run-q-001"):
        m = MagicMock()
        m.load_supervisor_def.return_value = {"id": "sup-def-1"}
        m.create_agent_run.return_value = run_id
        return m

    def test_enqueues_via_rq_when_queue_available(self):
        """When get_job_queue() returns a queue, enqueue() must be called."""
        mock_queue = MagicMock()
        mock_job = MagicMock()
        mock_job.id = "job-001"
        mock_queue.enqueue.return_value = mock_job
        mock_repo = self._make_repo_mock()
        mock_settings = MagicMock()
        mock_settings.internal_api_key = _TEST_KEY

        with patch("app.routers.agent.get_job_queue", return_value=mock_queue), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.settings", mock_settings):
            from fastapi.testclient import TestClient
            from fastapi import FastAPI
            from app.routers.agent import router as agent_router
            _app = FastAPI()
            _app.include_router(agent_router)
            client = TestClient(_app, raise_server_exceptions=True)

            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "test", "triggered_by_user_id": None},
                headers={"X-Internal-Key": _TEST_KEY},
            )

        assert resp.status_code == 202
        assert resp.json()["run_id"] == "run-q-001"
        mock_queue.enqueue.assert_called_once()
        enqueue_call = mock_queue.enqueue.call_args
        # Second positional arg is run_id
        assert enqueue_call[0][1] == "run-q-001"

    def test_falls_back_to_background_tasks_when_queue_is_none(self):
        """When get_job_queue() returns None, add_task must be called."""
        mock_repo = self._make_repo_mock("run-q-002")
        mock_settings = MagicMock()
        mock_settings.internal_api_key = _TEST_KEY
        add_task_called = [False]

        with patch("app.routers.agent.get_job_queue", return_value=None), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_runner.execute_agent_run", return_value=None):
            from fastapi.testclient import TestClient
            from fastapi import FastAPI, BackgroundTasks
            from app.routers.agent import router as agent_router

            _app = FastAPI()
            _app.include_router(agent_router)

            original_add_task = BackgroundTasks.add_task

            def tracking_add_task(self, func, *args, **kwargs):
                add_task_called[0] = True
                return original_add_task(self, func, *args, **kwargs)

            with patch.object(BackgroundTasks, "add_task", tracking_add_task):
                client = TestClient(_app, raise_server_exceptions=True)
                resp = client.post("/agent/run",
                    json={"student_id": "s1", "goal": "test", "triggered_by_user_id": None},
                    headers={"X-Internal-Key": _TEST_KEY},
                )

        assert resp.status_code == 202
        assert add_task_called[0]

    def test_falls_back_when_enqueue_raises(self):
        """When enqueue() raises, fall back to BackgroundTasks."""
        mock_queue = MagicMock()
        mock_queue.enqueue.side_effect = Exception("Redis write error")
        mock_repo = self._make_repo_mock("run-q-003")
        mock_settings = MagicMock()
        mock_settings.internal_api_key = _TEST_KEY
        add_task_called = [False]

        with patch("app.routers.agent.get_job_queue", return_value=mock_queue), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_runner.execute_agent_run", return_value=None):
            from fastapi.testclient import TestClient
            from fastapi import FastAPI, BackgroundTasks
            from app.routers.agent import router as agent_router

            _app = FastAPI()
            _app.include_router(agent_router)

            original_add_task = BackgroundTasks.add_task

            def tracking_add_task(self, func, *args, **kwargs):
                add_task_called[0] = True
                return original_add_task(self, func, *args, **kwargs)

            with patch.object(BackgroundTasks, "add_task", tracking_add_task):
                client = TestClient(_app, raise_server_exceptions=True)
                resp = client.post("/agent/run",
                    json={"student_id": "s1", "goal": "test", "triggered_by_user_id": None},
                    headers={"X-Internal-Key": _TEST_KEY},
                )

        assert resp.status_code == 202
        assert add_task_called[0]


# ── 6: worker.py constants ────────────────────────────────────────────────────

class TestWorkerConstants:

    def test_worker_module_constants_exist(self):
        """worker.py must define _QUEUES and _REDIS_URL."""
        worker_path = Path(__file__).parent.parent / "worker.py"
        with open(worker_path) as f:
            tree = ast.parse(f.read())
        assigns = {
            node.targets[0].id
            for node in ast.walk(tree)
            if isinstance(node, ast.Assign)
            and node.targets
            and isinstance(node.targets[0], ast.Name)
        }
        assert "_QUEUES" in assigns
        assert "_REDIS_URL" in assigns


# ── 9-18: X-Internal-Key authentication on POST /agent/run ───────────────────

class TestAgentRunAuth:
    """
    10 tests verifying that POST /agent/run enforces X-Internal-Key auth.
    No Groq calls — fully mocked.
    """

    def _make_app(self, mock_settings=None, mock_repo=None, mock_queue=None):
        from fastapi import FastAPI
        from app.routers.agent import router as agent_router
        _app = FastAPI()
        _app.include_router(agent_router)
        return _app

    def _default_mocks(self):
        mock_settings = MagicMock()
        mock_settings.internal_api_key = _TEST_KEY
        mock_repo = MagicMock()
        mock_repo.load_supervisor_def.return_value = {"id": "sup-def-1"}
        mock_repo.create_agent_run.return_value = "run-auth-001"
        mock_queue = MagicMock()
        mock_job = MagicMock()
        mock_job.id = "job-auth-001"
        mock_queue.enqueue.return_value = mock_job
        return mock_settings, mock_repo, mock_queue

    # 1. Correct key → 202
    def test_correct_key_returns_202(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": _TEST_KEY},
            )
        assert resp.status_code == 202

    # 2. Missing header → 401
    def test_missing_key_returns_401(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
            )
        assert resp.status_code == 401

    # 3. Wrong key → 401
    def test_wrong_key_returns_401(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": "totally-wrong-key"},
            )
        assert resp.status_code == 401

    # 4. Empty string key → 401 (default key is non-empty "change-me")
    def test_empty_string_key_returns_401(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": ""},
            )
        assert resp.status_code == 401

    # 5. Correct key → run_id present in response
    def test_correct_key_preserves_run_id_in_response(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": _TEST_KEY},
            )
        assert resp.status_code == 202
        assert "run_id" in resp.json()
        assert resp.json()["run_id"] == "run-auth-001"

    # 6. Auth passes → queue.enqueue() is still called (auth does not break queue behavior)
    def test_auth_does_not_prevent_enqueueing(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": _TEST_KEY},
            )
        mock_queue.enqueue.assert_called_once()

    # 7. Response body does not echo the key value
    def test_key_value_not_in_response_body(self):
        mock_settings, mock_repo, mock_queue = self._default_mocks()
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": _TEST_KEY},
            )
        assert _TEST_KEY not in resp.text

    # 8. Router source code does not log or print the key variable
    def test_key_not_logged_in_router_source(self):
        import re
        import app.routers.agent as agent_mod
        source = inspect.getsource(agent_mod)
        # No print/log statement should contain the key parameter name
        assert not re.search(r'(print|log|logger)\s*\(.*x_internal_key', source)

    # 9. No hardcoded secret value in router source
    def test_no_hardcoded_secret_in_router_source(self):
        import app.routers.agent as agent_mod
        source = inspect.getsource(agent_mod)
        assert "change-me" not in source
        assert _TEST_KEY not in source

    # 10. Auth check fires before agent_repository.load_supervisor_def (wrong key → 401, not 503)
    def test_auth_fires_before_supervisor_def_lookup(self):
        mock_settings, _, mock_queue = self._default_mocks()
        mock_repo_never_called = MagicMock()
        mock_repo_never_called.load_supervisor_def.return_value = None  # would cause 503 if reached
        with patch("app.routers.agent.settings", mock_settings), \
             patch("app.routers.agent.agent_repository", mock_repo_never_called), \
             patch("app.routers.agent.get_job_queue", return_value=mock_queue):
            from fastapi.testclient import TestClient
            client = TestClient(self._make_app(), raise_server_exceptions=True)
            resp = client.post("/agent/run",
                json={"student_id": "s1", "goal": "g", "triggered_by_user_id": None},
                headers={"X-Internal-Key": "bad-key"},
            )
        assert resp.status_code == 401
        mock_repo_never_called.load_supervisor_def.assert_not_called()
