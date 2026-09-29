import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// ── Mock middleware (bypass auth) ─────────────────────────────────────────────
vi.mock('../../middleware/authenticate', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as Record<string, unknown>)['user'] = {
      id: 'user-1',
      role: 'PROGRAM_ADMIN',
      email: 'admin@test.com',
    };
    next();
  },
}));

vi.mock('../../middleware/authorize', () => ({
  requireRole: (..._roles: string[]) =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

// ── Mock service functions ────────────────────────────────────────────────────
const mockIngestDocument = vi.fn();
const mockSemanticSearch = vi.fn();
const mockChunkText = vi.fn();

vi.mock('../../modules/knowledge/knowledge.service', () => ({
  ingestDocument: (...args: unknown[]) => mockIngestDocument(...args),
  semanticSearch: (...args: unknown[]) => mockSemanticSearch(...args),
  chunkText: (...args: unknown[]) => mockChunkText(...args),
}));

// ── Mock repository functions ─────────────────────────────────────────────────
const mockListDocuments = vi.fn();
const mockGetDocument = vi.fn();
const mockDeleteDocument = vi.fn();
const mockGetChunksForDocument = vi.fn();

vi.mock('../../modules/knowledge/knowledge.repository', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
  getChunksForDocument: (...args: unknown[]) => mockGetChunksForDocument(...args),
}));

// ── Import router after mocks ─────────────────────────────────────────────────
const { knowledgeRouter } = await import('../../modules/knowledge/knowledge.routes');

const app = express();
app.use(express.json());
app.use('/api/knowledge', knowledgeRouter);

// ── Fake data ─────────────────────────────────────────────────────────────────
const FAKE_DOC = {
  id: 'doc-uuid-1',
  title: 'Test Doc',
  source_type: 'MANUAL',
  source_url: null,
  visibility_type: 'GLOBAL',
  institution_id: null,
  program_id: null,
  subdivision_id: null,
  metadata: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  chunk_count: 3,
};

const FAKE_SEARCH = {
  query: 'interview tips',
  context: '[Source 1: Test Doc]\nSome content.',
  results: [
    {
      chunk_id: 'c1',
      document_id: 'doc-uuid-1',
      document_title: 'Test Doc',
      chunk_index: 0,
      chunk_text: 'Some content.',
      similarity: 0.88,
    },
  ],
};

describe('GET /api/knowledge/documents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns document list', async () => {
    mockListDocuments.mockResolvedValueOnce([FAKE_DOC]);
    const res = await supertest(app).get('/api/knowledge/documents');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('doc-uuid-1');
  });

  it('returns empty array when no documents', async () => {
    mockListDocuments.mockResolvedValueOnce([]);
    const res = await supertest(app).get('/api/knowledge/documents');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST /api/knowledge/documents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ingests a document and returns 201', async () => {
    mockIngestDocument.mockResolvedValueOnce({ document: FAKE_DOC, chunks_created: 3 });
    const res = await supertest(app)
      .post('/api/knowledge/documents')
      .send({ title: 'Test Doc', text: 'Content here.' });
    expect(res.status).toBe(201);
    expect(res.body.data.chunks_created).toBe(3);
  });

  it('returns 422 when title is missing', async () => {
    const res = await supertest(app)
      .post('/api/knowledge/documents')
      .send({ text: 'No title here.' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when text is empty', async () => {
    const res = await supertest(app)
      .post('/api/knowledge/documents')
      .send({ title: 'Has title', text: '' });
    expect(res.status).toBe(422);
  });

  it('returns 500 when ingest service throws', async () => {
    mockIngestDocument.mockRejectedValueOnce(new Error('DB error'));
    const res = await supertest(app)
      .post('/api/knowledge/documents')
      .send({ title: 'Test', text: 'Some content.' });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/knowledge/documents/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns document when found', async () => {
    mockGetDocument.mockResolvedValueOnce(FAKE_DOC);
    const res = await supertest(app).get('/api/knowledge/documents/doc-uuid-1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('doc-uuid-1');
  });

  it('returns 404 when document not found', async () => {
    mockGetDocument.mockResolvedValueOnce(null);
    const res = await supertest(app).get('/api/knowledge/documents/missing-id');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/knowledge/documents/:id/chunks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns chunk list for a document', async () => {
    mockGetChunksForDocument.mockResolvedValueOnce([
      { id: 'c1', document_id: 'doc-uuid-1', chunk_index: 0, chunk_text: 'chunk A', embedding_model: 'text-embedding-3-small', source_metadata: null, created_at: '2026-01-01T00:00:00Z' },
    ]);
    const res = await supertest(app).get('/api/knowledge/documents/doc-uuid-1/chunks');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].chunk_index).toBe(0);
  });

  it('returns empty array when document has no chunks', async () => {
    mockGetChunksForDocument.mockResolvedValueOnce([]);
    const res = await supertest(app).get('/api/knowledge/documents/doc-uuid-1/chunks');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('DELETE /api/knowledge/documents/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes document and returns success', async () => {
    mockDeleteDocument.mockResolvedValueOnce(true);
    const res = await supertest(app).delete('/api/knowledge/documents/doc-uuid-1');
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it('returns 404 when document not found', async () => {
    mockDeleteDocument.mockResolvedValueOnce(false);
    const res = await supertest(app).delete('/api/knowledge/documents/missing-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/knowledge/search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns search results and context', async () => {
    mockSemanticSearch.mockResolvedValueOnce(FAKE_SEARCH);
    const res = await supertest(app)
      .post('/api/knowledge/search')
      .send({ query: 'interview tips', limit: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(1);
    expect(res.body.data.context).toContain('[Source 1:');
  });

  it('returns 422 when query is missing', async () => {
    const res = await supertest(app).post('/api/knowledge/search').send({});
    expect(res.status).toBe(422);
  });

  it('returns 422 when limit exceeds 20', async () => {
    const res = await supertest(app)
      .post('/api/knowledge/search')
      .send({ query: 'test', limit: 21 });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/knowledge/search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts q= query parameter', async () => {
    mockSemanticSearch.mockResolvedValueOnce(FAKE_SEARCH);
    const res = await supertest(app).get('/api/knowledge/search?q=interview+tips');
    expect(res.status).toBe(200);
    expect(mockSemanticSearch).toHaveBeenCalledWith('interview tips', 5, expect.any(Object));
  });

  it('returns 422 when q is missing', async () => {
    const res = await supertest(app).get('/api/knowledge/search');
    expect(res.status).toBe(422);
  });
});

describe('POST /api/knowledge/preview-chunks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns chunk preview without ingesting', async () => {
    mockChunkText.mockReturnValueOnce(['Chunk one text.', 'Chunk two text.']);
    const res = await supertest(app)
      .post('/api/knowledge/preview-chunks')
      .send({ text: 'Some text to preview.' });
    expect(res.status).toBe(200);
    expect(res.body.data.chunk_count).toBe(2);
    expect(mockIngestDocument).not.toHaveBeenCalled();
  });

  it('returns 422 when text is missing', async () => {
    const res = await supertest(app).post('/api/knowledge/preview-chunks').send({});
    expect(res.status).toBe(422);
  });
});
