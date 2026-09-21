import { IModelAdapter, ModelOptions } from './IModelAdapter';

export class GeminiModelAdapter implements IModelAdapter {
  public providerName = 'gemini' as const;
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async generateText(
    prompt: string,
    systemPrompt = 'You are a rigorous technical interviewer evaluating college candidates for high-stakes placement drives.',
    options?: ModelOptions
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is not configured.');
    }

    const model = options?.modelName || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1024
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    systemPrompt = 'You are an AI assessment evaluator. You must return ONLY valid JSON matching the exact schema.',
    options?: ModelOptions
  ): Promise<T> {
    const fullSystemPrompt = `${systemPrompt}\n\nSchema Requirement:\n${schemaDescription}\nReturn raw JSON only without markdown code blocks.`;
    const text = await this.generateText(prompt, fullSystemPrompt, {
      ...options,
      temperature: options?.temperature ?? 0.2
    });

    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}
