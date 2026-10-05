"""
Cache read/write/delete helpers with graceful degradation and structured logging.

All public functions are safe to call when Redis is unavailable:
they return None on failure and log a warning at most once per error type.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

from redis.exceptions import RedisError

from app.cache.redis_client import get_redis

logger = logging.getLogger("module3.cache")


def cache_get(key: str) -> Optional[Any]:
    """
    Return the cached value for key, or None on miss / Redis error.
    Logs HIT or MISS and latency at DEBUG level.
    """
    r = get_redis()
    if r is None:
        return None

    start = time.monotonic()
    try:
        raw = r.get(key)
        elapsed_ms = int((time.monotonic() - start) * 1000)

        if raw is None:
            logger.debug("cache MISS  key_category=%s  latency_ms=%d",
                         _key_category(key), elapsed_ms)
            return None

        value = json.loads(raw)
        logger.debug("cache HIT   key_category=%s  latency_ms=%d",
                     _key_category(key), elapsed_ms)
        return value

    except (RedisError, json.JSONDecodeError) as exc:
        logger.warning("cache GET failed  key_category=%s  reason=%s",
                       _key_category(key), type(exc).__name__)
        return None


def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    """Serialise value to JSON and store it with the given TTL.  Never raises."""
    r = get_redis()
    if r is None:
        return

    try:
        r.setex(key, ttl_seconds, json.dumps(value, default=str))
        logger.debug("cache SET   key_category=%s  ttl=%ds",
                     _key_category(key), ttl_seconds)
    except (RedisError, TypeError, ValueError) as exc:
        logger.warning("cache SET failed  key_category=%s  reason=%s",
                       _key_category(key), type(exc).__name__)


def cache_delete(key: str) -> None:
    """Delete a single cache key.  Never raises."""
    r = get_redis()
    if r is None:
        return

    try:
        r.delete(key)
        logger.debug("cache DELETE  key_category=%s", _key_category(key))
    except RedisError as exc:
        logger.warning("cache DELETE failed  key_category=%s  reason=%s",
                       _key_category(key), type(exc).__name__)


def cache_delete_many(*keys: str) -> None:
    """Delete multiple cache keys atomically.  Never raises."""
    r = get_redis()
    if r is None:
        return

    try:
        if keys:
            r.delete(*keys)
            logger.debug("cache DELETE_MANY  count=%d", len(keys))
    except RedisError as exc:
        logger.warning("cache DELETE_MANY failed  reason=%s", type(exc).__name__)


# ── helpers ──────────────────────────────────────────────────────────────────

def _key_category(key: str) -> str:
    """Return a loggable category from a cache key (omits student UUIDs)."""
    # key format: module3:v1:<category>:<id>  or  module3:v1:<category>
    parts = key.split(":")
    if len(parts) >= 3:
        return parts[2]   # e.g. "performance", "skill_gap", "knowledge"
    return "unknown"
