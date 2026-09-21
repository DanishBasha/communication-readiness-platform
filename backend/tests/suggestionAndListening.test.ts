import request from 'supertest';
import app from '../src/index';
import pool, { db } from '../src/config/database';

describe('Listening Comprehension & Suggestion Coach AI Module', () => {
  let studentId: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = `coach_test_${Date.now()}@college.edu`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Suggestion Test Candidate',
        email: testEmail,
        password: 'password123',
        role: 'STUDENT',
        rollNumber: `21CS${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Computer Science & Engineering',
        track: 'HOPE_ELITE'
      });

    studentId = regRes.body.user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Listening Comprehension Pipeline', () => {
    let listeningSessionId: string;
    let questions: any[];

    it('should start a listening comprehension session with audio passage and questions', async () => {
      const res = await request(app)
        .post('/api/listening/start')
        .send({ studentId });

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.passage).toBeDefined();
      expect(res.body.passage.narrativeText).toBeDefined();
      expect(res.body.passage.questions).toBeInstanceOf(Array);
      expect(res.body.passage.questions.length).toBeGreaterThan(0);

      listeningSessionId = res.body.sessionId;
      questions = res.body.passage.questions;
    });

    it('should enforce audio replay limits (max 2 replays allowed)', async () => {
      // 1st replay
      const rep1 = await request(app)
        .post(`/api/listening/${listeningSessionId}/replay`)
        .send();
      expect(rep1.status).toBe(200);
      expect(rep1.body.replaysUsed).toBe(1);

      // 2nd replay
      const rep2 = await request(app)
        .post(`/api/listening/${listeningSessionId}/replay`)
        .send();
      expect(rep2.status).toBe(200);
      expect(rep2.body.replaysUsed).toBe(2);

      // 3rd replay should be rejected
      const rep3 = await request(app)
        .post(`/api/listening/${listeningSessionId}/replay`)
        .send();
      expect(rep3.status).toBe(500);
      expect(rep3.body.error).toContain('Replay limit');
    });

    it('should evaluate submitted answers and compute accurate listening comprehension score', async () => {
      const answers = questions.map((q: any) => ({
        questionId: q.id,
        questionText: q.questionText,
        studentAnswer: q.expectedAnswer || 'Distributed Kafka consensus using Raft protocol'
      }));

      const res = await request(app)
        .post(`/api/listening/${listeningSessionId}/submit`)
        .send({ answers });

      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBeGreaterThanOrEqual(0);
      expect(res.body.evaluations).toBeInstanceOf(Array);
      expect(res.body.evaluations.length).toBe(questions.length);
    });
  });

  describe('Suggestion AI Coach System (Two-Agent Architecture)', () => {
    let suggestionSessionId: string;

    it('should create or retrieve a suggestion chat session', async () => {
      const res = await request(app)
        .post(`/api/suggestions/session/${studentId}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBeDefined();
      suggestionSessionId = res.body.sessionId;
    });

    it('should process candidate message with dual-agent synergy: conversational reply + terminology cards', async () => {
      const candidatePrompt = "Basically I kind of did some stuff with APIs to fix a very bad slow query bug.";

      const res = await request(app)
        .post(`/api/suggestions/${suggestionSessionId}/chat`)
        .send({ message: candidatePrompt });

      expect(res.status).toBe(200);
      // Conversation Agent output
      expect(res.body.assistantMessage).toBeDefined();
      expect(res.body.assistantMessage.content).toBeDefined();
      expect(typeof res.body.assistantMessage.content).toBe('string');
      expect(res.body.assistantMessage.content.length).toBeGreaterThan(10);

      // Evaluation Agent structured output
      expect(res.body.assistantMessage.technicalTerminology).toBeInstanceOf(Array);
      expect(res.body.assistantMessage.communicationSuggestions).toBeInstanceOf(Array);
      expect(res.body.assistantMessage.structuralAdvice).toBeInstanceOf(Array);
    });

    it('should persist conversation and evaluation cards in chat history', async () => {
      const res = await request(app)
        .get(`/api/suggestions/${suggestionSessionId}/history`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // user msg + coach response
      const coachMsg = res.body.find((m: any) => m.role === 'assistant');
      expect(coachMsg).toBeDefined();
      expect(coachMsg.technicalTerminology).toBeInstanceOf(Array);
    });
  });
});
