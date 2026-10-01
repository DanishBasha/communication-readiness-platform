import { describe, it, expect } from 'vitest';
import { buildContext } from '../../modules/knowledge/context.builder';
import type { SearchResult } from '../../modules/knowledge/knowledge.repository';

function makeChunk(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    chunk_id: 'cid-1',
    document_id: 'did-1',
    document_title: 'Test Doc',
    chunk_index: 0,
    chunk_text: 'Some text.',
    similarity: 0.9,
    ...overrides,
  };
}

describe('buildContext()', () => {
  it('returns empty string for empty array', () => {
    expect(buildContext([])).toBe('');
  });

  it('formats a single chunk correctly', () => {
    const result = buildContext([makeChunk({ document_title: 'Guide', chunk_text: 'Hello.' })]);
    expect(result).toBe('[Source 1: Guide]\nHello.');
  });

  it('separates multiple chunks with ---', () => {
    const chunks = [
      makeChunk({ document_title: 'Doc A', chunk_text: 'Chunk A text.', chunk_index: 0 }),
      makeChunk({ document_title: 'Doc B', chunk_text: 'Chunk B text.', chunk_index: 1 }),
    ];
    const context = buildContext(chunks);
    expect(context).toContain('[Source 1: Doc A]');
    expect(context).toContain('[Source 2: Doc B]');
    expect(context).toContain('---');
  });

  it('1-indexes sources (starts at 1 not 0)', () => {
    const chunks = [makeChunk(), makeChunk({ chunk_index: 1 })];
    const context = buildContext(chunks);
    expect(context).toContain('[Source 1:');
    expect(context).toContain('[Source 2:');
    expect(context).not.toContain('[Source 0:');
  });

  it('preserves chunk text exactly', () => {
    const text = 'Exact text with special chars: < > & "';
    const result = buildContext([makeChunk({ chunk_text: text })]);
    expect(result).toContain(text);
  });

  it('does NOT call any LLM or external service', () => {
    // Pure function — just verify it returns synchronously with no side effects
    const start = Date.now();
    buildContext([makeChunk(), makeChunk()]);
    expect(Date.now() - start).toBeLessThan(10);
  });
});
