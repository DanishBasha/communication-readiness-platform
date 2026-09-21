import { IModelAdapter } from '../adapters/models/IModelAdapter';
import { ContextBuilder } from '../rag/ContextBuilder';
import { Difficulty, QuestionTurn, DiagnosticReport } from '../types';

export interface GeneratedQuestion {
  questionText: string;
  difficulty: Difficulty;
  targetSkill: string;
  conceptEvaluated: string;
}

export interface TurnEvaluation {
  technicalScore: number;
  communicationScore: number;
  feedback: string;
  strengths: string;
  weaknesses: string;
}

export interface FinalReportEvaluation {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  skillBreakdown: {
    skill: string;
    score: number;
    status: 'STRONG' | 'MODERATE' | 'NEEDS_WORK';
    recommendation: string;
  }[];
  actionableNextSteps: string[];
}

export class InterviewAgent {
  constructor(
    private modelAdapter: IModelAdapter,
    private contextBuilder: ContextBuilder
  ) {}

  async generateNextQuestion(
    sessionId: string,
    turnNumber: number,
    difficulty: Difficulty,
    targetTopic: string
  ): Promise<GeneratedQuestion> {
    // 1. Retrieve grounded resume context via RAG
    const ragContext = await this.contextBuilder.retrieveContextForTurn(sessionId, targetTopic, 3);

    // 2. Build prompt for ModelAdapter
    const prompt = `
Generate a realistic, high-caliber campus placement technical interview question.

Candidate Profile & Project Grounding:
${ragContext}

Constraints:
- Turn Number: ${turnNumber} of 4.
- Target Difficulty Level: ${difficulty}.
- The question must strictly ground itself in the candidate's actual projects, frameworks, or database technologies listed above.
- Make it sound like an experienced engineering interviewer probing real production decisions and tradeoffs.
`;

    const schemaDescription = `
{
  "questionText": "string (the interview question)",
  "difficulty": "EASY | MEDIUM | ADVANCED",
  "targetSkill": "string (e.g. Distributed Systems & Kafka)",
  "conceptEvaluated": "string"
}
`;

    const result = await this.modelAdapter.generateStructured<GeneratedQuestion>(
      prompt,
      schemaDescription,
      'You are a senior technical interviewer at a top technology company conducting a proctored placement interview.'
    );

    return {
      questionText: result.questionText || 'Explain how your distributed microservices pipeline handles concurrent failures.',
      difficulty: difficulty,
      targetSkill: result.targetSkill || 'System Design',
      conceptEvaluated: result.conceptEvaluated || 'Failure Recovery'
    };
  }

  async evaluateAnswer(
    sessionId: string,
    questionText: string,
    studentAnswer: string,
    difficulty: Difficulty,
    wpm: number,
    fillerCount: number
  ): Promise<TurnEvaluation> {
    const ragContext = await this.contextBuilder.retrieveContextForTurn(sessionId, questionText, 2);

    const prompt = `
Evaluate the student's spoken interview answer for technical correctness and communication clarity.

Question Asked:
"${questionText}" (${difficulty} difficulty)

Candidate Spoken Answer:
"${studentAnswer}"

Speech Metrics:
- Pace: ${wpm} WPM
- Filler Words Detected: ${fillerCount}

Candidate Resume Background Context:
${ragContext}

Evaluation Criteria:
1. Technical correctness and depth of explanation.
2. Directness, clarity, and articulation.
3. Proper usage of technical terminology.
4. Identification of specific strengths and weaknesses.
`;

    const schemaDescription = `
{
  "technicalScore": number (0 to 100),
  "communicationScore": number (0 to 100),
  "feedback": "string (constructive feedback)",
  "strengths": "string (what the candidate did well)",
  "weaknesses": "string (conceptual or delivery gaps)"
}
`;

    return await this.modelAdapter.generateStructured<TurnEvaluation>(
      prompt,
      schemaDescription,
      'You are a rigorous technical interview evaluator. Be objective, accurate, and constructive.'
    );
  }

  async generateFinalDiagnosticReport(
    sessionId: string,
    turns: QuestionTurn[],
    averageWpm: number,
    totalFillers: number,
    tabSwitches: number,
    isFlagged: boolean
  ): Promise<FinalReportEvaluation> {
    const transcriptSummary = turns.map(t => `
Turn ${t.questionNumber} (${t.difficulty}):
Q: "${t.questionText}"
A: "${t.studentAnswer || 'No response recorded'}"
Technical Score: ${t.technicalScore ?? 75}/100, Communication Score: ${t.communicationScore ?? 70}/100
Feedback: ${t.feedback || 'N/A'}
Strengths: ${t.strengths || 'N/A'}
Weaknesses: ${t.weaknesses || 'N/A'}
`).join('\n---\n');

    const prompt = `
Synthesize the entire mock interview session into an institutional placement readiness report card.

Interview Turns Summary:
${transcriptSummary}

Aggregate Speech Diagnostics:
- Average Speaking Pace: ${averageWpm} WPM
- Total Filler Words: ${totalFillers}
- Proctoring Tab Switches: ${tabSwitches} (Flagged: ${isFlagged})

Generate:
1. Overall score, technical score, and communication score (0-100).
2. Competency breakdown across 3-4 specific technical skills evaluated during the interview.
3. 3 concrete, actionable next steps tailored for the candidate.
`;

    const schemaDescription = `
{
  "overallScore": number (0 to 100),
  "technicalScore": number (0 to 100),
  "communicationScore": number (0 to 100),
  "skillBreakdown": [
    {
      "skill": "string",
      "score": number,
      "status": "STRONG | MODERATE | NEEDS_WORK",
      "recommendation": "string"
    }
  ],
  "actionableNextSteps": ["string", "string", "string"]
}
`;

    return await this.modelAdapter.generateStructured<FinalReportEvaluation>(
      prompt,
      schemaDescription,
      'You are the chief placement evaluation system generating a verified institutional readiness report.'
    );
  }
}
