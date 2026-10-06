"""
Internal endpoints — not exposed to the public internet.
Called by the Node.js backend over the internal network only.

Authentication: X-Internal-Key header must match settings.internal_api_key.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.cache.cache_keys import CacheKeys
from app.cache.cache_service import cache_delete_many
from app.config import settings

logger = logging.getLogger("module3.cache")

router = APIRouter(prefix="/internal", tags=["internal"])


class InvalidateCacheRequest(BaseModel):
    student_id: str


@router.post("/cache/invalidate", status_code=204, response_model=None)
def invalidate_student_cache(
    request: InvalidateCacheRequest,
    x_internal_key: str = Header(default=""),
) -> None:
    """
    Invalidate all Module 3 cache entries for a student.

    Called by the Node.js backend immediately after ATTEMPT_COMPLETED is
    processed so that the next agent run reads fresh performance data.

    Returns 204 regardless of whether Redis is available (Redis unavailability
    must never block the event handler in Node.js).
    """
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    student_id = request.student_id.strip()
    if not student_id:
        raise HTTPException(status_code=422, detail="student_id is required")

    perf_key = CacheKeys.performance(student_id)
    gap_key  = CacheKeys.skill_gap(student_id)

    try:
        cache_delete_many(perf_key, gap_key)
        logger.info("cache invalidated  student_id=<redacted>  keys=[performance, skill_gap]")
    except Exception:
        logger.warning("cache invalidation skipped — Redis unavailable")
