import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { HttpEmbeddingClient, _setEmbeddingClient } from '../../modules/knowledge/embedding.client';

vi.mock('axios');
const mockedPost = vi.mocked(axios.post);

const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

describe('HttpEmbeddingClient.embedOne()', () => {
  let client: HttpEmbeddingClient;

  beforeEach(() => {
    client = new HttpEmbeddingClient('http://ai:8000', 5000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    _setEmbeddingClient(null);
  });

  it('returns the embedding array from the AI service', async () => {
    mockedPost.mockResolvedValueOnce({ data: { embedding: FAKE_EMBEDDING } });
    const result = await client.embedOne('hello world');
    expect(result).toEqual(FAKE_EMBEDDING);
    expect(mockedPost).toHaveBeenCalledWith(
      'http://ai:8000/ai/embed',
      { text: 'hello world' },
      { timeout: 5000 }
    );
  });

  it('throws a descriptive error when the service is unavailable', async () => {
    mockedPost.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(client.embedOne('test')).rejects.toThrow('Embedding service error: ECONNREFUSED');
  });

  it('throws on non-Error rejection', async () => {
    mockedPost.mockRejectedValueOnce('network timeout');
    await expect(client.embedOne('test')).rejects.toThrow('Embedding service error: network timeout');
  });
});

describe('HttpEmbeddingClient.embedBatch()', () => {
  let client: HttpEmbeddingClient;

  beforeEach(() => {
    client = new HttpEmbeddingClient('http://ai:8000', 5000);
    vi.clearAllMocks();
  });

  it('returns array of embeddings matching input count', async () => {
    const embeddings = [FAKE_EMBEDDING, FAKE_EMBEDDING];
    mockedPost.mockResolvedValueOnce({ data: { embeddings } });
    const result = await client.embedBatch(['text a', 'text b']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(FAKE_EMBEDDING);
    expect(mockedPost).toHaveBeenCalledWith(
      'http://ai:8000/ai/embed-batch',
      { texts: ['text a', 'text b'] },
      { timeout: 5000 }
    );
  });

  it('throws a descriptive error when batch call fails', async () => {
    mockedPost.mockRejectedValueOnce(new Error('timeout'));
    await expect(client.embedBatch(['a'])).rejects.toThrow('Embedding service error: timeout');
  });

  it('passes the correct timeout to axios', async () => {
    const slowClient = new HttpEmbeddingClient('http://ai:8000', 99000);
    mockedPost.mockResolvedValueOnce({ data: { embeddings: [FAKE_EMBEDDING] } });
    await slowClient.embedBatch(['x']);
    expect(mockedPost).toHaveBeenCalledWith(expect.any(String), expect.any(Object), { timeout: 99000 });
  });
});
