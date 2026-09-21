import { config } from '../../config/env';
import { IModelAdapter } from './IModelAdapter';
import { GroqModelAdapter } from './GroqModelAdapter';
import { OpenAIModelAdapter } from './OpenAIModelAdapter';
import { GeminiModelAdapter } from './GeminiModelAdapter';
import { MockModelAdapter } from './MockModelAdapter';

export class ModelFactory {
  private static instance: IModelAdapter | null = null;

  public static getModelAdapter(forcedProvider?: 'mock' | 'groq' | 'openai' | 'gemini'): IModelAdapter {
    if (forcedProvider) {
      return this.createAdapter(forcedProvider);
    }

    if (!this.instance) {
      this.instance = this.createAdapter(config.llm.provider);
    }
    return this.instance;
  }

  public static setModelAdapter(adapter: IModelAdapter): void {
    this.instance = adapter;
  }

  private static createAdapter(provider: 'mock' | 'groq' | 'openai' | 'gemini'): IModelAdapter {
    switch (provider) {
      case 'groq':
        if (!config.llm.groqApiKey) {
          console.warn('[ModelFactory] GROQ_API_KEY is not set. Falling back to MockModelAdapter.');
          return new MockModelAdapter();
        }
        return new GroqModelAdapter(config.llm.groqApiKey);

      case 'openai':
        if (!config.llm.openaiApiKey) {
          console.warn('[ModelFactory] OPENAI_API_KEY is not set. Falling back to MockModelAdapter.');
          return new MockModelAdapter();
        }
        return new OpenAIModelAdapter(config.llm.openaiApiKey);

      case 'gemini':
        if (!config.llm.geminiApiKey) {
          console.warn('[ModelFactory] GEMINI_API_KEY is not set. Falling back to MockModelAdapter.');
          return new MockModelAdapter();
        }
        return new GeminiModelAdapter(config.llm.geminiApiKey, config.llm.activeModel);

      case 'mock':
      default:
        return new MockModelAdapter();
    }
  }
}
