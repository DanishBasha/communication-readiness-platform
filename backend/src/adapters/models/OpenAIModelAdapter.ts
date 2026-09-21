import { IModelAdapter, ModelOptions } from './IModelAdapter';

export class OpenAIModelAdapter implements IModelAdapter {
  public providerName = 'openai' as const;
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async generateText(
    prompt: string,
    systemPrompt = 'You are a technical interviewer assessing software engineering candidates.',
    options?: ModelOptions
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API Key is not configured.');
    }

    const model = options?.modelName || this.defaultModel;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    systemPrompt = 'You are an AI assessment evaluator. You must return ONLY valid JSON matching the exact schema.',
    options?: ModelOptions
  ): Promise<T> {
    const fullSystemPrompt = `${systemPrompt}\n\nSchema Requirement:\n${schemaDescription}\nReturn raw JSON only.`;
    const text = await this.generateText(prompt, fullSystemPrompt, {
      ...options,
      temperature: options?.temperature ?? 0.2
    });

    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}
