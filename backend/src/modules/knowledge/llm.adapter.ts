import axios from 'axios';
import { env } from '../../config/env';

export interface LLMAdapter {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
}

export class VLLMAdapter implements LLMAdapter {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number
  ) {
    // Strip trailing slash. VLLM_BASE_URL must include the /v1 path segment
    // e.g. http://host:8000/v1  → calls http://host:8000/v1/chat/completions
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    try {
      const res = await axios.post<ChatCompletionResponse>(
        `${this.baseUrl}/chat/completions`,
        { model: this.model, messages },
        { timeout: this.timeoutMs }
      );
      return res.data.choices[0]?.message?.content ?? '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`LLM adapter error: ${msg}`);
    }
  }
}

export class MockLLMAdapter implements LLMAdapter {
  async complete(prompt: string): Promise<string> {
    return `[MockLLM] Received prompt of ${prompt.length} chars`;
  }
}

export function createLLMAdapter(): LLMAdapter {
  if (env.VLLM_BASE_URL) {
    return new VLLMAdapter(env.VLLM_BASE_URL, env.VLLM_MODEL, env.VLLM_TIMEOUT_MS);
  }
  return new MockLLMAdapter();
}
