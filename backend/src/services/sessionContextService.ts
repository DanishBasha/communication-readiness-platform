import Redis from 'ioredis';
import { db } from '../shared/db/pool';
import { env } from '../config/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TurnContext {
  turn: number;
  question: string;
  answer: string;
  difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED';
  ts: string; // ISO timestamp
}

// ── Redis connection (lazy singleton) ─────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });

    _redis.on('error', (err) => {
      // Log but do not crash — Redis is cache layer, not critical path for DB
      console.error('[SessionContext] Redis error:', err.message);
    });
  }
  return _redis;
}

// ── Session Context Service ───────────────────────────────────────────────────

export class SessionContextService {
  private redis: Redis;

  // TTL for each session context key: 2 hours (7200 seconds)
  private readonly SESSION_TTL_SECONDS = 7200;

  constructor(redis?: Redis) {
    this.redis = redis ?? getRedis();
  }

  private key(sessionId: string): string {
    return `session:${sessionId}:context`;
  }

  /**
   * Append a completed turn to the Redis list for this session.
   * Resets the TTL on each write so active sessions never expire mid-session.
   */
  async appendTurn(sessionId: string, turn: TurnContext): Promise<void> {
    const k = this.key(sessionId);
    const serialised = JSON.stringify(turn);

    // RPUSH to append, then refresh TTL
    await this.redis.rpush(k, serialised);
    await this.redis.expire(k, this.SESSION_TTL_SECONDS);
  }

  /**
   * Return the last N turns from Redis for LLM context injection.
   * Default: last 10 turns. Returns an empty array if Redis is unavailable.
   */
  async getTurns(sessionId: string, lastN = 10): Promise<TurnContext[]> {
    try {
      const k = this.key(sessionId);
      // LRANGE with negative indices: -lastN to -1 fetches the last N elements
      const items = await this.redis.lrange(k, -lastN, -1);
      return items.map((raw) => JSON.parse(raw) as TurnContext);
    } catch (err) {
      console.error('[SessionContext] getTurns error:', err);
      return [];
    }
  }

  /**
   * Flush the entire Redis context list to PostgreSQL session.interview_transcripts.
   * Uses INSERT ... ON CONFLICT DO NOTHING so it is safe to call multiple times
   * (idempotent — duplicate (session_id, turn_number) pairs are silently skipped).
   */
  async flushToDb(sessionId: string, studentId: string): Promise<void> {
    const k = this.key(sessionId);
    let items: string[];

    try {
      items = await this.redis.lrange(k, 0, -1);
    } catch (err) {
      console.error('[SessionContext] Redis lrange error during flush:', err);
      return;
    }

    if (items.length === 0) return;

    const turns = items.map((raw) => JSON.parse(raw) as TurnContext);

    // Batch insert — one round-trip per session flush
    const values = turns
      .map((_, i) => `($1, $2, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5}, $${i * 4 + 6})`)
      .join(', ');

    const params: (string | number)[] = [sessionId, studentId];
    for (const t of turns) {
      params.push(t.turn, t.question, t.answer, t.difficulty);
    }

    const sql = `
      INSERT INTO session.interview_transcripts
        (session_id, student_id, turn_number, question, answer, difficulty)
      VALUES ${values}
      ON CONFLICT (session_id, turn_number) DO NOTHING
    `;

    try {
      await db.query(sql, params);
    } catch (err) {
      console.error('[SessionContext] DB flush error:', err);
      // Do not re-throw — caller should not crash on flush failure;
      // the Redis copy is still intact for retry.
    }
  }

  /**
   * Delete the Redis context key after a successful flush.
   * Call this only after flushToDb completes without error.
   */
  async clearContext(sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.key(sessionId));
    } catch (err) {
      console.error('[SessionContext] clearContext error:', err);
    }
  }
}

// Exported singleton for use in route handlers
export const sessionContextService = new SessionContextService();
