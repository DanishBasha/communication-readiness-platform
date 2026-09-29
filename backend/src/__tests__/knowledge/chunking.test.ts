import { describe, it, expect } from 'vitest';
import { chunkText } from '../../modules/knowledge/knowledge.service';

describe('chunkText()', () => {
  it('returns empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns single chunk when text fits within chunkSize', () => {
    const text = 'Hello world';
    expect(chunkText(text, 100, 10)).toEqual(['Hello world']);
  });

  it('returns single chunk when text is exactly chunkSize', () => {
    const text = 'a'.repeat(100);
    expect(chunkText(text, 100, 10)).toEqual([text]);
  });

  it('splits long text into multiple chunks', () => {
    const text = 'a'.repeat(2500);
    const chunks = chunkText(text, 1000, 100);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(1000));
  });

  it('no infinite loop — terminates when overlap < chunk size', () => {
    // This would loop forever with the old bug when end >= length
    const text = 'word '.repeat(500); // ~2500 chars
    const chunks = chunkText(text, 1000, 200);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThan(20); // sanity upper bound
  });

  it('chunks cover all content — no data dropped', () => {
    // Join all chunk chars (with overlap) — every char from original should appear in at least one chunk
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(60); // ~2700 chars
    const chunks = chunkText(text, 1000, 100);
    expect(chunks.length).toBeGreaterThan(1);
    // First char of text should appear in first chunk, last char in last chunk
    expect(chunks[0]).toContain('The quick');
    expect(chunks[chunks.length - 1].trimEnd().endsWith('dog.')).toBe(true);
  });

  it('prefers paragraph boundaries over hard split', () => {
    const para1 = 'First paragraph content. '.repeat(20); // ~500 chars
    const para2 = 'Second paragraph content. '.repeat(20); // ~520 chars
    const text = para1 + '\n\n' + para2;
    const chunks = chunkText(text, 600, 50);
    // Should not split mid-word inside a paragraph if boundary found
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('handles Windows-style line endings (\\r\\n)', () => {
    const text = 'Line one.\r\nLine two.\r\nLine three.';
    const [chunk] = chunkText(text, 200, 20);
    expect(chunk).toContain('Line one.');
    expect(chunk).not.toContain('\r');
  });

  it('trims whitespace from each chunk', () => {
    const text = '  ' + 'content '.repeat(300) + '  ';
    const chunks = chunkText(text, 1000, 100);
    chunks.forEach(c => {
      expect(c[0]).not.toBe(' ');
      expect(c[c.length - 1]).not.toBe(' ');
    });
  });

  it('overlap is respected between consecutive chunks', () => {
    const text = '0123456789'.repeat(250); // 2500 chars, no natural boundaries
    const chunkSize = 1000;
    const overlap = 200;
    const chunks = chunkText(text, chunkSize, overlap);
    expect(chunks.length).toBeGreaterThan(1);
    // The tail of chunk[0] should appear at the start of chunk[1]
    const tailOfFirst = chunks[0].slice(-overlap);
    expect(chunks[1]).toContain(tailOfFirst.slice(0, 50));
  });

  it('returns [] for whitespace-only input', () => {
    expect(chunkText('   ')).toEqual([]);
    expect(chunkText('\n\n\n')).toEqual([]);
    expect(chunkText('\t  \r\n  ')).toEqual([]);
  });

  it('handles zero overlap without looping', () => {
    const text = 'word '.repeat(500); // ~2500 chars
    const chunks = chunkText(text, 1000, 0);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(10);
  });

  it('throws when chunkOverlap >= chunkSize', () => {
    expect(() => chunkText('some text', 100, 100)).toThrow('chunkOverlap');
    expect(() => chunkText('some text', 100, 150)).toThrow('chunkOverlap');
  });
});
