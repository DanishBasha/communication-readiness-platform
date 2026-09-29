import { db } from '../../shared/db/pool';

export interface KnowledgeDocument {
  id: string;
  title: string;
  source_type: string | null;
  source_url: string | null;
  visibility_type: string | null;
  institution_id: string | null;
  program_id: string | null;
  subdivision_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding_model: string | null;
  source_metadata: Record<string, unknown> | null;
  created_at: string;
  // similarity score when returned from search (not stored in DB)
  similarity?: number;
}

export interface ChunkInsert {
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  embedding_model: string;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function insertDocument(data: {
  title: string;
  source_type?: string;
  source_url?: string;
  visibility_type?: string;
  institution_id?: string;
  program_id?: string;
  subdivision_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<KnowledgeDocument> {
  const { rows } = await db.query<KnowledgeDocument>(
    `INSERT INTO knowledge.knowledge_documents
       (title, source_type, source_url, visibility_type,
        institution_id, program_id, subdivision_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.title,
      data.source_type ?? null,
      data.source_url ?? null,
      data.visibility_type ?? 'GLOBAL',
      data.institution_id ?? null,
      data.program_id ?? null,
      data.subdivision_id ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  return rows[0];
}

export async function getDocument(id: string): Promise<KnowledgeDocument | null> {
  const { rows } = await db.query<KnowledgeDocument>(
    `SELECT d.*,
            COUNT(c.id)::int AS chunk_count
     FROM knowledge.knowledge_documents d
     LEFT JOIN knowledge.knowledge_chunks c ON c.document_id = d.id
     WHERE d.id = $1
     GROUP BY d.id`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listDocuments(filter?: {
  institution_id?: string;
  program_id?: string;
  visibility_type?: string;
}): Promise<KnowledgeDocument[]> {
  const conditions: string[] = [];
  const params: (string | null)[] = [];
  let idx = 1;

  if (filter?.institution_id) {
    conditions.push(`(d.institution_id = $${idx} OR d.visibility_type = 'GLOBAL')`);
    params.push(filter.institution_id);
    idx++;
  }
  if (filter?.program_id) {
    conditions.push(`(d.program_id = $${idx} OR d.program_id IS NULL)`);
    params.push(filter.program_id);
    idx++;
  }
  if (filter?.visibility_type) {
    conditions.push(`d.visibility_type = $${idx}`);
    params.push(filter.visibility_type);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query<KnowledgeDocument>(
    `SELECT d.*,
            COUNT(c.id)::int AS chunk_count
     FROM knowledge.knowledge_documents d
     LEFT JOIN knowledge.knowledge_chunks c ON c.document_id = d.id
     ${where}
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    params
  );
  return rows;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const { rowCount } = await db.query(
    'DELETE FROM knowledge.knowledge_documents WHERE id = $1',
    [id]
  );
  return (rowCount ?? 0) > 0;
}

// ── Chunks ────────────────────────────────────────────────────────────────────

export async function insertChunksBatch(chunks: ChunkInsert[]): Promise<void> {
  if (chunks.length === 0) return;

  // Delete existing chunks for this document before re-inserting (idempotent re-embed)
  const documentId = chunks[0].document_id;
  await db.query(
    'DELETE FROM knowledge.knowledge_chunks WHERE document_id = $1',
    [documentId]
  );

  // Batch insert all chunks in a single round-trip
  const values: unknown[] = [];
  const placeholders = chunks.map((c, i) => {
    const base = i * 5;
    values.push(
      c.document_id,
      c.chunk_index,
      c.chunk_text,
      `[${c.embedding.join(',')}]`,  // pgvector literal format
      c.embedding_model
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector, $${base + 5})`;
  });

  await db.query(
    `INSERT INTO knowledge.knowledge_chunks
       (document_id, chunk_index, chunk_text, embedding, embedding_model)
     VALUES ${placeholders.join(', ')}`,
    values
  );
}

export async function getChunksForDocument(documentId: string): Promise<KnowledgeChunk[]> {
  const { rows } = await db.query<KnowledgeChunk>(
    `SELECT id, document_id, chunk_index, chunk_text,
            embedding_model, source_metadata, created_at
     FROM knowledge.knowledge_chunks
     WHERE document_id = $1
     ORDER BY chunk_index`,
    [documentId]
  );
  return rows;
}

// ── Vector Search ─────────────────────────────────────────────────────────────

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit = 5,
  filter?: {
    institution_id?: string;
    program_id?: string;
  }
): Promise<SearchResult[]> {
  const conditions: string[] = [];
  const params: unknown[] = [`[${queryEmbedding.join(',')}]`, limit];
  let idx = 3;

  if (filter?.institution_id) {
    conditions.push(
      `(d.institution_id = $${idx} OR d.institution_id IS NULL OR d.visibility_type = 'GLOBAL')`
    );
    params.push(filter.institution_id);
    idx++;
  }
  if (filter?.program_id) {
    conditions.push(`(d.program_id = $${idx} OR d.program_id IS NULL)`);
    params.push(filter.program_id);
    idx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const { rows } = await db.query<SearchResult>(
    `SELECT
       c.id          AS chunk_id,
       c.document_id,
       d.title       AS document_title,
       c.chunk_index,
       c.chunk_text,
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM knowledge.knowledge_chunks c
     JOIN knowledge.knowledge_documents d ON d.id = c.document_id
     ${where}
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    params
  );
  return rows;
}
