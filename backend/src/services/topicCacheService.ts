/**
 * Persistent Cache Service for Topics, Questions, and Rubrics
 *
 * This service provides a persistent caching layer that stores LLM-generated
 * questions and rubrics by topic. Unlike the session-based cache, this cache:
 * - Persists across sessions
 * - Is reusable by multiple users
 * - Has configurable TTL (default: 7 days)
 * - Stores questions and rubrics as lists for each topic
 */

import { createClient } from 'redis';
import { env } from '../config/env';

type RedisClient = ReturnType<typeof createClient>;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestionRubricPair {
  question: string;
  rubric: Record<string, unknown>;
  difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED';
  createdAt: string;
}

export interface TopicCache {
  topic: string;
  items: QuestionRubricPair[];
  lastUpdated: string;
}

// ── Redis connection (lazy singleton) ─────────────────────────────────────────

let _redis: RedisClient | null = null;
let _connectPromise: Promise<unknown> | null = null;

async function getRedis(): Promise<RedisClient> {
  if (_redis?.isReady) return _redis;

  if (_connectPromise) {
    await _connectPromise;
    if (_redis?.isReady) return _redis;
  }

  _redis = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
    },
  });

  _redis.on('error', (err: Error) => {
    console.error('[TopicCache] Redis error:', err.message);
  });

  _connectPromise = _redis.connect().catch((err: Error) => {
    console.error('[TopicCache] Redis connect failed:', err.message);
    _connectPromise = null;
    _redis = null;
    throw err;
  });

  await _connectPromise;
  return _redis;
}

// ── Topic Cache Service ───────────────────────────────────────────────────────

export class TopicCacheService {
  // Default TTL: 7 days (604800 seconds)
  private readonly DEFAULT_TTL_SECONDS = 604800;

  /**
   * Generate cache key for a topic
   * Normalizes the topic string to lowercase and trims whitespace
   */
  private topicKey(topic: string): string {
    const normalizedTopic = topic.trim().toLowerCase();
    return `topic:cache:${normalizedTopic}`;
  }

