"""
Embedding router — /ai/embed and /ai/embed-batch

Called by the Node.js backend to generate text embeddings before storing
chunks in knowledge.knowledge_chunks (pgvector).
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.embedding_client import EMBEDDING_DIM, embed_text, embed_texts

router = APIRouter(prefix="/ai", tags=["embedding"])


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]
    model: str
    dimensions: int


class EmbedBatchRequest(BaseModel):
    texts: List[str]


class EmbedBatchResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimensions: int
    count: int


@router.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    """Embed a single text string. Returns a float vector of length `dimensions`."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=422, detail="text must not be empty")
    import os
    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    embedding = embed_text(req.text)
    return EmbedResponse(embedding=embedding, model=model, dimensions=len(embedding))


@router.post("/embed-batch", response_model=EmbedBatchResponse)
def embed_batch(req: EmbedBatchRequest) -> EmbedBatchResponse:
    """Embed a batch of texts in one call (more efficient than multiple /embed calls)."""
    if not req.texts:
        raise HTTPException(status_code=422, detail="texts must not be empty")
    if len(req.texts) > 100:
        raise HTTPException(status_code=422, detail="Maximum 100 texts per batch")
    import os
    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    texts = [t for t in req.texts if t.strip()]
    if not texts:
        raise HTTPException(status_code=422, detail="All texts are empty")
    embeddings = embed_texts(texts)
    return EmbedBatchResponse(
        embeddings=embeddings,
        model=model,
        dimensions=EMBEDDING_DIM,
        count=len(embeddings),
    )
