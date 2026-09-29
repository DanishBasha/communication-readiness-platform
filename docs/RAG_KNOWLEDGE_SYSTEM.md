# RAG Knowledge System — Communication Readiness Platform

> **Module:** M3 (Knowledge)  
> **Status:** Implemented — pending embedding service configuration  
> **Last updated:** 2026-09-29

---

## Overview

The RAG (Retrieval-Augmented Generation) system allows administrators to upload knowledge documents (course materials, interview guides, etc.) that are chunked, embedded, and stored in a pgvector column. When a query is made, the top-K most similar chunks are retrieved and can be used as context for LLM generation.

---

## Architecture

```
Admin → POST /api/knowledge/documents
           ↓
  knowledge.knowledge_documents (DB insert)
           ↓
  chunkText() — Node.js text splitter
           ↓
  POST /ai/embed-batch (Python AI service)
           ↓
  OpenAI-compatible embeddings API (vLLM / OpenAI / custom)
           ↓
  knowledge.knowledge_chunks + pgvector vector(1536)
           ↓
  POST /api/knowledge/search  ← User query
           ↓
  POST /ai/embed (single query embedding)
           ↓
  SELECT ... ORDER BY embedding <=> query::vector LIMIT K
           ↓
  Top-K chunks + assembled context string
           ↓
  (Caller injects context into LLM prompt)
           ↓
  vLLM / LLM → response
```

---

## Database Schema

**`knowledge.knowledge_documents`** (migration 066)
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | VARCHAR(255) | Required |
| source_type | VARCHAR(50) | FILE, URL, MANUAL, etc. |
| source_url | VARCHAR(500) | Optional original URL |
| visibility_type | VARCHAR(50) | GLOBAL, INSTITUTION, PROGRAM, SUBDIVISION |
| institution_id | UUID | Optional scope (no FK — best-effort) |
| program_id | UUID | Optional scope |
| subdivision_id | UUID | Optional scope |
| metadata | JSONB | Additional metadata |

**`knowledge.knowledge_chunks`** (migration 067)
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| document_id | UUID | FK → knowledge_documents (CASCADE DELETE) |
| chunk_index | INTEGER | Position within document |
| chunk_text | TEXT | Plain text content |
| embedding | vector(1536) | pgvector — 1536-dim float32 |
| embedding_model | VARCHAR(100) | e.g. text-embedding-3-small |
| embedding_version | INTEGER | For re-embedding tracking |

**Index** (migration 068)
```sql
CREATE INDEX idx_knowledge_chunks_embedding
    ON knowledge.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

---

## API Endpoints

All endpoints require authentication. Upload/delete require `PROGRAM_ADMIN`, `SUPER_ADMIN`, or `PLATFORM_OWNER`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/knowledge/documents` | List documents (filterable by institution_id, program_id) |
| `POST` | `/api/knowledge/documents` | Ingest document from JSON body (text field) |
| `POST` | `/api/knowledge/documents/upload` | Upload .txt file (multipart/form-data) |
| `GET` | `/api/knowledge/documents/:id` | Get document metadata + chunk count |
| `GET` | `/api/knowledge/documents/:id/chunks` | List all chunks for a document |
| `DELETE` | `/api/knowledge/documents/:id` | Delete document and all its chunks |
| `POST` | `/api/knowledge/search` | Semantic search — returns top-K chunks + context |
| `GET` | `/api/knowledge/search?q=...` | Convenience GET semantic search |
| `POST` | `/api/knowledge/preview-chunks` | Preview how text would be chunked (no ingestion) |

### POST /api/knowledge/documents

```json
{
  "title": "Interview Preparation Guide",
  "text": "Full document text here...",
  "visibility_type": "GLOBAL",
  "institution_id": "uuid-optional",
  "program_id": "uuid-optional"
}
```

### POST /api/knowledge/search

