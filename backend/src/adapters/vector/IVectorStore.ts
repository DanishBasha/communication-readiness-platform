export interface VectorDocument {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface IVectorStore {
  createSessionCollection(sessionId: string): Promise<void>;
  addDocuments(sessionId: string, documents: VectorDocument[]): Promise<void>;
  querySimilar(sessionId: string, queryText: string, topK?: number): Promise<VectorSearchResult[]>;
  purgeSession(sessionId: string): Promise<void>;
  hasSession(sessionId: string): boolean;
}
