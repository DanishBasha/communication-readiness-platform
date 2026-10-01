import { env } from '../../config/env';
import { getEmbeddingClient } from './embedding.client';
import { buildContext } from './context.builder';
import {
  insertDocument,
  insertChunksBatch,
  deleteDocument,
  searchSimilarChunks,
  type SearchResult,
  type KnowledgeDocument,
} from './knowledge.repository';

// Must match knowledge.knowledge_chunks vector(1536) — do not change without a migration
const EXPECTED_EMBEDDING_DIM = 1536;

// ── Text chunker ──────────────────────────────────────────────────────────────

export function chunkText(
  text: string,
  chunkSize = env.RAG_CHUNK_SIZE,
  chunkOverlap = env.RAG_CHUNK_OVERLAP
): string[] {
  if (chunkOverlap >= chunkSize) {
    throw new Error(`chunkOverlap (${chunkOverlap}) must be less than chunkSize (${chunkSize})`);
  }
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length <= chunkSize) return cleaned.length > 0 ? [cleaned] : [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    if (end < cleaned.length) {
      const boundary = cleaned.lastIndexOf('\n\n', end);
      const sentence = cleaned.lastIndexOf('. ', end);
      const preferred = Math.max(boundary, sentence);
      if (preferred > start + chunkOverlap) {
        end = preferred + 1;
      }
    } else {
      end = cleaned.length;
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end >= cleaned.length) break;
    start = end - chunkOverlap;
  }

  return chunks;
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

  try {
    const chunkTexts = chunkText(opts.text);
    const embeddings = await getEmbeddingClient().embedBatch(chunkTexts);

    if (embeddings.length > 0 && embeddings[0].length !== EXPECTED_EMBEDDING_DIM) {
      throw new Error(
        `Embedding dimension mismatch: model returned ${embeddings[0].length} dims ` +
        `but the database expects ${EXPECTED_EMBEDDING_DIM}. ` +
        `Verify EMBEDDING_MODEL is compatible with vector(${EXPECTED_EMBEDDING_DIM}).`
      );
    }

    await insertChunksBatch(
      chunkTexts.map((t, i) => ({
        document_id: document.id,
        chunk_index: i,
        chunk_text: t,
        embedding: embeddings[i],
        embedding_model: env.EMBEDDING_MODEL,
      }))
    );

    return { document, chunks_created: chunkTexts.length };
  } catch (err) {
    // Best-effort cleanup: remove the orphaned document record if embedding/insert fails
    await deleteDocument(document.id).catch(() => {});
    throw err;
  }
}

// ── Re-embed existing document ────────────────────────────────────────────────

export async function reembedDocument(
  documentId: string,
  chunkTexts: string[]
): Promise<number> {
  const embeddings = await getEmbeddingClient().embedBatch(chunkTexts);

  await insertChunksBatch(
    chunkTexts.map((t, i) => ({
      document_id: documentId,
      chunk_index: i,
      chunk_text: t,
      embedding: embeddings[i],
      embedding_model: env.EMBEDDING_MODEL,
    }))
  );
  return chunkTexts.length;
}

// ── Semantic search ───────────────────────────────────────────────────────────

export async function semanticSearch(
  query: string,
  limit = env.RAG_TOP_K,
  filter?: { institution_id?: string; program_id?: string }
): Promise<{
  results: SearchResult[];
  query: string;
  context: string;
}> {
  const queryEmbedding = await getEmbeddingClient().embedOne(query);
  const results = await searchSimilarChunks(queryEmbedding, limit, filter);
  return { results, query, context: buildContext(results) };
}
