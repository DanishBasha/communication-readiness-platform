import { IModelAdapter, ModelOptions } from './IModelAdapter';
import { MockModelAdapter } from './MockModelAdapter';

export class GroqModelAdapter implements IModelAdapter {
  public providerName = 'groq' as const;
  private apiKey: string;
  private defaultModel: string;
  private fallbackAdapter = new MockModelAdapter();

  constructor(apiKey: string, defaultModel = 'openai/gpt-oss-120b') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined && process.env.NODE_ENV !== 'production') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  async generateText(
    prompt: string,
    systemPrompt = 'You are a strict and knowledgeable technical interviewer at a tier-1 technology firm.',
    options?: ModelOptions
  ): Promise<string> {
    if (!this.apiKey) {
      return this.fallbackAdapter.generateText(prompt, systemPrompt, options);
    }

    try {
      const model = options?.modelName || this.defaultModel;
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1024
        })
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`[GroqModelAdapter] API error (${response.status}): ${err}. Using fallback adapter.`);
        return this.fallbackAdapter.generateText(prompt, systemPrompt, options);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || this.fallbackAdapter.generateText(prompt, systemPrompt, options);
    } catch (error) {
      console.warn('[GroqModelAdapter] Request error, using fallback adapter:', error);
      return this.fallbackAdapter.generateText(prompt, systemPrompt, options);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    systemPrompt = 'You are an AI assessment evaluator. You must return ONLY valid JSON matching the exact schema.',
    options?: ModelOptions
  ): Promise<T> {
    try {
      const fullSystemPrompt = `${systemPrompt}\n\nSchema Requirement:\n${schemaDescription}\nReturn raw JSON only without markdown formatting.`;
      const text = await this.generateText(prompt, fullSystemPrompt, {
        ...options,
        temperature: options?.temperature ?? 0.2
      });

      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      console.warn('[GroqModelAdapter] Structured generation failed, using fallback adapter:', err);
      return this.fallbackAdapter.generateStructured<T>(prompt, schemaDescription, systemPrompt, options);
    }
  }
}

