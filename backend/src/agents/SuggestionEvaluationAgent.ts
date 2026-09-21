import { IModelAdapter } from '../adapters/models/IModelAdapter';

export interface SuggestionAnalysis {
  technicalTerminology: Array<{
    term: string;
    definition: string;
    betterAlternativeTo?: string;
  }>;
  communicationSuggestions: string[];
  structuralAdvice: string[];
}

export class SuggestionEvaluationAgent {
  constructor(private modelAdapter: IModelAdapter) {}

  async analyzeCommunication(userMessage: string): Promise<SuggestionAnalysis> {
    const prompt = `
Analyze the following student statement or answer draft to find communication weaknesses, missing concepts, and opportunities for professional terminology enhancement:

Student Input:
"${userMessage}"

Identify:
1. High-value industry technical terminology that can replace informal or vague explanations.
2. Observable communication habit improvements (e.g. reducing fillers, leading with the architecture).
3. Structural advice (e.g. S-T-A-R technique, stating scale/metrics first, articulating tradeoffs).
`;

    const schemaDescription = `
{
  "technicalTerminology": [
    {
      "term": "string (industry-standard term)",
      "definition": "string (concise definition)",
      "betterAlternativeTo": "string (informal phrase to replace)"
    }
  ],
  "communicationSuggestions": ["string", "string"],
  "structuralAdvice": ["string"]
}
`;

    const systemPrompt = `You are the Suggestion Evaluation Agent. Your sole responsibility is deep communication analysis, technical terminology enhancement, and structural coaching for technical placement interviews.`;

    return await this.modelAdapter.generateStructured<SuggestionAnalysis>(
      prompt,
      schemaDescription,
      systemPrompt,
      { temperature: 0.3 }
    );
  }
}
