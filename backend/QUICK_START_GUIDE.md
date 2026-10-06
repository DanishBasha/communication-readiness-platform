# Quick Start Guide - Persistent Topic Cache

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Redis running on `localhost:6379` (or update `REDIS_URL` in `.env`)
- Backend server running on port 5001
- Valid authentication token

### 1. Verify Redis Connection

```bash
# Check if Redis is running
redis-cli ping
# Expected output: PONG
```

### 2. Start the Backend

```bash
cd backend
npm run dev
# Server should start on http://localhost:5001
```

### 3. Test the Cache API

#### List all cached topics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/topic-cache
```

**Expected Response:**
```json
{
  "topics": [],
  "count": 0
}
```

#### Manually add a question to cache
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "system design",
    "question": "What is meant by system design?",
    "rubric": {
      "criteria": ["Understanding of concepts", "Clarity of explanation"],
      "maxScore": 10,
      "passingScore": 6
    },
    "difficulty": "EASY"
  }' \
  http://localhost:5001/api/topic-cache
```

**Expected Response:**
```json
{
  "message": "Question added to cache successfully",
  "topic": "system design"
}
```

#### Get a random cached question
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/topic-cache/system%20design/random?difficulty=EASY"
```

**Expected Response:**
```json
{
  "question": "What is meant by system design?",
  "rubric": {
    "criteria": ["Understanding of concepts", "Clarity of explanation"],
    "maxScore": 10,
    "passingScore": 6
  },
  "difficulty": "EASY",
  "createdAt": "2026-10-06T10:30:00.000Z"
}
```

#### Get cache statistics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/topic-cache/system%20design/stats
```

**Expected Response:**
```json
{
  "exists": true,
  "itemCount": 1,
  "byDifficulty": {
    "EASY": 1
  },
  "lastUpdated": "2026-10-06T10:30:00.000Z"
}
```

## 💻 Using in Your Code

### Basic Usage

```typescript
import { topicCacheService } from '../services/topicCacheService';

// Add a question to cache
await topicCacheService.addToCache(
  'system design',
  'What is meant by system design?',
  { criteria: ['Understanding', 'Clarity'], maxScore: 10 },
  'EASY'
);

// Get from cache
const cache = await topicCacheService.getFromCache('system design');
console.log(cache?.items.length); // 1

// Get a random question
const pair = await topicCacheService.getRandomPair('system design', 'EASY');
console.log(pair?.question); // "What is meant by system design?"
```

### Cache-First Question Generation

```typescript
import { topicCacheService } from '../services/topicCacheService';

async function getQuestion(topic: string, difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED') {
  // Try cache first
  const cached = await topicCacheService.tryGetCachedQuestion(topic, difficulty);
  
  if (cached) {
    console.log('✓ Using cached question');
    return cached;
  }
  
  // Cache miss - generate via LLM
  console.log('✗ Cache miss - generating via LLM');
  const generated = await generateViaLLM(topic, difficulty);
  
  // Cache for future use
  await topicCacheService.addToCache(
    topic,
    generated.question,
    generated.rubric,
    difficulty
  );
  
  return generated;
}
```

### Using the Question Generator Utility

```typescript
import { getQuestionWithRubric } from '../utils/questionGenerator';

// This automatically checks cache first, then falls back to LLM
const result = await getQuestionWithRubric(
  'system design',
  'EASY',
  async (topic, difficulty) => {
    // Your LLM generation logic
    return {
      question: 'Generated question',
      rubric: { criteria: [...] }
    };
  }
);

console.log(result.question);
console.log(result.source); // 'cache' or 'llm'
```

## 🔍 Monitoring the Cache

### Check what's in Redis

```bash
# Connect to Redis
redis-cli

# List all topic cache keys
KEYS topic:cache:*

# View a specific cache
GET topic:cache:system_design

# Check TTL (time to live)
TTL topic:cache:system_design
# Returns seconds remaining (604800 = 7 days)
```

### Get Statistics

```typescript
import { topicCacheService } from '../services/topicCacheService';

// Get stats for a topic
const stats = await topicCacheService.getCacheStats('system design');
console.log(`Questions: ${stats.itemCount}`);
console.log(`EASY: ${stats.byDifficulty.EASY || 0}`);
console.log(`MEDIUM: ${stats.byDifficulty.MEDIUM || 0}`);
console.log(`ADVANCED: ${stats.byDifficulty.ADVANCED || 0}`);

// List all cached topics
const topics = await topicCacheService.getAllCachedTopics();
console.log(`Total topics cached: ${topics.length}`);
```

## 🧪 Running Tests

```bash
cd backend
npm test -- topicCache.test.ts
```

**Expected Output:**
```
 ✓ should normalize topics to lowercase
 ✓ should add a question-rubric pair to cache
 ✓ should retrieve cached data
 ✓ should return a random pair
 ✓ should filter by difficulty
 ✓ should extract topic from question
 ... (15+ tests passing)
```

