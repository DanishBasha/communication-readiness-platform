"""
Embedding client for the AI service.

Generates text embeddings via any OpenAI-compatible embeddings endpoint
(OpenAI, vLLM with an embedding model, Together.ai, etc.).

Configuration (env vars, all optional):
  EMBEDDING_BASE_URL  — base URL of the embeddings endpoint
                        defaults to VLLM_BASE_URL, then LLM_BASE_URL, then OpenAI
  EMBEDDING_API_KEY   — API key; defaults to LLM_API_KEY / GROQ_API_KEY
  EMBEDDING_MODEL     — model name; defaults to text-embedding-3-small

If no embedding endpoint is reachable, a zero-vector (EMBEDDING_DIM floats) is
returned and a warning is logged. This allows the rest of the app to start
without a live embedding service (useful in development).
"""

from __future__ import annotations

import logging
import os
from typing import List

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 1536  # matches knowledge.knowledge_chunks embedding vector(1536)


def _get_config() -> tuple[str, str, str]:
    base_url = (
        os.getenv("EMBEDDING_BASE_URL")
        or os.getenv("VLLM_BASE_URL")
        or os.getenv("LLM_BASE_URL")
        or ""
    )
    api_key = (
        os.getenv("EMBEDDING_API_KEY")
        or os.getenv("LLM_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or "none"
    )
    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    return base_url, api_key, model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a batch of texts. Returns a list of float vectors, one per input.
    Falls back to zero vectors if the embedding service is unavailable.
    """
    base_url, api_key, model = _get_config()

    if not base_url and api_key == "none":
        logger.warning(
            "No embedding endpoint configured (set EMBEDDING_BASE_URL or LLM_BASE_URL). "
            "Returning zero vectors — semantic search will not work correctly."
        )
        return [[0.0] * EMBEDDING_DIM for _ in texts]

    try:
        from openai import OpenAI

        client_kwargs: dict = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = OpenAI(**client_kwargs)
        response = client.embeddings.create(model=model, input=texts)
        # response.data is sorted by index per OpenAI spec
        indexed = sorted(response.data, key=lambda d: d.index)
        return [item.embedding for item in indexed]

    except Exception as exc:
        logger.error("Embedding request failed: %s. Returning zero vectors.", exc)
        return [[0.0] * EMBEDDING_DIM for _ in texts]


def embed_text(text: str) -> List[float]:
    """Convenience wrapper for embedding a single text."""
    return embed_texts([text])[0]
