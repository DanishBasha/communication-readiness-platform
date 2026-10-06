/**
 * Standalone Test Script for Topic Cache Service
 * Run with: node test-topic-cache.js
 *
 * Prerequisites: Redis must be running on localhost:6379
 */

const { createClient } = require('redis');

// Simple test suite
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🧪 Testing Topic Cache Service\n');

  // Connect to Redis
  const redis = createClient({ url: 'redis://localhost:6379' });

  try {
    await redis.connect();
    console.log('✓ Redis connected\n');
  } catch (err) {
    console.error('✗ Redis connection failed:', err.message);
    console.error('  Please ensure Redis is running on localhost:6379');
    process.exit(1);
  }

  const testTopic = 'test-topic-' + Date.now();
  const topicKey = `topic:cache:${testTopic}`;

  // Test 1: Store a question-rubric pair
  await test('Store question-rubric pair', async () => {
    const cache = {
      topic: testTopic,
      items: [
        {
          question: 'What is system design?',
          rubric: {
            criteria: ['Understanding', 'Clarity'],
            maxScore: 10,
            passingScore: 6
          },
          difficulty: 'EASY',
          createdAt: new Date().toISOString()
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    await redis.set(topicKey, JSON.stringify(cache), { EX: 604800 });
  });

  // Test 2: Retrieve from cache
  await test('Retrieve from cache', async () => {
    const raw = await redis.get(topicKey);
    if (!raw) throw new Error('Cache not found');

    const cache = JSON.parse(raw);
    if (cache.topic !== testTopic) throw new Error('Topic mismatch');
    if (cache.items.length !== 1) throw new Error('Items count mismatch');
    if (cache.items[0].question !== 'What is system design?') throw new Error('Question mismatch');
  });

  // Test 3: Add another question to the list
  await test('Add second question to list', async () => {
    const raw = await redis.get(topicKey);
    const cache = JSON.parse(raw);

    cache.items.push({
      question: 'Explain load balancing',
      rubric: {
        criteria: ['Technical accuracy', 'Examples'],
        maxScore: 10
      },
      difficulty: 'MEDIUM',
      createdAt: new Date().toISOString()
    });

    cache.lastUpdated = new Date().toISOString();
    await redis.set(topicKey, JSON.stringify(cache), { EX: 604800 });

    // Verify
    const updated = JSON.parse(await redis.get(topicKey));
    if (updated.items.length !== 2) throw new Error('Expected 2 items');
  });

  // Test 4: Check TTL
  await test('Verify TTL is set', async () => {
    const ttl = await redis.ttl(topicKey);
    if (ttl <= 0) throw new Error('TTL not set');
    if (ttl > 604800) throw new Error('TTL too high');
  });

  // Test 5: Topic normalization
  await test('Topic normalization', async () => {
    const topics = ['System Design', 'system design', '  system design  '];
    const normalized = topics.map(t => t.trim().toLowerCase());
    const unique = new Set(normalized);
    if (unique.size !== 1) throw new Error('Normalization failed');
  });

  // Test 6: Scan for topic caches
  await test('Scan for topic cache keys', async () => {
    let cursor = 0;
    let found = false;

    do {
      const reply = await redis.scan(cursor, { MATCH: 'topic:cache:*', COUNT: 100 });
      cursor = reply.cursor;
      if (reply.keys.includes(topicKey)) {
        found = true;
        break;
      }
    } while (cursor !== 0);

    if (!found) throw new Error('Topic cache key not found in scan');
  });

  // Test 7: Delete cache
  await test('Delete topic cache', async () => {
    await redis.del(topicKey);
    const exists = await redis.get(topicKey);
    if (exists) throw new Error('Cache still exists after delete');
  });

  // Cleanup
  await redis.disconnect();

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n❌ Test suite error:', err);
  process.exit(1);
});
