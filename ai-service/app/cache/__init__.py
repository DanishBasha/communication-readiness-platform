"""Redis cache layer for Module 3 — Learning Readiness Agent."""
from app.cache.redis_client import get_redis, close_redis
from app.cache.cache_keys import CacheKeys

__all__ = ["get_redis", "close_redis", "CacheKeys"]
