import { IModelAdapter } from '../adapters/models/IModelAdapter';

export class SuggestionConversationAgent {
  constructor(private modelAdapter: IModelAdapter) {}

  async respondToUser(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    const historyText = conversationHistory
      .slice(-4)
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `
The student has asked a question or drafted a technical answer:
"${userMessage}"

Recent Conversation Context:
${historyText || 'No prior context'}

Respond to the student helpfully and clearly, explaining the core technical concepts and direct advice.
Keep the response professional, encouraging, and focused on placement interview readiness.
`;

    const systemPrompt = `You are the Suggestion Conversation Agent for an institutional campus placement readiness platform. 
You provide immediate, high-clarity technical explanations and guidance to prepare engineering students for tough campus placement interviews.`;

    return await this.modelAdapter.generateText(prompt, systemPrompt, { temperature: 0.6 });
  }
}
