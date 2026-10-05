from __future__ import annotations

from app.cache.redis_client import get_redis

_QUEUE_NAME = "agent_jobs"
_JOB_TIMEOUT = 300  # seconds — safe upper bound for one full agent run


def get_job_queue():
    """Return an rq.Queue connected to Redis, or None if Redis is unavailable."""
    redis = get_redis()
    if redis is None:
        return None
    try:
        from rq import Queue
        return Queue(_QUEUE_NAME, connection=redis)
    except Exception:
        return None
