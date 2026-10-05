"""
Vector Store Service — pgvector-backed long-term semantic retrieval.

Uses sentence-transformers (all-MiniLM-L6-v2, 384 dims) for local embeddings
so no additional API key is required beyond Groq.

Two public async functions:
  upsert_summary(session_id, turn_number, summary_text)
    — called via FastAPI BackgroundTasks after each turn; non-blocking.
  retrieve_relevant(session_id, query_text, top_k) → list[str]
    — called at the start of evaluate-response to inject long-term context.

Both functions are best-effort: any DB or embedding error is swallowed so the
main interview pipeline is never blocked by vector store failures.
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import Optional

import asyncpg
import numpy as np
from pgvector.asyncpg import register_vector

from app.config import settings

logger = logging.getLogger(__name__)

# ── Embedding model (lazy-loaded singleton) ───────────────────────────────────

_embed_model = None
_embed_lock = asyncio.Lock()


async def _get_embed_model():
    global _embed_model
    if _embed_model is not None:
        return _embed_model
    async with _embed_lock:
        if _embed_model is not None:
            return _embed_model
        try:
            # Import here so FastAPI starts even if sentence-transformers is not yet installed
            from sentence_transformers import SentenceTransformer
            _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("[VectorStore] Embedding model loaded (all-MiniLM-L6-v2)")
        except Exception as exc:
            logger.warning("[VectorStore] Could not load embedding model: %s", exc)
    return _embed_model


def _embed_sync(model, text: str) -> list[float]:
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


# ── Async PostgreSQL connection pool (lazy singleton) ─────────────────────────

_pool: Optional[asyncpg.Pool] = None
_pool_lock = asyncio.Lock()


async def _get_pool() -> Optional[asyncpg.Pool]:
    global _pool
    if _pool is not None:
        return _pool
    if not settings.database_url:
        return None
    async with _pool_lock:
        if _pool is not None:
            return _pool
        try:
            _pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=1,
                max_size=5,
                init=_register_vector_type,
            )
            logger.info("[VectorStore] asyncpg pool created")
        except Exception as exc:
            logger.warning("[VectorStore] DB pool creation failed: %s", exc)
    return _pool


async def _register_vector_type(conn: asyncpg.Connection) -> None:
    await register_vector(conn)


# ── Public API ────────────────────────────────────────────────────────────────

async def upsert_summary(
    session_id: str,
    turn_number: int,
    summary_text: str,
    speaker: str = "candidate",
    topic_tag: str | None = None,
) -> None:
    """
    Embed summary_text and insert into session.interview_embeddings.
    Called as a BackgroundTask — failure is logged, never raised.
    """
    try:
        model = await _get_embed_model()
        if model is None:
            return

        pool = await _get_pool()
        if pool is None:
            return

        loop = asyncio.get_running_loop()
        embedding: list[float] = await loop.run_in_executor(
            None, _embed_sync, model, summary_text
        )
        vec = np.array(embedding, dtype=np.float32)

        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO session.interview_embeddings
                    (session_id, turn_number, speaker, topic_tag, summarized_content, embedding)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                session_id,
                turn_number,
                speaker,
                topic_tag,
                summary_text,
                vec,
            )
    except Exception as exc:
        logger.error("[VectorStore] upsert_summary error: %s", exc)


async def retrieve_relevant(
    session_id: str,
    query_text: str,
    top_k: int = 3,
    speaker: str | None = None,
) -> list[str]:
    """
    Return up to top_k summarized_content entries from this session
    that are semantically closest to query_text.
    Optionally filter by speaker ('candidate' | 'interviewer').
    Returns [] on any error so the main pipeline continues unaffected.
    """
    try:
        model = await _get_embed_model()
        if model is None:
            return []

        pool = await _get_pool()
        if pool is None:
            return []

        loop = asyncio.get_running_loop()
        embedding: list[float] = await loop.run_in_executor(
            None, _embed_sync, model, query_text
        )
        vec = np.array(embedding, dtype=np.float32)

        async with pool.acquire() as conn:
            if speaker:
                rows = await conn.fetch(
                    """
                    SELECT summarized_content
                    FROM session.interview_embeddings
                    WHERE session_id = $1 AND speaker = $4
                    ORDER BY embedding <=> $2
                    LIMIT $3
                    """,
                    session_id,
                    vec,
                    top_k,
                    speaker,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT summarized_content
                    FROM session.interview_embeddings
                    WHERE session_id = $1
                    ORDER BY embedding <=> $2
                    LIMIT $3
                    """,
                    session_id,
                    vec,
                    top_k,
                )
        return [r["summarized_content"] for r in rows]
    except Exception as exc:
        logger.error("[VectorStore] retrieve_relevant error: %s", exc)
        return []
