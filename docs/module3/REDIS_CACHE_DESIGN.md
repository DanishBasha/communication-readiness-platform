# Module 3 — Redis Cache Design

## Key naming convention

All keys use the prefix `module3:v1:` for versioning. If the serialisation format changes, bump to `v2` and old keys expire naturally.

| Key | TTL | Invalidated by |
|---|---|---|
| `module3:v1:performance:{student_id}` | 600 s | `POST /internal/cache/invalidate` on ATTEMPT_COMPLETED |
| `module3:v1:skill_gap:{student_id}` | 600 s | `POST /internal/cache/invalidate` on ATTEMPT_COMPLETED |
| `module3:v1:knowledge:public` | 3600 s | TTL only (no active invalidation) |

## Serialisation

Values are serialised with `json.dumps` and deserialised with `json.loads`. All values must be JSON-serialisable (no datetime objects in cache — these are converted to ISO strings before caching).

## Cache service API

```python
cache_get(key: str) -> Optional[Any]     # HIT logs latency; MISS returns None; error returns None
cache_set(key: str, value: Any, ttl_seconds: int) -> None  # never raises
cache_delete(key: str) -> None           # never raises
cache_delete_many(*keys: str) -> None    # never raises
```

## Connection management

`redis_client.py` maintains a single module-level `Redis` connection (using redis-py's built-in connection pool). The connection is initialised at startup (`get_redis()` called in FastAPI `startup` event) and closed at shutdown (`close_redis()` in `shutdown` event).

Connection settings:
- `socket_connect_timeout=2` — fail fast at startup if Redis is absent
- `socket_timeout=1` — fail fast per operation (don't block agent loop)
- `decode_responses=True`

## Invalidation flow

```
Node.js: ATTEMPT_COMPLETED event handler
  1. DB transaction commits (PostgreSQL updated)
  2. fire-and-forget: POST /internal/cache/invalidate
       body: { student_id }
       header: X-Internal-Key: <AI_INTERNAL_KEY>
       timeout: 3000 ms

Python: POST /internal/cache/invalidate
  1. Verify X-Internal-Key header → 403 if wrong
  2. cache_delete_many(performance_key, skill_gap_key)
  3. Return 204 (even if Redis unavailable)
```

The call is fire-and-forget from Node.js — errors are caught and logged but do not fail the event handler. The 600 s TTL is a safety net for any missed invalidations.

## Logging

Cache operations are logged at INFO level with structured fields:
- `cache=HIT key_category=performance latency_ms=1.2`
- `cache=MISS key_category=skill_gap latency_ms=0.8`
- `cache=ERROR key_category=performance error=ConnectionError`

`key_category` is derived from the key structure without including the UUID, so no student identifiers appear in logs.

## Security

UUIDs (student_ids) never appear in log lines — only the category segment of the key. The invalidation endpoint requires `X-Internal-Key` matching `INTERNAL_API_KEY` (env var). The endpoint is never exposed publicly; it is called only over the internal network between Node.js and the Python service.
