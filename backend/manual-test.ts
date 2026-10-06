/**
 * Manual Integration Test for Topic Cache Service
 *
 * Run with: npx tsx manual-test.ts
 * Prerequisites: Redis running on localhost:6379
 */

import { topicCacheService } from './src/services/topicCacheService';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.error(`  ${RED}Error: ${err instanceof Error ? err.message : String(err)}${RESET}`);
    failed++;
  }
}

async function assertEquals(actual: any, expected: any, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function assertNotNull(value: any, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value should not be null');
  }
}

async function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

async function runTests() {
  console.log(`\n${BLUE}🧪 Topic Cache Service - Integration Tests${RESET}\n`);

  const testTopic = 'test-topic-' + Date.now();
  const testQuestion = 'What is meant by system design?';
  const testRubric = {
    criteria: ['Understanding of concepts', 'Clarity of explanation'],
    maxScore: 10,
    passingScore: 6,
  };

  try {
    // Test 1: Extract topic from question
    await test('Extract topic from question', async () => {
      const topic = topicCacheService.extractTopicFromQuestion('What is meant by system design?');
      assertEquals(topic, 'system design');
    });

    // Test 2: Extract topic handles different question formats
    await test('Extract topic from different formats', async () => {
      const topic1 = topicCacheService.extractTopicFromQuestion('Explain data structures');
      const topic2 = topicCacheService.extractTopicFromQuestion('How does load balancing work?');

      assertNotNull(topic1, 'Should extract topic from "Explain..."');
      assertNotNull(topic2, 'Should extract topic from "How does..."');
    });

    // Test 3: hasCache returns false for non-existent topic
    await test('hasCache returns false for non-existent topic', async () => {
      const exists = await topicCacheService.hasCache('non-existent-topic-' + Date.now());
      assertEquals(exists, false);
    });

    // Test 4: Add question to cache
    await test('Add question-rubric pair to cache', async () => {
      await topicCacheService.addToCache(testTopic, testQuestion, testRubric, 'EASY');
    });

    // Test 5: hasCache returns true after adding
    await test('hasCache returns true after adding', async () => {
      const exists = await topicCacheService.hasCache(testTopic);
      assertTrue(exists, 'Cache should exist after adding');
    });

    // Test 6: Retrieve from cache
    await test('Retrieve from cache', async () => {
      const cache = await topicCacheService.getFromCache(testTopic);
      assertNotNull(cache, 'Cache should not be null');
      assertEquals(cache?.items.length, 1, 'Should have 1 item');
      assertEquals(cache?.items[0].question, testQuestion);
    });

    // Test 7: Add another question to the same topic
    await test('Add second question to same topic', async () => {
      await topicCacheService.addToCache(
        testTopic,
        'Explain load balancing in detail',
        { criteria: ['Technical accuracy'], maxScore: 10 },
        'MEDIUM'
      );

      const cache = await topicCacheService.getFromCache(testTopic);
      assertEquals(cache?.items.length, 2, 'Should have 2 items now');
    });

    // Test 8: Get random pair
    await test('Get random question-rubric pair', async () => {
      const pair = await topicCacheService.getRandomPair(testTopic);
      assertNotNull(pair, 'Should return a pair');
      assertNotNull(pair?.question, 'Pair should have question');
      assertNotNull(pair?.rubric, 'Pair should have rubric');
    });

    // Test 9: Get random pair with difficulty filter
    await test('Get random pair filtered by difficulty', async () => {
      const pair = await topicCacheService.getRandomPair(testTopic, 'EASY');
      assertNotNull(pair, 'Should return a pair');
      assertEquals(pair?.difficulty, 'EASY', 'Should return EASY difficulty');
    });

    // Test 10: Get cache statistics
    await test('Get cache statistics', async () => {
      const stats = await topicCacheService.getCacheStats(testTopic);
      assertTrue(stats.exists, 'Cache should exist');
      assertEquals(stats.itemCount, 2, 'Should have 2 items');
      assertEquals(stats.byDifficulty.EASY, 1, 'Should have 1 EASY question');
      assertEquals(stats.byDifficulty.MEDIUM, 1, 'Should have 1 MEDIUM question');
    });

    // Test 11: tryGetCachedQuestion helper
    await test('tryGetCachedQuestion returns question', async () => {
      const result = await topicCacheService.tryGetCachedQuestion(testTopic, 'EASY');
      assertNotNull(result, 'Should return result');
      assertEquals(result?.question, testQuestion);
    });

    // Test 12: tryGetCachedQuestion returns null for non-existent
    await test('tryGetCachedQuestion returns null for cache miss', async () => {
      const result = await topicCacheService.tryGetCachedQuestion('non-existent-' + Date.now());
      assertEquals(result, null, 'Should return null for cache miss');
    });

    // Test 13: Topic normalization (case insensitive)
    await test('Topic normalization - case insensitive', async () => {
      const topic1 = 'System Design';
      const topic2 = 'system design';

      await topicCacheService.addToCache(topic1, 'Question 1', testRubric, 'EASY');

      const cache1 = await topicCacheService.getFromCache(topic1);
      const cache2 = await topicCacheService.getFromCache(topic2);

      assertEquals(cache1?.topic, cache2?.topic, 'Topics should be normalized');

      // Cleanup
      await topicCacheService.clearTopicCache(topic1);
    });

    // Test 14: getAllCachedTopics
    await test('Get all cached topics', async () => {
      const topics = await topicCacheService.getAllCachedTopics();
      assertTrue(Array.isArray(topics), 'Should return an array');
      assertTrue(topics.length > 0, 'Should have at least our test topic');
    });

    // Test 15: Clear topic cache
    await test('Clear topic cache', async () => {
      await topicCacheService.clearTopicCache(testTopic);
      const exists = await topicCacheService.hasCache(testTopic);
      assertEquals(exists, false, 'Cache should not exist after clearing');
    });

    // Test 16: Get stats for non-existent topic
    await test('Get stats for non-existent topic', async () => {
      const stats = await topicCacheService.getCacheStats('non-existent-' + Date.now());
      assertEquals(stats.exists, false);
      assertEquals(stats.itemCount, 0);
    });

  } catch (err) {
    console.error(`\n${RED}Fatal error:${RESET}`, err);
  }

  // Print summary
  console.log(`\n${'='.repeat(50)}`);
  if (failed === 0) {
    console.log(`${GREEN}✓ All tests passed!${RESET}`);
  } else {
    console.log(`${YELLOW}⚠ Some tests failed${RESET}`);
  }
  console.log(`${BLUE}Total:${RESET} ${passed + failed} tests`);
  console.log(`${GREEN}Passed:${RESET} ${passed}`);
  console.log(`${RED}Failed:${RESET} ${failed}`);
  console.log(`${'='.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
console.log(`${YELLOW}Starting tests...${RESET}`);
console.log(`${YELLOW}Note: Redis must be running on localhost:6379${RESET}`);

runTests().catch((err) => {
  console.error(`\n${RED}Test suite error:${RESET}`, err);
  process.exit(1);
});
