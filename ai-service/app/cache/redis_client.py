"""
Managed Redis connection for Module 3.

Design principles:
  - One connection pool shared across the process lifetime.
  - Redis is a CACHE; if it is unavailable the caller falls back to the
    database.  Redis must never be a hard dependency.
  - No secrets are logged — only structural messages (HIT / MISS / error).
"""
from __future__ import annotations

import logging
from typing import Optional

import redis
from redis import Redis
from redis.exceptions import RedisError

from app.config import settings

logger = logging.getLogger("module3.cache")

_client: Optional[Redis] = None


def get_redis() -> Optional[Redis]:
    """Return the shared Redis client, or None if Redis is not configured / unavailable."""
    global _client
    if _client is not None:
        return _client

    url = settings.redis_url
    if not url:
        logger.debug("REDIS_URL not set — Redis cache disabled")
        return None

    try:
        _client = redis.Redis.from_url(
            url,
            socket_connect_timeout=2,   # fail fast if Redis is down
            socket_timeout=1,
            decode_responses=True,
            health_check_interval=30,
        )
        # Verify connectivity eagerly so startup logs are clear.
        _client.ping()
        logger.info("Redis connected: %s", url.split("@")[-1])   # never log credentials
    except RedisError as exc:
        logger.warning("Redis unavailable at startup (%s) — cache disabled", exc)
        _client = None

    return _client


def close_redis() -> None:
    """Close the shared connection (called on application shutdown)."""
    global _client
    if _client is not None:
        try:
            _client.close()
        except RedisError:
            pass
        _client = None
