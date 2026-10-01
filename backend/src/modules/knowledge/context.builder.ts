import type { SearchResult } from './knowledge.repository';

/**
 * Converts retrieved chunks into an LLM-ready context string.
 * Input: top-K SearchResult objects from vector search.
 * Output: formatted string ready to inject into an LLM prompt.
 * Does NOT call the LLM.
 */
export function buildContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map((r, i) => `[Source ${i + 1}: ${r.document_title}]\n${r.chunk_text}`)
    .join('\n\n---\n\n');
}
