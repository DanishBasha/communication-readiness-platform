-- Migration 018: pgvector interview embeddings for long-term semantic retrieval
-- Stores summarized turn content per session so the LLM can retrieve
-- semantically relevant past context across turns.
--
-- Dimensions: 384 (all-MiniLM-L6-v2, local, no API key required)
-- Index: HNSW (better recall than IVFFlat; works immediately with any row count)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS session.interview_embeddings (
    id                 BIGSERIAL   PRIMARY KEY,
    session_id         UUID        NOT NULL,
    speaker            VARCHAR(10) NOT NULL DEFAULT 'candidate', -- 'candidate' | 'interviewer'
    topic_tag          VARCHAR(50),
    turn_number        INTEGER,
    summarized_content TEXT        NOT NULL,
    embedding          vector(384),
    created_at         TIMESTAMPTZ DEFAULT now()
);

-- HNSW index: no training required, works at any scale, better recall than IVFFlat
CREATE INDEX IF NOT EXISTS idx_interview_embeddings_hnsw
    ON session.interview_embeddings
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_interview_embeddings_session
    ON session.interview_embeddings (session_id);