## 🎯 Common Use Cases

### Use Case 1: Interview System

**Scenario**: Student starts interview on "system design"

```typescript
// 1. Check if we have cached questions
const hasCached = await topicCacheService.hasCache('system design');

if (hasCached) {
  // 2. Get a random EASY question from cache
  const question = await topicCacheService.getRandomPair('system design', 'EASY');
  
  if (question) {
    // Use cached question - no LLM call needed!
    return {
      question: question.question,
      rubric: question.rubric
    };
  }
}

// 3. No cache - generate via LLM and cache it
const generated = await generateViaLLM('system design', 'EASY');
await topicCacheService.addToCache('system design', generated.question, generated.rubric, 'EASY');
return generated;
```

### Use Case 2: Bulk Cache Warming

**Scenario**: Pre-populate cache with common topics

```typescript
import { preWarmCache } from '../utils/questionGenerator';

const commonTopics = [
  { topic: 'system design', difficulty: 'EASY' as const },
  { topic: 'system design', difficulty: 'MEDIUM' as const },
  { topic: 'data structures', difficulty: 'EASY' as const },
  { topic: 'algorithms', difficulty: 'EASY' as const },
];

const result = await preWarmCache(commonTopics, async (topic, difficulty) => {
  // Generate via LLM
  return {
    question: `Question about ${topic}`,
    rubric: { criteria: [...] }
  };
});

console.log(`Pre-warmed ${result.success} topics, ${result.failed} failed`);
```

### Use Case 3: Admin Cache Management

**Scenario**: Admin wants to refresh stale cache

```bash
# Clear specific topic
curl -X DELETE \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/topic-cache/system%20design

# Or clear all caches
curl -X DELETE \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/topic-cache
```

## 🐛 Troubleshooting

### Problem: Cache not working

**Solution 1**: Check Redis connection
```bash
redis-cli ping
# Should return: PONG
```

**Solution 2**: Check environment variable
```bash
# In .env file
REDIS_URL=redis://localhost:6379
```

**Solution 3**: Check logs
```bash
# Look for [TopicCache] logs
grep "TopicCache" backend/logs/*.log
```

### Problem: Questions not being cached automatically

**Check**: Is the LLM evaluation service being called?
```typescript
// In llmEvaluationService.ts, add debug logs
console.log('[DEBUG] Next question:', raw.next_question_text);
console.log('[DEBUG] Extracted topic:', extractedTopic);
```

### Problem: Redis memory full

**Solution**: Reduce TTL or clear old caches
```bash
# Check Redis memory
redis-cli INFO memory

# Clear all topic caches
curl -X DELETE \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5001/api/topic-cache
```

## 📊 Performance Tips

### 1. Pre-warm Common Topics
Cache frequently used topics during off-peak hours:
```typescript
// Run daily at 3 AM
const commonTopics = ['system design', 'data structures', 'algorithms'];
for (const topic of commonTopics) {
  const hasCache = await topicCacheService.hasCache(topic);
  if (!hasCache) {
    // Generate and cache
  }
}
```

### 2. Monitor Cache Hit Rate
```typescript
let cacheHits = 0;
let cacheMisses = 0;

async function getQuestionWithMetrics(topic: string, difficulty: string) {
  const cached = await topicCacheService.tryGetCachedQuestion(topic, difficulty);
  
  if (cached) {
    cacheHits++;
    console.log(`Cache hit rate: ${(cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2)}%`);
    return cached;
  }
  
  cacheMisses++;
  // Generate via LLM...
}
```

### 3. Adjust TTL Based on Topic Popularity
```typescript
// Popular topics: longer TTL (14 days)
await topicCacheService.addToCache('system design', question, rubric, 'EASY', 1209600);

// Rare topics: shorter TTL (3 days)
await topicCacheService.addToCache('rare topic', question, rubric, 'EASY', 259200);
```

## 🎓 Best Practices

1. **Always check cache first** before LLM generation
2. **Use non-blocking writes** for automatic caching
3. **Monitor cache hit rates** to optimize TTL
4. **Clear stale caches** periodically
5. **Pre-warm common topics** during off-peak hours
6. **Log cache operations** for debugging
7. **Set appropriate TTLs** based on topic volatility

## 📚 Next Steps

- Read the [detailed documentation](backend/docs/TOPIC_CACHE.md)
- Review [implementation details](TOPIC_CACHE_IMPLEMENTATION.md)
- Check [architecture diagrams](ARCHITECTURE_DIAGRAM.md)
- Explore the [test suite](backend/src/__tests__/topicCache.test.ts)

## 🆘 Need Help?

- Check the logs: Look for `[TopicCache]` prefixed messages
- Verify Redis: `redis-cli ping`
- Run tests: `npm test -- topicCache.test.ts`
- Review documentation: See `backend/docs/TOPIC_CACHE.md`

---

**Happy Caching! 🎉**
