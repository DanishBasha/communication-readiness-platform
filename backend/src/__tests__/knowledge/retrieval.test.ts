import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock db pool ──────────────────────────────────────────────────────────────
const mockQuery = vi.fn();
vi.mock('../../shared/db/pool', () => ({
  db: { query: mockQuery },
}));

// ── Mock embedding client ─────────────────────────────────────────────────────
const mockEmbedOne = vi.fn();
vi.mock('../../modules/knowledge/embedding.client', () => ({
  getEmbeddingClient: () => ({ embedOne: mockEmbedOne, embedBatch: vi.fn() }),
  _setEmbeddingClient: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
const { searchSimilarChunks } = await import('../../modules/knowledge/knowledge.repository');
const { semanticSearch } = await import('../../modules/knowledge/knowledge.service');

const ZERO_VEC = Array(1536).fill(0);

const FAKE_ROWS = [
  {
    chunk_id: 'c1',
    document_id: 'd1',
    document_title: 'Interview Guide',
    chunk_index: 0,
    chunk_text: 'Relevant content about interviews.',
    similarity: 0.91,
  },
  {
    chunk_id: 'c2',
    document_id: 'd1',
    document_title: 'Interview Guide',
    chunk_index: 1,
    chunk_text: 'More relevant content.',
    similarity: 0.82,
  },
];

describe('searchSimilarChunks()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes query embedding and limit to db', async () => {
    mockQuery.mockResolvedValueOnce({ rows: FAKE_ROWS });
    await searchSimilarChunks(ZERO_VEC, 5);
    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('<=>');
    expect(params[1]).toBe(5);
  });

  it('returns rows ordered by similarity (from db)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: FAKE_ROWS });
    const results = await searchSimilarChunks(ZERO_VEC, 5);
    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it('returns empty array when no chunks match', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const results = await searchSimilarChunks(ZERO_VEC, 5);
    expect(results).toEqual([]);
  });

  it('applies institution_id filter when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await searchSimilarChunks(ZERO_VEC, 3, { institution_id: 'inst-uuid' });
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('institution_id');
    expect(params).toContain('inst-uuid');
  });

  it('includes ORDER BY in the query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await searchSimilarChunks(ZERO_VEC, 5);
    const [sql] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ORDER BY');
  });
});

describe('semanticSearch()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbedOne.mockResolvedValue(ZERO_VEC);
    mockQuery.mockResolvedValue({ rows: FAKE_ROWS });
  });

  it('embeds the query and passes embedding to repository', async () => {
    await semanticSearch('how to prepare for interviews', 2);
    expect(mockEmbedOne).toHaveBeenCalledWith('how to prepare for interviews');
  });

  it('returns results and context', async () => {
    const res = await semanticSearch('question', 2);
    expect(res.results).toHaveLength(2);
    expect(res.context).toContain('[Source 1:');
    expect(res.context).toContain('Interview Guide');
    expect(res.query).toBe('question');
  });

  it('throws when embedding service fails', async () => {
    mockEmbedOne.mockRejectedValueOnce(new Error('Embedding service error: ECONNREFUSED'));
    await expect(semanticSearch('test')).rejects.toThrow('Embedding service error');
  });

  it('returns empty context when no results', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await semanticSearch('unknown topic');
    expect(res.results).toEqual([]);
    expect(res.context).toBe('');
  });
});
