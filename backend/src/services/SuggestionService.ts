import { db } from '../config/database';
import { SuggestionConversationAgent } from '../agents/SuggestionConversationAgent';
import { SuggestionEvaluationAgent, SuggestionAnalysis } from '../agents/SuggestionEvaluationAgent';
import { SuggestionChatMessage } from '../types';

export class SuggestionService {
  constructor(
    private conversationAgent: SuggestionConversationAgent,
    private evaluationAgent: SuggestionEvaluationAgent
  ) {}

  async getOrCreateSession(studentId: string, title = 'Self-Improvement Coaching'): Promise<string> {
    const stuLookup = await db.query(
      'SELECT id FROM college.students WHERE id::text = $1 OR user_id::text = $1 OR roll_number = $1 OR ($1 = \'stu-101\' AND roll_number = \'21CS1084\') LIMIT 1;',
      [studentId]
    );
    const resolvedStudentId = (stuLookup.rowCount && stuLookup.rowCount > 0) ? stuLookup.rows[0].id : studentId;

    const existing = await db.query(`
      SELECT id FROM suggestions.chat_sessions
      WHERE student_id = $1
      ORDER BY updated_at DESC
      LIMIT 1;
    `, [resolvedStudentId]);

    if (existing.rowCount && existing.rowCount > 0) {
      return existing.rows[0].id;
    }

    const res = await db.query(`
      INSERT INTO suggestions.chat_sessions (student_id, title)
      VALUES ($1, $2)
      RETURNING id;
    `, [resolvedStudentId, title]);

    return res.rows[0].id;
  }

  async getChatHistory(sessionId: string): Promise<SuggestionChatMessage[]> {
    const res = await db.query(`
      SELECT 
        id, role, content, technical_terminology, communication_suggestions, structural_advice, created_at
      FROM suggestions.chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC;
    `, [sessionId]);

    return res.rows.map(r => ({
      id: r.id,
      role: r.role,
      content: r.content,
      technicalTerminology: r.technical_terminology || [],
      communicationSuggestions: r.communication_suggestions || [],
      structuralAdvice: r.structural_advice || [],
      createdAt: r.created_at
    }));
  }

  async processMessage(
    sessionId: string,
    userMessage: string
  ): Promise<{
    userMessage: SuggestionChatMessage;
    assistantMessage: SuggestionChatMessage;
  }> {
    // 1. Fetch recent history
    const history = await this.getChatHistory(sessionId);

    // 2. Save user message to database
    const userMsgRes = await db.query(`
      INSERT INTO suggestions.chat_messages (session_id, role, content)
      VALUES ($1, 'user', $2)
      RETURNING id, role, content, created_at;
    `, [sessionId, userMessage]);

    const savedUserMsg: SuggestionChatMessage = {
      id: userMsgRes.rows[0].id,
      role: 'user',
      content: userMsgRes.rows[0].content,
      createdAt: userMsgRes.rows[0].created_at
    };

    // 3. AGENT 1: Suggestion Conversation Agent handles conversation response
    const conversationReply = await this.conversationAgent.respondToUser(
      userMessage,
      history.map(h => ({ role: h.role, content: h.content }))
    );

    // 4. AGENT 2: Suggestion Evaluation Agent analyzes communication & terminology
    const evaluationAnalysis: SuggestionAnalysis = await this.evaluationAgent.analyzeCommunication(userMessage);

    // 5. Save assistant message with combined outputs from both agents
    const assistantMsgRes = await db.query(`
      INSERT INTO suggestions.chat_messages (
        session_id, role, content, technical_terminology, communication_suggestions, structural_advice
      )
      VALUES ($1, 'assistant', $2, $3, $4, $5)
      RETURNING id, role, content, technical_terminology, communication_suggestions, structural_advice, created_at;
    `, [
      sessionId,
      conversationReply,
      JSON.stringify(evaluationAnalysis.technicalTerminology),
      JSON.stringify(evaluationAnalysis.communicationSuggestions),
      JSON.stringify(evaluationAnalysis.structuralAdvice)
    ]);

    // Update session timestamp
    await db.query(`
      UPDATE suggestions.chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;
    `, [sessionId]);

    const savedAssistantMsg: SuggestionChatMessage = {
      id: assistantMsgRes.rows[0].id,
      role: 'assistant',
      content: assistantMsgRes.rows[0].content,
      technicalTerminology: assistantMsgRes.rows[0].technical_terminology,
      communicationSuggestions: assistantMsgRes.rows[0].communication_suggestions,
      structuralAdvice: assistantMsgRes.rows[0].structural_advice,
      createdAt: assistantMsgRes.rows[0].created_at
    };

    return {
      userMessage: savedUserMsg,
      assistantMessage: savedAssistantMsg
    };
  }
}
