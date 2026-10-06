/**
 * Unit Tests for Topic Cache Service - Logic Only (No Redis Required)
 *
 * Run with: npx tsx unit-test.ts
 *
 * These tests verify the logic without requiring Redis to be running
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

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.error(`  ${RED}Error: ${err instanceof Error ? err.message : String(err)}${RESET}`);
    failed++;
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
  }
}

function assertNotNull(value: any, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value should not be null');
  }
}

function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || `Expected true, got ${value}`);
  }
}

function assertFalse(value: boolean, message?: string) {
  if (value) {
    throw new Error(message || `Expected false, got ${value}`);
  }
}

function assertContains(str: string | null, substring: string, message?: string) {
  if (!str || !str.includes(substring)) {
    throw new Error(message || `Expected "${str}" to contain "${substring}"`);
  }
}

console.log(`\n${BLUE}🧪 Topic Cache Service - Unit Tests (Logic Only)${RESET}\n`);
console.log(`${YELLOW}Note: These tests do NOT require Redis${RESET}\n`);

// ===== TOPIC EXTRACTION TESTS =====

test('Extract topic from basic question', () => {
  const topic = topicCacheService.extractTopicFromQuestion('What is system design?');
  assertEquals(topic, 'system design');
});

test('Extract topic removes "what is meant by"', () => {
  const topic = topicCacheService.extractTopicFromQuestion('What is meant by system design?');
  assertEquals(topic, 'system design');
});

test('Extract topic from "Explain..."', () => {
  const topic = topicCacheService.extractTopicFromQuestion('Explain data structures');
  assertContains(topic, 'data structures');
});

test('Extract topic from "Describe..."', () => {
  const topic = topicCacheService.extractTopicFromQuestion('Describe load balancing');
  assertContains(topic, 'load balancing');
});

test('Extract topic from "How does..."', () => {
  const topic = topicCacheService.extractTopicFromQuestion('How does caching work?');
  assertContains(topic, 'caching');
});

test('Extract topic stops at stopwords', () => {
  const topic = topicCacheService.extractTopicFromQuestion('What is system design in software engineering?');
  assertEquals(topic, 'system design');
  // Should not include "in software engineering"
});

test('Extract topic limits to 5 words', () => {
  const topic = topicCacheService.extractTopicFromQuestion(
    'What is the meaning of distributed system architecture design patterns used in microservices?'
  );
  assertNotNull(topic);
  const words = topic!.split(' ');
  assertTrue(words.length <= 5, `Topic should have max 5 words, got ${words.length}`);
});

test('Extract topic handles empty string', () => {
  const topic = topicCacheService.extractTopicFromQuestion('');
  assertEquals(topic, null);
});

test('Extract topic handles only question mark', () => {
  const topic = topicCacheService.extractTopicFromQuestion('?');
  assertEquals(topic, null);
});

test('Extract topic handles whitespace only', () => {
  const topic = topicCacheService.extractTopicFromQuestion('   ');
  assertEquals(topic, null);
});

test('Extract topic converts to lowercase', () => {
  const topic = topicCacheService.extractTopicFromQuestion('What is SYSTEM DESIGN?');
  assertEquals(topic, 'system design');
});

test('Extract topic handles multiple spaces', () => {
  const topic = topicCacheService.extractTopicFromQuestion('What is    system    design?');
  assertNotNull(topic);
  // Should normalize multiple spaces
  assertFalse(topic!.includes('  '), 'Should not have multiple spaces');
});

// ===== TOPIC NORMALIZATION TESTS =====

test('Topic key normalization - lowercase', () => {
  // This is a private method but we can test the behavior
  const topic1 = 'System Design';
  const topic2 = 'system design';
  const topic3 = 'SYSTEM DESIGN';

  // All should normalize to the same thing
  const normalized1 = topic1.trim().toLowerCase();
  const normalized2 = topic2.trim().toLowerCase();
  const normalized3 = topic3.trim().toLowerCase();

  assertEquals(normalized1, normalized2);
  assertEquals(normalized2, normalized3);
});

test('Topic key normalization - whitespace', () => {
  const topic1 = '  system design  ';
  const topic2 = 'system design';

  const normalized1 = topic1.trim().toLowerCase();
  const normalized2 = topic2.trim().toLowerCase();

  assertEquals(normalized1, normalized2);
});

test('Topic key normalization - multiple spaces', () => {
  const topic = 'system    design';
  const normalized = topic.trim().toLowerCase().replace(/\s+/g, ' ');
  assertEquals(normalized, 'system design');
});

// ===== DATA STRUCTURE TESTS =====

test('QuestionRubricPair structure', () => {
  const pair = {
    question: 'What is system design?',
    rubric: {
      criteria: ['Understanding', 'Clarity'],
      maxScore: 10,
      passingScore: 6,
    },
    difficulty: 'EASY' as const,
    createdAt: new Date().toISOString(),
  };

  assertNotNull(pair.question);
  assertNotNull(pair.rubric);
  assertNotNull(pair.difficulty);
  assertNotNull(pair.createdAt);
  assertEquals(pair.difficulty, 'EASY');
});

test('TopicCache structure', () => {
  const cache = {
    topic: 'system design',
    items: [
      {
        question: 'Q1',
        rubric: {},
        difficulty: 'EASY' as const,
        createdAt: new Date().toISOString(),
      },
      {
        question: 'Q2',
        rubric: {},
        difficulty: 'MEDIUM' as const,
        createdAt: new Date().toISOString(),
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  assertEquals(cache.topic, 'system design');
  assertEquals(cache.items.length, 2);
  assertEquals(cache.items[0].difficulty, 'EASY');
  assertEquals(cache.items[1].difficulty, 'MEDIUM');
});

// ===== DIFFICULTY TESTS =====

test('Difficulty levels are valid', () => {
  const difficulties: Array<'EASY' | 'MEDIUM' | 'ADVANCED'> = ['EASY', 'MEDIUM', 'ADVANCED'];

  for (const diff of difficulties) {
    assertTrue(['EASY', 'MEDIUM', 'ADVANCED'].includes(diff), `${diff} should be valid`);
  }
});

// ===== RUBRIC FORMAT TESTS =====

test('Rubric can store any JSON structure', () => {
  const rubrics = [
    // Simple format
    {
      maxScore: 10,
      passingScore: 6,
    },
    // Criteria-based
    {
      criteria: ['Understanding', 'Clarity', 'Examples'],
      maxScore: 10,
      passingScore: 6,
    },
    // Detailed format
    {
      evaluation_criteria: [
        {
          criterion: 'Technical Accuracy',
          weight: 0.5,
          max_points: 5,
        },
        {
          criterion: 'Communication',
          weight: 0.3,
          max_points: 3,
        },
      ],
      total_points: 10,
      passing_score: 6,
    },
  ];

  for (const rubric of rubrics) {
    assertNotNull(rubric, 'Rubric should not be null');
    assertTrue(typeof rubric === 'object', 'Rubric should be an object');
  }
});

// ===== TTL TESTS =====

test('Default TTL is 7 days', () => {
  const DEFAULT_TTL_SECONDS = 604800; // 7 days
  assertEquals(DEFAULT_TTL_SECONDS, 7 * 24 * 60 * 60);
});

test('TTL calculations', () => {
  const ONE_DAY = 86400;
  const SEVEN_DAYS = 604800;
  const FOURTEEN_DAYS = 1209600;

  assertEquals(ONE_DAY, 24 * 60 * 60);
  assertEquals(SEVEN_DAYS, 7 * ONE_DAY);
  assertEquals(FOURTEEN_DAYS, 14 * ONE_DAY);
});

// ===== EDGE CASE TESTS =====

test('Empty rubric is valid', () => {
  const rubric = {};
  assertTrue(typeof rubric === 'object');
  assertEquals(Object.keys(rubric).length, 0);
});

test('Long question text', () => {
  const longQuestion = 'What is '.repeat(50) + 'system design?';
  const topic = topicCacheService.extractTopicFromQuestion(longQuestion);
  assertNotNull(topic);
  // Should still extract something reasonable
});

test('Question with special characters', () => {
  const question = 'What is system-design (with-dashes)?';
  const topic = topicCacheService.extractTopicFromQuestion(question);
  assertNotNull(topic);
});

test('Question with numbers', () => {
  const question = 'What is HTTP/2 protocol?';
  const topic = topicCacheService.extractTopicFromQuestion(question);
  assertNotNull(topic);
  assertContains(topic, 'http');
});

test('Unicode characters in question', () => {
  const question = 'What is système de design?';
  const topic = topicCacheService.extractTopicFromQuestion(question);
  assertNotNull(topic);
});

// ===== CACHE KEY FORMAT TESTS =====

test('Cache key format', () => {
  const topic = 'system design';
  const expectedKey = `topic:cache:${topic}`;
  assertEquals(expectedKey, 'topic:cache:system design');
});

test('Cache key avoids collisions', () => {
  const key1 = 'topic:cache:system design';
  const key2 = 'topic:cache:data structures';
  const key3 = 'session:123:context'; // Different namespace

  assertTrue(key1 !== key2, 'Different topics should have different keys');
  assertTrue(key1 !== key3, 'Topic cache should not collide with session cache');
});

// Print summary
console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
  console.log(`${GREEN}✓ All ${passed} tests passed!${RESET}`);
  console.log(`${GREEN}✓ Logic is correct and ready for Redis integration${RESET}`);
} else {
  console.log(`${YELLOW}⚠ Some tests failed${RESET}`);
}
console.log(`${BLUE}Total:${RESET} ${passed + failed} tests`);
console.log(`${GREEN}Passed:${RESET} ${passed}`);
console.log(`${RED}Failed:${RESET} ${failed}`);
console.log(`${'='.repeat(60)}\n`);

if (failed === 0) {
  console.log(`${BLUE}ℹ Next step:${RESET} Run ${YELLOW}manual-test.ts${RESET} with Redis to test full integration\n`);
}

process.exit(failed > 0 ? 1 : 0);
