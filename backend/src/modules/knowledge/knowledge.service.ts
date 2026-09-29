import axios from 'axios';
import { env } from '../../config/env';
import {
  insertDocument,
  insertChunksBatch,
  searchSimilarChunks,
  type SearchResult,
  type KnowledgeDocument,
} from './knowledge.repository';

// ── Text chunker ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = parseInt(process.env.KNOWLEDGE_CHUNK_SIZE ?? '2000', 10);
const CHUNK_OVERLAP = parseInt(process.env.KNOWLEDGE_CHUNK_OVERLAP ?? '200', 10);

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + CHUNK_SIZE;

    // Try to end on a sentence or paragraph boundary
    if (end < cleaned.length) {
      const boundary = cleaned.lastIndexOf('\n\n', end);
      const sentence = cleaned.lastIndexOf('. ', end);
      const preferred = Math.max(boundary, sentence);
      if (preferred > start + CHUNK_OVERLAP) {
        end = preferred + 1;
      }
    } else {
      end = cleaned.length;
    }

    chunks.push(cleaned.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start >= cleaned.length) break;
  }

  return chunks.filter(c => c.length > 0);
}

// ── Embedding via AI service ──────────────────────────────────────────────────

async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const url = `${env.AI_SERVICE_URL}/ai/embed-batch`;
  try {
    const res = await axios.post<{ embeddings: number[][] }>(
      url,
      { texts },
      { timeout: env.VLLM_TIMEOUT_MS ?? 30000 }
    );
    return res.data.embeddings;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Embedding service error: ${msg}`);
  }
}

// ── Document ingestion ────────────────────────────────────────────────────────

export interface IngestOptions {
  title: string;
  text: string;
  source_type?: string;
  source_url?: string;
  visibility_type?: string;
  institution_id?: string;
  program_id?: string;
  subdivision_id?: string;
  metadata?: Record<string, unknown>;
}

export async function ingestDocument(opts: IngestOptions): Promise<{
  document: KnowledgeDocument;
  chunks_created: number;
}> {
  // 1. Insert the document record first
  const document = await insertDocument({
    title: opts.title,
    source_type: opts.source_type,
    source_url: opts.source_url,
    visibility_type: opts.visibility_type ?? 'GLOBAL',
    institution_id: opts.institution_id,
    program_id: opts.program_id,
    subdivision_id: opts.subdivision_id,
    metadata: opts.metadata,
  });

  // 2. Chunk the text
  const chunkTexts = chunkText(opts.text);

  // 3. Generate embeddings (batch call to avoid N round-trips)
  const embeddings = await getEmbeddingsBatch(chunkTexts);

  // 4. Persist chunks with embeddings
  const embeddingModel = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
  await insertChunksBatch(
    chunkTexts.map((text, i) => ({
      document_id: document.id,
      chunk_index: i,
      chunk_text: text,
      embedding: embeddings[i],
      embedding_model: embeddingModel,
    }))
  );

  return { document, chunks_created: chunkTexts.length };
}

// ── Re-embed existing document ────────────────────────────────────────────────

export async function reembedDocument(
  documentId: string,
  chunkTexts: string[]
): Promise<number> {
  const embeddings = await getEmbeddingsBatch(chunkTexts);
  const embeddingModel = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';

  await insertChunksBatch(
    chunkTexts.map((text, i) => ({
      document_id: documentId,
      chunk_index: i,
      chunk_text: text,
      embedding: embeddings[i],
      embedding_model: embeddingModel,
    }))
  );
  return chunkTexts.length;
}

// ── Semantic search ───────────────────────────────────────────────────────────

export async function semanticSearch(
  query: string,
  limit = 5,
  filter?: { institution_id?: string; program_id?: string }
): Promise<{
  results: SearchResult[];
  query: string;
  context: string;
}> {
  // Get query embedding from AI service
  const url = `${env.AI_SERVICE_URL}/ai/embed`;
  let queryEmbedding: number[];

  try {
    const res = await axios.post<{ embedding: number[] }>(
      url,
      { text: query },
      { timeout: env.VLLM_TIMEOUT_MS ?? 30000 }
    );
    queryEmbedding = res.data.embedding;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Embedding service error: ${msg}`);
  }

  const results = await searchSimilarChunks(queryEmbedding, limit, filter);

  // Construct LLM context string from top-K chunks
  const context = results
    .map((r, i) =>
      `[Source ${i + 1}: ${r.document_title}]\n${r.chunk_text}`
    )
    .join('\n\n---\n\n');

  return { results, query, context };
}
