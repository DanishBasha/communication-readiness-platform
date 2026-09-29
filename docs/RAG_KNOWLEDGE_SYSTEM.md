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
| `RAG_CHUNK_OVERLAP` | 200 | Character overlap between chunks (must be < RAG_CHUNK_SIZE) |
| `RAG_TOP_K` | 5 | Default number of chunks returned by semantic search |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Model name sent to AI service (must output 1536 dims) |
| `VLLM_BASE_URL` | (empty) | vLLM base URL **including `/v1`**: e.g. `http://host:8000/v1` |
| `VLLM_MODEL` | `local-model` | vLLM model name |
| `VLLM_TIMEOUT_MS` | 30000 | HTTP timeout for vLLM/embedding calls (ms) |

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
LLM_BASE_URL=http://your-vllm-server:8000/v1   # /v1 suffix is required
LLM_MODEL=your-model-name
```

For embeddings via vLLM (requires vLLM to be started with an embedding model):

```
EMBEDDING_BASE_URL=http://your-vllm-server:8000/v1   # /v1 suffix required
EMBEDDING_MODEL=your-embedding-model-name
```

The Node.js `VLLMAdapter` (backend) also requires `/v1` in `VLLM_BASE_URL`:

```
# backend/.env — used for future RAG generation:
VLLM_BASE_URL=http://your-vllm-server:8000/v1
VLLM_MODEL=your-model-name
```

**PENDING TEAM DECISION:** The `createLLMAdapter()` factory is implemented and wired to these env vars, but no RAG endpoint currently calls the LLM. The `semanticSearch()` function returns the context string; the caller is responsible for injecting it into an LLM prompt. The generation endpoint will be added once the team finalizes the module workflow.

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
| DB schema (pgvector, IVFFlat index) | IMPLEMENTED — migrations 066–068 |
| Document ingestion (POST /knowledge/documents) | IMPLEMENTED — unit tested |
| Text chunking | IMPLEMENTED — 13 unit tests, infinite-loop fix applied |
| Embedding generation | IMPLEMENTED — requires EMBEDDING_BASE_URL or LLM_API_KEY |
| Vector storage | IMPLEMENTED — transactional DELETE+INSERT, batch size limit |
| Semantic search | IMPLEMENTED — cosine similarity `<=>` operator |
| Top-K retrieval | IMPLEMENTED — configurable limit (default `RAG_TOP_K=5`, max 20) |
| Context construction | IMPLEMENTED — isolated `buildContext()`, 6 unit tests |
| LLM/vLLM abstraction | IMPLEMENTED — `LLMAdapter` interface + `VLLMAdapter` + `MockLLMAdapter` |
| RAG generation endpoint | PENDING TEAM DECISION — `createLLMAdapter()` wired but no route calls it yet |
| Unit tests (no DB) | IMPLEMENTED — 53 tests across 5 files |
| Integration tests | ENVIRONMENT BLOCKED — require PostgreSQL on port 5422 |

**Embedding dimension lock:** The database column is `vector(1536)`. `EMBEDDING_MODEL` must be compatible with 1536-dimensional output. Changing to a model with different dimensions (e.g. `text-embedding-3-large` = 3072 dims) requires a DB migration first. A dimension mismatch is caught before the INSERT with a descriptive error.

**IVFFlat index note:** The index is built at migration time on an empty table. Run `REINDEX INDEX idx_knowledge_chunks_embedding` after loading the initial document corpus for full performance.

**Note:** End-to-end testing with a live embedding service is required to validate semantic search quality. With zero vectors (no service configured), ingestion and search routes function but results are not semantically meaningful.