  /**
   * Normalize topic string for consistent caching
   * - Converts to lowercase
   * - Trims whitespace
   * - Replaces multiple spaces with single space
   */
  private normalizeTopic(topic: string): string {
    return topic.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Extract key topic/concept from a question
   * Simple implementation - extracts main subject matter
   * Can be enhanced with NLP for better extraction
   */
  extractTopicFromQuestion(question: string): string | null {
    // Remove question marks and common question starters
    let cleaned = question
      .toLowerCase()
      .replace(/\?/g, '')
      .replace(/^(what|how|why|when|where|who|which|explain|describe|define)\s+(is|are|was|were|does|do|did|can|could|would|should|the|a|an|about)\s+/i, '')
      .replace(/^meant\s+by\s+/i, '');

    // Take first meaningful phrase (up to 5 words or until common stopwords)
    const words = cleaned.split(/\s+/);
    const stopwords = new Set(['in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'and', 'or', 'but']);

    const topicWords: string[] = [];
    for (const word of words) {
      if (topicWords.length >= 5) break;
      if (stopwords.has(word)) break;
      if (word.length > 0) topicWords.push(word);
    }

    if (topicWords.length === 0) return null;
    return topicWords.join(' ');
  }

  /**
   * Add a question-rubric pair to the cache for a given topic
   */
  async addToCache(
    topic: string,
    question: string,
    rubric: Record<string, unknown>,
    difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED',
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS
  ): Promise<void> {
    try {
      const redis = await getRedis();
      const key = this.topicKey(topic);
      const normalizedTopic = this.normalizeTopic(topic);

      const pair: QuestionRubricPair = {
        question,
        rubric,
        difficulty,
        createdAt: new Date().toISOString(),
      };

      // Get existing cache or create new
      const existing = await this.getFromCache(normalizedTopic);
      const items = existing ? existing.items : [];

      // Add new pair to the list
      items.push(pair);

      const cache: TopicCache = {
        topic: normalizedTopic,
        items,
        lastUpdated: new Date().toISOString(),
      };

      await redis.set(key, JSON.stringify(cache), { EX: ttlSeconds });

      console.log(`[TopicCache] Added question to cache for topic: "${normalizedTopic}" (${items.length} total items)`);
    } catch (err) {
      console.error('[TopicCache] addToCache error:', (err as Error).message);
      // Non-fatal: cache write failure doesn't break the application
    }
  }

  /**
   * Retrieve all question-rubric pairs for a topic
   */
  async getFromCache(topic: string): Promise<TopicCache | null> {
    try {
      const redis = await getRedis();
      const key = this.topicKey(topic);
      const raw = await redis.get(key);

      if (!raw) return null;

      const cache = JSON.parse(raw) as TopicCache;
      console.log(`[TopicCache] Cache hit for topic: "${cache.topic}" (${cache.items.length} items)`);
      return cache;
    } catch (err) {
      console.error('[TopicCache] getFromCache error:', (err as Error).message);
      return null;
    }
  }

  /**
   * Get a random question-rubric pair from cache for a specific topic and difficulty
   */
  async getRandomPair(
    topic: string,
    difficulty?: 'EASY' | 'MEDIUM' | 'ADVANCED'
  ): Promise<QuestionRubricPair | null> {
    const cache = await this.getFromCache(topic);
    if (!cache || cache.items.length === 0) return null;

    // Filter by difficulty if specified
    const filtered = difficulty
      ? cache.items.filter(item => item.difficulty === difficulty)
      : cache.items;

    if (filtered.length === 0) return null;

    // Return random item
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
  }

  /**
   * Check if cache exists for a topic
   */
  async hasCache(topic: string): Promise<boolean> {
    const cache = await this.getFromCache(topic);
    return cache !== null && cache.items.length > 0;
  }

  /**
   * Get cache statistics for a topic
   */
  async getCacheStats(topic: string): Promise<{
    exists: boolean;
    itemCount: number;
    byDifficulty: Record<string, number>;
    lastUpdated: string | null;
  }> {
    const cache = await this.getFromCache(topic);

    if (!cache) {
      return {
        exists: false,
        itemCount: 0,
        byDifficulty: { EASY: 0, MEDIUM: 0, ADVANCED: 0 },
        lastUpdated: null,
      };
    }

    const byDifficulty = cache.items.reduce((acc, item) => {
      acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      exists: true,
      itemCount: cache.items.length,
      byDifficulty,
      lastUpdated: cache.lastUpdated,
    };
  }

  /**
   * Clear cache for a specific topic
   */
  async clearTopicCache(topic: string): Promise<void> {
    try {
      const redis = await getRedis();
      const key = this.topicKey(topic);
      await redis.del(key);
      console.log(`[TopicCache] Cleared cache for topic: "${topic}"`);
    } catch (err) {
      console.error('[TopicCache] clearTopicCache error:', (err as Error).message);
    }
  }

  /**
   * Clear all topic caches (use with caution)
   */
  async clearAllCaches(): Promise<void> {
    try {
      const redis = await getRedis();
      const pattern = 'topic:cache:*';

      let cursor = 0;
      let deletedCount = 0;

      do {
        const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;

        if (reply.keys.length > 0) {
          await redis.del(reply.keys);
          deletedCount += reply.keys.length;
        }
      } while (cursor !== 0);

      console.log(`[TopicCache] Cleared all topic caches (${deletedCount} keys deleted)`);
    } catch (err) {
      console.error('[TopicCache] clearAllCaches error:', (err as Error).message);
    }
  }

  /**
   * Update TTL for a topic cache
   */
  async updateTTL(topic: string, ttlSeconds: number): Promise<void> {
    try {
      const redis = await getRedis();
      const key = this.topicKey(topic);
      await redis.expire(key, ttlSeconds);
      console.log(`[TopicCache] Updated TTL for topic: "${topic}" to ${ttlSeconds}s`);
    } catch (err) {
      console.error('[TopicCache] updateTTL error:', (err as Error).message);
    }
  }

  /**
   * Helper: Try to get a question from cache, return null if not found
   * This is the primary method to use when checking cache before LLM generation
   */
  async tryGetCachedQuestion(
    topic: string,
    difficulty?: 'EASY' | 'MEDIUM' | 'ADVANCED'
  ): Promise<{ question: string; rubric: Record<string, unknown> } | null> {
    try {
      const pair = await this.getRandomPair(topic, difficulty);
      if (!pair) return null;

      console.log(
        `[TopicCache] Using cached question for topic: "${topic}" (difficulty: ${difficulty || 'any'})`
      );

      return {
        question: pair.question,
        rubric: pair.rubric,
      };
    } catch (err) {
      console.error('[TopicCache] tryGetCachedQuestion error:', (err as Error).message);
      return null;
    }
  }

  /**
   * Get all topics currently in cache
   */
  async getAllCachedTopics(): Promise<string[]> {
    try {
      const redis = await getRedis();
      const pattern = 'topic:cache:*';
      const topics: string[] = [];

      let cursor = 0;
      do {
        const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;

        for (const key of reply.keys) {
          // Extract topic from key: "topic:cache:system design" -> "system design"
          const topic = key.replace('topic:cache:', '');
          topics.push(topic);
        }
      } while (cursor !== 0);

      return topics;
    } catch (err) {
      console.error('[TopicCache] getAllCachedTopics error:', (err as Error).message);
      return [];
    }
  }
}

export const topicCacheService = new TopicCacheService();
