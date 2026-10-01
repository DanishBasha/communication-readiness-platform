import axios from 'axios';
import { env } from '../../config/env';

export interface EmbeddingClient {
  embedOne(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class HttpEmbeddingClient implements EmbeddingClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number
  ) {}

  async embedOne(text: string): Promise<number[]> {
    try {
      const res = await axios.post<{ embedding: number[] }>(
        `${this.baseUrl}/ai/embed`,
        { text },
        { timeout: this.timeoutMs }
      );
      return res.data.embedding;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Embedding service error: ${msg}`);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const res = await axios.post<{ embeddings: number[][] }>(
        `${this.baseUrl}/ai/embed-batch`,
        { texts },
        { timeout: this.timeoutMs }
      );
      return res.data.embeddings;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Embedding service error: ${msg}`);
    }
  }
}

let _client: EmbeddingClient | null = null;

export function getEmbeddingClient(): EmbeddingClient {
  if (!_client) {
    _client = new HttpEmbeddingClient(env.AI_SERVICE_URL, env.VLLM_TIMEOUT_MS);
  }
  return _client;
}

/** Swap the singleton — used in tests only. */
export function _setEmbeddingClient(client: EmbeddingClient | null): void {
  _client = client;
}
