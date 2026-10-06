/**
 * Question Generator Utility
 *
 * Provides a unified interface for question generation that checks
 * the persistent cache before falling back to LLM generation
 */

import { topicCacheService } from '../services/topicCacheService';

export interface QuestionWithRubric {
  question: string;
  rubric: Record<string, unknown>;
  source: 'cache' | 'llm';
}

/**
 * Get a question with rubric for a given topic
 *
 * Flow:
 * 1. Try to get from persistent cache
 * 2. If cache miss, generate via LLM (to be implemented)
 * 3. Cache the generated question for future use
 *
 * @param topic - The topic to generate a question for
 * @param difficulty - Question difficulty level
 * @param llmGenerateFn - Function to call for LLM generation (optional)
 * @returns Question with rubric and source indicator
 */
export async function getQuestionWithRubric(
  topic: string,
  difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED',
  llmGenerateFn?: (topic: string, difficulty: string) => Promise<{
    question: string;
    rubric: Record<string, unknown>;
  }>
): Promise<QuestionWithRubric> {
  // Step 1: Try cache first
  const cached = await topicCacheService.tryGetCachedQuestion(topic, difficulty);

  if (cached) {
    console.log(`[QuestionGenerator] Cache HIT for topic: "${topic}" (${difficulty})`);
    return {
      question: cached.question,
      rubric: cached.rubric,
      source: 'cache',
    };
  }

  console.log(`[QuestionGenerator] Cache MISS for topic: "${topic}" (${difficulty})`);

  // Step 2: Cache miss - generate via LLM
  if (!llmGenerateFn) {
    throw new Error('LLM generation function not provided and cache miss occurred');
  }

  const generated = await llmGenerateFn(topic, difficulty);

  // Step 3: Cache the generated question for future use (non-blocking)
  topicCacheService
    .addToCache(topic, generated.question, generated.rubric, difficulty)
    .catch((err) => {
      console.error('[QuestionGenerator] Failed to cache generated question:', err);
    });

  return {
    question: generated.question,
    rubric: generated.rubric,
    source: 'llm',
  };
}

/**
 * Check if a topic has cached questions available
 * Useful for analytics and cache monitoring
 */
export async function hasTopicCache(topic: string): Promise<boolean> {
  return topicCacheService.hasCache(topic);
}

/**
 * Get statistics about cached questions for a topic
 */
export async function getTopicCacheStats(topic: string): Promise<{
  exists: boolean;
  itemCount: number;
  byDifficulty: Record<string, number>;
  lastUpdated: string | null;
}> {
  return topicCacheService.getCacheStats(topic);
}

/**
 * Pre-warm cache for common topics
 * Should be called during system initialization or off-peak hours
 */
export async function preWarmCache(
  topics: Array<{ topic: string; difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED' }>,
  llmGenerateFn: (topic: string, difficulty: string) => Promise<{
    question: string;
    rubric: Record<string, unknown>;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  console.log(`[QuestionGenerator] Pre-warming cache for ${topics.length} topics...`);

  for (const { topic, difficulty } of topics) {
    try {
      // Check if cache already exists
      const hasCache = await topicCacheService.hasCache(topic);

      if (hasCache) {
        console.log(`[QuestionGenerator] Topic "${topic}" already cached, skipping`);
        success++;
        continue;
      }

      // Generate and cache
      const generated = await llmGenerateFn(topic, difficulty);
      await topicCacheService.addToCache(topic, generated.question, generated.rubric, difficulty);

      console.log(`[QuestionGenerator] Pre-warmed: "${topic}" (${difficulty})`);
      success++;
    } catch (err) {
      console.error(`[QuestionGenerator] Failed to pre-warm "${topic}":`, err);
      failed++;
    }
  }

  console.log(`[QuestionGenerator] Pre-warming complete: ${success} success, ${failed} failed`);

  return { success, failed };
}
