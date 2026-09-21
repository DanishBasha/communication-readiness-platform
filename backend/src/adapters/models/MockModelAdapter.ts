import { IModelAdapter, ModelOptions } from './IModelAdapter';

export class MockModelAdapter implements IModelAdapter {
  public providerName = 'mock' as const;

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: ModelOptions
  ): Promise<string> {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('question') || lowerPrompt.includes('interview')) {
      if (lowerPrompt.includes('easy')) {
        return 'Could you walk me through your experience building microservices with Kafka, and explain how consumer group rebalancing works?';
      } else if (lowerPrompt.includes('medium')) {
        return 'In your PostgreSQL database schema, how did you handle ACID transaction isolation to prevent race conditions during high-volume checkouts?';
      } else {
        return 'Can you compare the memory visibility guarantees of the Java volatile keyword against synchronized blocks at the CPU L1/L2 cache coherence level?';
      }
    }

    return 'Your explanation shows solid foundational knowledge. Focus on linking theoretical tradeoffs to measurable performance metrics in production.';
  }

  async generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    systemPrompt?: string,
    options?: ModelOptions
  ): Promise<T> {
    const lowerPrompt = prompt.toLowerCase();

    // 1. Final Diagnostic Report Generation (check before technicalScore which also appears in final report)
    if (schemaDescription.includes('overallScore') || lowerPrompt.includes('diagnostic report') || lowerPrompt.includes('synthesize the entire')) {
      const reportData = {
        overallScore: 84,
        technicalScore: 88,
        communicationScore: 76,
        skillBreakdown: [
          { skill: 'Java & Concurrency', score: 92, status: 'STRONG', recommendation: 'Outstanding precision regarding garbage collection and thread lifecycle.' },
          { skill: 'Distributed Messaging (Kafka)', score: 85, status: 'STRONG', recommendation: 'Clearly justified consumer group partitions and fault tolerance.' },
          { skill: 'Database Optimization (PostgreSQL)', score: 74, status: 'MODERATE', recommendation: 'Good knowledge of indexes; review query planner EXPLAIN ANALYZE.' },
          { skill: 'System Design & Tradeoffs', score: 60, status: 'NEEDS_WORK', recommendation: 'Review rate limiting algorithms (Token Bucket vs Leaky Bucket).' }
        ],
        actionableNextSteps: [
          'Maintain conversational pace: speaking speed of 126 WPM is right in the optimal range (120–150 WPM).',
          'Reduce habitual introductory fillers ("actually", "basically") when answering architecture questions.',
          'Review B-Tree composite index ordering to strengthen database optimization answers.'
        ]
      };
      return reportData as unknown as T;
    }

    // 2. Answer Evaluation
    if (schemaDescription.includes('technicalScore') || lowerPrompt.includes('evaluate answer')) {
      const evalData = {
        technicalScore: 86,
        communicationScore: 78,
        feedback: 'Articulated idempotency and consumer group offsets clearly. Good command of distributed system failure modes.',
        strengths: 'Concise explanation of Redis distributed locking and deduplication strategies.',
        weaknesses: 'Could elaborate more on partition lag monitoring and dead-letter queue recovery policies.'
      };
      return evalData as unknown as T;
    }

    // 2. Question Generation
    if (schemaDescription.includes('questionText')) {
      const questionData = {
        questionText: 'Looking at your project on high-throughput microservices, how did you configure Kafka partition keys to ensure strict ordering without creating consumer hot-spots?',
        difficulty: 'MEDIUM',
        targetSkill: 'Distributed Systems & Kafka',
        conceptEvaluated: 'Partition Key Hashing & Consumer Group Load Distribution'
      };
      return questionData as unknown as T;
    }

    // 3. Suggestion Chatbot (2-Agent Output)
    if (schemaDescription.includes('technicalTerminology') || lowerPrompt.includes('suggestion')) {
      const suggestionData = {
        conversationalReply: 'That is a good high-level overview. In technical campus interviews, you want to avoid informal phrasing like "it just works by checking stuff". Instead, explicitly state the concurrency primitive you used, such as "optimistic concurrency control via version columns" or "distributed lock with TTL".',
        technicalTerminology: [
          {
            term: 'Idempotent Consumer',
            definition: 'A consumer pattern ensuring messages processed multiple times yield identical system state without duplicate ledger entries.',
            betterAlternativeTo: 'checking if it is already done'
          },
          {
            term: 'Optimistic Concurrency Control (OCC)',
            definition: 'A concurrency management technique that assumes transactions will not conflict, validating version tags before committing.',
            betterAlternativeTo: 'locking the whole row'
          },
          {
            term: 'Exponential Backoff with Jitter',
            definition: 'A retry strategy that dynamically increases wait intervals with randomized jitter to prevent thundering herd problems.',
            betterAlternativeTo: 'retrying until it succeeds'
          }
        ],
        communicationSuggestions: [
          'Lead directly with the architectural pattern (e.g. "We adopted an Event-Driven Architecture") rather than conversational filler words.',
          'Replace "um" and "basically" with an intentional 1-second silence before explaining complex tradeoffs.'
        ],
        structuralAdvice: [
          'Use the S-T-A-R method: State the Scale (1,500 req/sec), the Bottleneck (Database contention), the Action (Redis cache + Kafka), and the Result (p99 latency < 45ms).'
        ]
      };
      return suggestionData as unknown as T;
    }

    // 5. Resume Extraction
    if (schemaDescription.includes('languages') || lowerPrompt.includes('resume')) {
      const resumeData = {
        summary: 'Dedicated Software Engineering student specializing in full-stack architecture, clean API design, and scalable backend services.',
        skills: {
          languages: ['Java', 'TypeScript', 'Python', 'SQL'],
          frameworks: ['Spring Boot', 'React', 'Node.js', 'Express', 'Tailwind CSS'],
          databases: ['PostgreSQL', 'Redis', 'MongoDB'],
          tools: ['Docker', 'Kafka', 'Git', 'AWS', 'Linux']
        },
        projects: [
          {
            title: 'High-Throughput Microservices Platform',
            techStack: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL'],
            description: 'Designed event-driven services handling concurrent order processing with Redis locking and idempotent consumers.'
          },
          {
            title: 'Full Stack Communication Readiness Portal',
            techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
            description: 'Implemented role-based preparation platform featuring real-time speech diagnostics and dynamic AI evaluations.'
          }
        ]
      };
      return resumeData as unknown as T;
    }

    return {} as T;
  }
}
