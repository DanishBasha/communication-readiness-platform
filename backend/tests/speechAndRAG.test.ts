import { SpeechMetricsEngine } from '../src/adapters/speech/SpeechMetricsEngine';
import { InMemoryVectorStore } from '../src/adapters/vector/InMemoryVectorStore';
import { ContextBuilder } from '../src/rag/ContextBuilder';

describe('Speech Metrics Engine & Ephemeral Vector RAG', () => {
  const speechEngine = new SpeechMetricsEngine();

  it('should accurately calculate WPM and identify conversational filler words', async () => {
    const speech = "Uh, basically I used Kafka consumer groups, you know, to handle message streaming and actually avoid duplicate writes.";
    // 19 words, let's pass 8 seconds
    const metrics = await speechEngine.processTranscript(speech, 8);

    expect(metrics.wordCount).toBeGreaterThan(15);
    expect(metrics.wpm).toBeGreaterThan(100);
    expect(metrics.totalFillerWords).toBeGreaterThanOrEqual(3);
    expect(metrics.fillerWordBreakdown['uh']).toBe(1);
    expect(metrics.fillerWordBreakdown['basically']).toBe(1);
    expect(metrics.fillerWordBreakdown['actually']).toBe(1);
  });

  it('should initialize and query ephemeral session vectors, then cleanly purge', async () => {
    const vectorStore = new InMemoryVectorStore();
    const contextBuilder = new ContextBuilder(vectorStore);
    const sessionId = 'test-session-123';

    await contextBuilder.initializeSessionContext(
      sessionId,
      'HOPE_ELITE',
      'Full Stack Development',
      {
        fileName: 'resume.pdf',
        parsedAt: '2026-09-20',
        summary: 'Kafka and Spring Boot microservices developer',
        skills: {
          languages: ['Java', 'TypeScript'],
          frameworks: ['Spring Boot', 'React'],
          databases: ['PostgreSQL'],
          tools: ['Kafka', 'Docker']
        },
        projects: [
          {
            title: 'Payment Gateway',
            techStack: ['Java', 'Kafka', 'PostgreSQL'],
            description: 'Idempotent ledger with Redis locks.'
          }
        ]
      }
    );

    expect(vectorStore.hasSession(sessionId)).toBe(true);

    // Query similar
    const context = await contextBuilder.retrieveContextForTurn(sessionId, 'Kafka transaction ledger', 2);
    expect(context).toContain('Kafka');
    expect(context).toContain('Payment Gateway');

    // Purge
    await contextBuilder.cleanupSession(sessionId);
    expect(vectorStore.hasSession(sessionId)).toBe(false);
  });
});
