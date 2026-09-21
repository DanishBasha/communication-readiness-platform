export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  modelName?: string;
}

export interface IModelAdapter {
  providerName: 'mock' | 'groq' | 'openai' | 'gemini';
  
  generateText(
    prompt: string,
    systemPrompt?: string,
    options?: ModelOptions
  ): Promise<string>;

  generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    systemPrompt?: string,
    options?: ModelOptions
  ): Promise<T>;
}
