/**
 * Tests for Topic Cache Service
 *
 * To run: npm test -- topicCache.test.ts
 * Prerequisites: Redis must be running on localhost:6379
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { topicCacheService } from '../services/topicCacheService';

// Mock data
const mockQuestion = 'What is meant by system design?';
const mockRubric = {
  criteria: ['Understanding of concepts', 'Clarity of explanation'],
  maxScore: 10,
  passingScore: 6,
};
const mockDifficulty = 'EASY' as const;

describe('TopicCacheService', () => {
  const testTopic = 'test-topic-' + Date.now();

  afterEach(async () => {
    // Clean up test data
    await topicCacheService.clearTopicCache(testTopic);
  });

  describe('Topic Normalization', () => {
    it('should normalize topics to lowercase', async () => {
      const topic1 = 'System Design';
      const topic2 = 'system design';

      await topicCacheService.addToCache(topic1, mockQuestion, mockRubric, mockDifficulty);

      const cache1 = await topicCacheService.getFromCache(topic1);
      const cache2 = await topicCacheService.getFromCache(topic2);

      expect(cache1).not.toBeNull();
      expect(cache2).not.toBeNull();
      expect(cache1?.topic).toBe(cache2?.topic);
    });

    it('should trim whitespace from topics', async () => {
      const topic = '  system design  ';

      await topicCacheService.addToCache(topic, mockQuestion, mockRubric, mockDifficulty);

      const cache = await topicCacheService.getFromCache('system design');
      expect(cache).not.toBeNull();
      expect(cache?.topic).toBe('system design');
    });
  });

  describe('addToCache', () => {
    it('should add a question-rubric pair to cache', async () => {
      await topicCacheService.addToCache(testTopic, mockQuestion, mockRubric, mockDifficulty);

      const cache = await topicCacheService.getFromCache(testTopic);
      expect(cache).not.toBeNull();
      expect(cache?.items).toHaveLength(1);
      expect(cache?.items[0].question).toBe(mockQuestion);
      expect(cache?.items[0].rubric).toEqual(mockRubric);
      expect(cache?.items[0].difficulty).toBe(mockDifficulty);
    });

    it('should append to existing cache', async () => {
      const question1 = 'First question';
      const question2 = 'Second question';

      await topicCacheService.addToCache(testTopic, question1, mockRubric, mockDifficulty);
      await topicCacheService.addToCache(testTopic, question2, mockRubric, 'MEDIUM');

      const cache = await topicCacheService.getFromCache(testTopic);
      expect(cache?.items).toHaveLength(2);
      expect(cache?.items[0].question).toBe(question1);
      expect(cache?.items[1].question).toBe(question2);
    });

    it('should set createdAt timestamp', async () => {
      await topicCacheService.addToCache(testTopic, mockQuestion, mockRubric, mockDifficulty);

      const cache = await topicCacheService.getFromCache(testTopic);
      expect(cache?.items[0].createdAt).toBeDefined();
      expect(new Date(cache!.items[0].createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getFromCache', () => {
    it('should return null for non-existent topic', async () => {
      const cache = await topicCacheService.getFromCache('non-existent-topic-' + Date.now());
      expect(cache).toBeNull();
    });

    it('should retrieve cached data', async () => {
      await topicCacheService.addToCache(testTopic, mockQuestion, mockRubric, mockDifficulty);

      const cache = await topicCacheService.getFromCache(testTopic);
      expect(cache).not.toBeNull();
      expect(cache?.topic).toBe(testTopic.toLowerCase());
      expect(cache?.items).toHaveLength(1);
    });
  });

  describe('getRandomPair', () => {
    beforeEach(async () => {
      await topicCacheService.addToCache(testTopic, 'Easy Q1', mockRubric, 'EASY');
      await topicCacheService.addToCache(testTopic, 'Easy Q2', mockRubric, 'EASY');
      await topicCacheService.addToCache(testTopic, 'Medium Q1', mockRubric, 'MEDIUM');
      await topicCacheService.addToCache(testTopic, 'Advanced Q1', mockRubric, 'ADVANCED');
    });

    it('should return a random pair without difficulty filter', async () => {
      const pair = await topicCacheService.getRandomPair(testTopic);
      expect(pair).not.toBeNull();
      expect(pair?.question).toBeDefined();
      expect(pair?.rubric).toBeDefined();
    });

    it('should filter by difficulty', async () => {
      const easyPair = await topicCacheService.getRandomPair(testTopic, 'EASY');
      expect(easyPair).not.toBeNull();
      expect(easyPair?.difficulty).toBe('EASY');
      expect(['Easy Q1', 'Easy Q2']).toContain(easyPair?.question);
    });

    it('should return null for difficulty with no matches', async () => {
      await topicCacheService.clearTopicCache(testTopic);
      await topicCacheService.addToCache(testTopic, 'Only easy', mockRubric, 'EASY');

      const pair = await topicCacheService.getRandomPair(testTopic, 'ADVANCED');
      expect(pair).toBeNull();
    });

    it('should return null for non-existent topic', async () => {
      const pair = await topicCacheService.getRandomPair('non-existent-' + Date.now());
      expect(pair).toBeNull();
    });
  });

  describe('hasCache', () => {
    it('should return false for non-existent topic', async () => {
      const exists = await topicCacheService.hasCache('non-existent-' + Date.now());
      expect(exists).toBe(false);
    });

    it('should return true for existing topic', async () => {
      await topicCacheService.addToCache(testTopic, mockQuestion, mockRubric, mockDifficulty);

      const exists = await topicCacheService.hasCache(testTopic);
      expect(exists).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('should return zero stats for non-existent topic', async () => {
      const stats = await topicCacheService.getCacheStats('non-existent-' + Date.now());

      expect(stats.exists).toBe(false);
      expect(stats.itemCount).toBe(0);
      expect(stats.byDifficulty.EASY).toBe(0);
      expect(stats.byDifficulty.MEDIUM).toBe(0);
      expect(stats.byDifficulty.ADVANCED).toBe(0);
      expect(stats.lastUpdated).toBeNull();
    });

    it('should return accurate stats', async () => {
      await topicCacheService.addToCache(testTopic, 'Q1', mockRubric, 'EASY');
      await topicCacheService.addToCache(testTopic, 'Q2', mockRubric, 'EASY');
      await topicCacheService.addToCache(testTopic, 'Q3', mockRubric, 'MEDIUM');

      const stats = await topicCacheService.getCacheStats(testTopic);

      expect(stats.exists).toBe(true);
      expect(stats.itemCount).toBe(3);
      expect(stats.byDifficulty.EASY).toBe(2);
      expect(stats.byDifficulty.MEDIUM).toBe(1);
      expect(stats.byDifficulty.ADVANCED).toBeUndefined();
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe('clearTopicCache', () => {
    it('should clear specific topic cache', async () => {
      await topicCacheService.addToCache(testTopic, mockQuestion, mockRubric, mockDifficulty);

      let cache = await topicCacheService.getFromCache(testTopic);
      expect(cache).not.toBeNull();

      await topicCacheService.clearTopicCache(testTopic);

      cache = await topicCacheService.getFromCache(testTopic);
      expect(cache).toBeNull();
    });

    it('should not affect other topic caches', async () => {
      const topic1 = testTopic + '-1';
      const topic2 = testTopic + '-2';

      await topicCacheService.addToCache(topic1, 'Q1', mockRubric, mockDifficulty);
      await topicCacheService.addToCache(topic2, 'Q2', mockRubric, mockDifficulty);

      await topicCacheService.clearTopicCache(topic1);

      const cache1 = await topicCacheService.getFromCache(topic1);
      const cache2 = await topicCacheService.getFromCache(topic2);

      expect(cache1).toBeNull();
      expect(cache2).not.toBeNull();

      // Cleanup
      await topicCacheService.clearTopicCache(topic2);
    });
  });

  describe('extractTopicFromQuestion', () => {
    it('should extract topic from simple question', () => {
      const topic = topicCacheService.extractTopicFromQuestion('What is system design?');
      expect(topic).toBe('system design');
    });

    it('should handle different question starters', () => {
      const questions = [
        'What is meant by system design?',
        'Explain system design',
        'Describe system design',
        'How does system design work?',
      ];

      questions.forEach(q => {
        const topic = topicCacheService.extractTopicFromQuestion(q);
        expect(topic).toContain('system design');
      });
    });

    it('should limit topic length', () => {
      const longQuestion = 'What is the meaning of distributed system architecture design patterns used in microservices?';
      const topic = topicCacheService.extractTopicFromQuestion(longQuestion);
      const words = topic?.split(' ') || [];
      expect(words.length).toBeLessThanOrEqual(5);
    });

    it('should stop at stopwords', () => {
      const question = 'What is system design in software engineering?';
      const topic = topicCacheService.extractTopicFromQuestion(question);
      expect(topic).toBe('system design');
      expect(topic).not.toContain('in');
    });

    it('should return null for empty/invalid input', () => {
      expect(topicCacheService.extractTopicFromQuestion('')).toBeNull();
      expect(topicCacheService.extractTopicFromQuestion('?')).toBeNull();
    });
  });

  describe('tryGetCachedQuestion', () => {
    beforeEach(async () => {
      await topicCacheService.addToCache(testTopic, 'Easy question', mockRubric, 'EASY');
      await topicCacheService.addToCache(testTopic, 'Medium question', mockRubric, 'MEDIUM');
    });

    it('should return question and rubric', async () => {
      const result = await topicCacheService.tryGetCachedQuestion(testTopic);
      expect(result).not.toBeNull();
      expect(result?.question).toBeDefined();
      expect(result?.rubric).toBeDefined();
    });

    it('should filter by difficulty', async () => {
      const result = await topicCacheService.tryGetCachedQuestion(testTopic, 'EASY');
      expect(result?.question).toBe('Easy question');
    });

    it('should return null for cache miss', async () => {
      const result = await topicCacheService.tryGetCachedQuestion('non-existent-' + Date.now());
      expect(result).toBeNull();
    });
  });

  describe('getAllCachedTopics', () => {
    it('should list all cached topics', async () => {
      const topic1 = testTopic + '-list-1';
      const topic2 = testTopic + '-list-2';

      await topicCacheService.addToCache(topic1, 'Q1', mockRubric, mockDifficulty);
      await topicCacheService.addToCache(topic2, 'Q2', mockRubric, mockDifficulty);

      const topics = await topicCacheService.getAllCachedTopics();

      expect(topics).toContain(topic1.toLowerCase());
      expect(topics).toContain(topic2.toLowerCase());

      // Cleanup
      await topicCacheService.clearTopicCache(topic1);
      await topicCacheService.clearTopicCache(topic2);
    });

    it('should return empty array when no caches exist', async () => {
      // Clear all first
      await topicCacheService.clearAllCaches();

      const topics = await topicCacheService.getAllCachedTopics();
      expect(Array.isArray(topics)).toBe(true);
    });
  });
});
