import { IVectorStore, VectorDocument, VectorSearchResult } from './IVectorStore';

interface IndexedDoc {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  termVector: Map<string, number>;
  magnitude: number;
}

export class InMemoryVectorStore implements IVectorStore {
  // Session ID -> Array of indexed documents
  private sessions: Map<string, IndexedDoc[]> = new Map();
  private sessionTimestamps: Map<string, number> = new Map();

  constructor(private sessionTimeoutMs = 60 * 60 * 1000) { // 1 hour default
    // Periodically clean stale sessions
    const interval = setInterval(() => this.cleanStaleSessions(), 15 * 60 * 1000);
    if (interval.unref) interval.unref();
  }

  async createSessionCollection(sessionId: string): Promise<void> {
    this.sessions.set(sessionId, []);
    this.sessionTimestamps.set(sessionId, Date.now());
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  async addDocuments(sessionId: string, documents: VectorDocument[]): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      await this.createSessionCollection(sessionId);
    }

    const collection = this.sessions.get(sessionId)!;

    for (const doc of documents) {
      const vector = this.computeTermVector(doc.text);
      const magnitude = this.computeMagnitude(vector);
      collection.push({
        id: doc.id,
        text: doc.text,
        metadata: doc.metadata,
        termVector: vector,
        magnitude
      });
    }

    this.sessionTimestamps.set(sessionId, Date.now());
  }

  async querySimilar(sessionId: string, queryText: string, topK = 3): Promise<VectorSearchResult[]> {
    const collection = this.sessions.get(sessionId);
    if (!collection || collection.length === 0) {
      return [];
    }

    const queryVector = this.computeTermVector(queryText);
    const queryMagnitude = this.computeMagnitude(queryVector);

    if (queryMagnitude === 0) {
      return collection.slice(0, topK).map(d => ({ id: d.id, text: d.text, score: 0, metadata: d.metadata }));
    }

    const scored: VectorSearchResult[] = [];

    for (const doc of collection) {
      if (doc.magnitude === 0) continue;
      const dotProduct = this.computeDotProduct(queryVector, doc.termVector);
      const similarity = dotProduct / (queryMagnitude * doc.magnitude);
      scored.push({
        id: doc.id,
        text: doc.text,
        score: Math.round(similarity * 100) / 100,
        metadata: doc.metadata
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async purgeSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.sessionTimestamps.delete(sessionId);
  }

  private computeTermVector(text: string): Map<string, number> {
    const vector = new Map<string, number>();
    const tokens = text.toLowerCase().match(/\b[a-z0-9+#.-]{2,}\b/g) || [];

    for (const token of tokens) {
      vector.set(token, (vector.get(token) || 0) + 1);
    }
    return vector;
  }

  private computeMagnitude(vector: Map<string, number>): number {
    let sumSquares = 0;
    for (const val of vector.values()) {
      sumSquares += val * val;
    }
    return Math.sqrt(sumSquares);
  }

  private computeDotProduct(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dot = 0;
    for (const [term, valA] of vecA.entries()) {
      const valB = vecB.get(term);
      if (valB) {
        dot += valA * valB;
      }
    }
    return dot;
  }

  private cleanStaleSessions() {
    const now = Date.now();
    for (const [sessionId, lastActive] of this.sessionTimestamps.entries()) {
      if (now - lastActive > this.sessionTimeoutMs) {
        this.purgeSession(sessionId);
      }
    }
  }
}