```json
{
  "query": "how to prepare for technical interviews",
  "limit": 5,
  "institution_id": "uuid-optional"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "query": "how to prepare for technical interviews",
    "context": "[Source 1: Interview Guide]\nchunk text...\n\n---\n\n[Source 2: ...]\n...",
    "results": [
      {
        "chunk_id": "uuid",
        "document_id": "uuid",
        "document_title": "Interview Guide",
        "chunk_index": 2,
        "chunk_text": "...",
        "similarity": 0.87
      }
    ]
  }
}
```

---

## AI Service Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ai/embed` | Embed a single text string |
| `POST` | `/ai/embed-batch` | Embed up to 100 texts in one call |

### POST /ai/embed

```json
{ "text": "text to embed" }
```

Response:
```json
{
  "embedding": [0.123, -0.456, ...],
  "model": "text-embedding-3-small",
  "dimensions": 1536
}
```

---

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `RAG_CHUNK_SIZE` | 2000 | Max characters per chunk |
| `RAG_CHUNK_OVERLAP` | 200 | Character overlap between chunks |
| `RAG_TOP_K` | 5 | Default number of chunks returned by semantic search |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Model name sent to AI service |
| `VLLM_BASE_URL` | (empty) | vLLM base URL for generation |
| `VLLM_MODEL` | `local-model` | vLLM model name |
| `VLLM_TIMEOUT_MS` | 30000 | HTTP timeout for vLLM/embedding calls |

### AI Service (`ai-service/.env`)

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_BASE_URL` | (falls back to LLM_BASE_URL) | Embedding API base URL |
| `EMBEDDING_API_KEY` | (falls back to LLM_API_KEY) | Embedding API key |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model name |

---

## vLLM Integration

The LLM client in `ai-service/app/services/llm_client.py` has a first-class vLLM preset:

```python
# Set in ai-service/.env:
LLM_PROVIDER=vllm
LLM_BASE_URL=http://your-vllm-server:8000/v1
LLM_MODEL=your-model-name
```

For embeddings via vLLM (requires vLLM to be started with an embedding model):

```
EMBEDDING_BASE_URL=http://your-vllm-server:8000/v1
EMBEDDING_MODEL=your-embedding-model-name
```

The embedding client (`ai-service/app/services/embedding_client.py`) uses the OpenAI SDK's `client.embeddings.create()` which is compatible with vLLM's OpenAI-compatible API.

**If no embedding service is configured**, the system returns zero vectors and logs a warning. Semantic search will not return meaningful results, but the rest of the application continues to function.

---

## Deployment

See `docker-compose.yml` for local full-stack deployment and `render.yaml` for Render cloud deployment.

Required secrets (never commit):
- `DATABASE_URL` — Supabase connection string
- `JWT_SECRET` — 32+ char random string
- `LLM_API_KEY` / `EMBEDDING_API_KEY` — LLM provider API key
- `INTERNAL_API_KEY` — shared secret for POST /ai/config

---

## Testing Status

| Stage | Status |
|---|---|
| DB schema (pgvector, IVFFlat index) | Verified — migrations 066–068 |
| Document ingestion (POST /knowledge/documents) | Implemented — pending live embedding service |
| Text chunking | Implemented — character-based with boundary detection |
| Embedding generation | Implemented — requires EMBEDDING_BASE_URL or LLM_API_KEY |
| Vector storage | Implemented — pgvector with parameterized batch INSERT |
| Semantic search | Implemented — cosine similarity `<=>` operator |
| Top-K retrieval | Implemented — configurable limit (default 5, max 20) |
| Context construction | Implemented — returned in `context` field |
| LLM/vLLM abstraction | Implemented — multi-provider adapter, vLLM preset |
| RAG generation endpoint | Pending — callers inject `context` into their LLM prompts |

**Note:** End-to-end testing with a live embedding service is required to validate semantic search quality. With zero vectors (no service configured), ingestion and search routes work but results are not semantically meaningful.
