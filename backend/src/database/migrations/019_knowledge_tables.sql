-- knowledge.listening_stories  (DBML §17)
CREATE TABLE knowledge.listening_stories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR,
  content     TEXT,
  difficulty  VARCHAR,
  source_type VARCHAR,
  metadata    JSONB,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- knowledge.knowledge_documents  (DBML §19)
CREATE TABLE knowledge.knowledge_documents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR,
  source_type      VARCHAR,
  source_url       VARCHAR,
  visibility_type  VARCHAR,
  institution_id   UUID,
  program_id       UUID,
  subdivision_id   UUID,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- knowledge.knowledge_chunks  (DBML §19)
CREATE TABLE knowledge.knowledge_chunks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID        NOT NULL REFERENCES knowledge.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index       INTEGER,
  chunk_text        TEXT,
  embedding_model   VARCHAR,
  embedding_version INTEGER,
  source_metadata   JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_knowledge_chunk ON knowledge.knowledge_chunks (document_id, chunk_index);

-- Add embedding column only when pgvector is installed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    ALTER TABLE knowledge.knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector;
  END IF;
END;
$$;
