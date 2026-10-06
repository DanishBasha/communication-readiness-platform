# Topic Cache - Persistent Question and Rubric Storage

## Overview

The Topic Cache is a persistent caching layer that stores LLM-generated questions and their associated rubrics by topic. Unlike the session-based cache that expires when a session ends, this cache:

- **Persists across sessions**: Questions remain available for reuse
- **Multi-user**: Multiple users can benefit from cached questions
- **TTL-based expiration**: Automatically removes old data after a configurable period (default: 7 days)
- **Topic-keyed**: Questions are organized by extracted topics for easy retrieval

## Architecture

### Storage Structure

```
Redis Key: topic:cache:{normalized_topic}

Value (JSON):
{
  "topic": "system design",
  "items": [
    {
      "question": "What is meant by system design?",
      "rubric": { ... },
      "difficulty": "EASY",
      "createdAt": "2026-10-06T10:30:00.000Z"
    },
    ...
  ],
  "lastUpdated": "2026-10-06T10:30:00.000Z"
}
```

### Key Components

1. **TopicCacheService** (`backend/src/services/topicCacheService.ts`)
   - Core service managing cache operations
   - Topic extraction from questions
   - CRUD operations for cached items

2. **Topic Cache Routes** (`backend/src/routes/topicCache.routes.ts`)
   - REST API endpoints for cache management
   - Admin and user-facing operations

3. **Integration with LLM Evaluation** (`backend/src/services/llmEvaluationService.ts`)
   - Automatic caching of generated questions
   - Non-blocking background writes

## Topic Extraction

The service includes a simple topic extraction algorithm that:

1. Removes question marks and common question starters ("What is", "How does", etc.)
2. Extracts the first meaningful phrase (up to 5 words)
3. Stops at common stopwords (in, on, at, for, etc.)
4. Normalizes to lowercase for consistent caching

**Example:**
- Question: "What is meant by system design?"
- Extracted Topic: "system design"

## API Endpoints

### List All Cached Topics
```
GET /api/topic-cache
Authorization: Bearer <token>

Response:
{
  "topics": ["system design", "data structures", ...],
  "count": 42
}
```

### Get Cache for a Topic
```
GET /api/topic-cache/:topic
Authorization: Bearer <token>

Response:
{
  "exists": true,
  "topic": "system design",
  "items": [
    {
      "question": "What is meant by system design?",
      "rubric": { ... },
      "difficulty": "EASY",
      "createdAt": "2026-10-06T10:30:00.000Z"
    }
  ],
  "lastUpdated": "2026-10-06T10:30:00.000Z"
}
```

### Get Cache Statistics
```
GET /api/topic-cache/:topic/stats
Authorization: Bearer <token>

Response:
{
  "exists": true,
  "itemCount": 15,
  "byDifficulty": {
    "EASY": 5,
    "MEDIUM": 7,
    "ADVANCED": 3
  },
  "lastUpdated": "2026-10-06T10:30:00.000Z"
}
```

### Get Random Cached Question
```
GET /api/topic-cache/:topic/random?difficulty=EASY
Authorization: Bearer <token>

Response:
{
  "question": "What is meant by system design?",
  "rubric": { ... },
  "difficulty": "EASY",
  "createdAt": "2026-10-06T10:30:00.000Z"
}
```

### Add Question to Cache (Admin/Trainer)
```
POST /api/topic-cache
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "system design",
  "question": "What is meant by system design?",
  "rubric": { ... },
  "difficulty": "EASY",
  "ttlSeconds": 604800  // Optional, defaults to 7 days
}

Response:
{
  "message": "Question added to cache successfully",
  "topic": "system design"
}
```

### Clear Topic Cache (Admin)
```
DELETE /api/topic-cache/:topic
Authorization: Bearer <token>

Response:
{
  "message": "Topic cache cleared successfully",
  "topic": "system design"
}
```

### Clear All Caches (Admin)
```
DELETE /api/topic-cache
Authorization: Bearer <token>

Response:
{
  "message": "All topic caches cleared successfully"
}
```

### Update Cache TTL (Admin)
```
PATCH /api/topic-cache/:topic/ttl
Authorization: Bearer <token>
Content-Type: application/json

{
  "ttlSeconds": 1209600  // 14 days
}

Response:
{
  "message": "TTL updated successfully",
  "topic": "system design",
  "ttlSeconds": 1209600
}
```

## Automatic Caching

The system automatically caches questions during interview evaluation:

1. **LLM generates next question and rubric**
2. **Topic extraction** runs on the question text
3. **Background cache write** stores the question-rubric pair
4. **Non-blocking**: Cache failures don't affect the interview flow

Example flow in `llmEvaluationService.ts`:
```typescript
if (raw.next_question_text && raw.rubric_for_next_question) {
  const extractedTopic = topicCacheService.extractTopicFromQuestion(raw.next_question_text);
  if (extractedTopic) {
    topicCacheService
      .addToCache(
        extractedTopic,
        raw.next_question_text,
        raw.rubric_for_next_question,
        nextDifficulty
      )
      .catch((err) => {
        console.error('[llmEvaluation] Topic cache write failed:', err);
      });
  }
}
```

## Usage Examples

### Checking Cache Before LLM Generation

```typescript
import { topicCacheService } from '../services/topicCacheService';

// Try to get from cache first
const cached = await topicCacheService.tryGetCachedQuestion('system design', 'EASY');

if (cached) {
  // Use cached question
  const { question, rubric } = cached;
  console.log('Using cached question:', question);
} else {
  // Cache miss - generate via LLM
  const generated = await generateQuestionViaLLM('system design', 'EASY');
  
  // Automatically cached for future use
  await topicCacheService.addToCache(
    'system design',
    generated.question,
    generated.rubric,
    'EASY'
  );
}
```

### Getting Cache Statistics

```typescript
const stats = await topicCacheService.getCacheStats('system design');

console.log(`Cache exists: ${stats.exists}`);
console.log(`Total questions: ${stats.itemCount}`);
console.log(`EASY: ${stats.byDifficulty.EASY}`);
console.log(`MEDIUM: ${stats.byDifficulty.MEDIUM}`);
console.log(`ADVANCED: ${stats.byDifficulty.ADVANCED}`);
```

## Configuration

### TTL Configuration

Default TTL is 7 days (604800 seconds). You can customize TTL:

1. **Global default**: Modify `DEFAULT_TTL_SECONDS` in `TopicCacheService`
2. **Per-topic**: Use the `ttlSeconds` parameter when adding to cache
3. **Update existing**: Use the PATCH `/api/topic-cache/:topic/ttl` endpoint

### Cache Key Normalization

Topics are normalized before caching to ensure consistency:
- Converted to lowercase
- Whitespace trimmed
- Multiple spaces replaced with single space

Examples:
- "System Design" → "system design"
- "  data structures  " → "data structures"
- "Binary   Search" → "binary search"

## Monitoring and Maintenance

### Redis Memory Management

Monitor Redis memory usage:
```bash
redis-cli INFO memory
```

### Cache Hit Rate

Track cache effectiveness by logging:
- Cache hits (questions served from cache)
- Cache misses (new LLM generations)
- Cache size per topic

### Cleanup Strategy

1. **Automatic**: TTL-based expiration (default 7 days)
2. **Manual**: Admin endpoints for clearing specific topics or all caches
3. **Monitoring**: Use stats endpoints to identify large or stale caches

## Performance Considerations

### Benefits
- **Reduced LLM calls**: Cache hits avoid expensive API calls
- **Faster response times**: Cached questions return instantly
- **Cost savings**: Fewer LLM API requests
- **Consistent questions**: Same topics generate similar questions over time

### Trade-offs
- **Redis memory**: Each question-rubric pair consumes Redis memory
- **Freshness**: Cached questions may become outdated (mitigated by TTL)
- **Extraction accuracy**: Simple topic extraction may miss nuances

## Error Handling

All cache operations are non-fatal:
- **Cache write failures**: Logged but don't break interview flow
- **Cache read failures**: Return null, fallback to LLM generation
- **Redis unavailable**: Application continues without caching

## Migration Notes

### From Session Cache
The persistent cache complements (doesn't replace) the session cache:

| Feature | Session Cache | Topic Cache |
|---------|--------------|-------------|
| Scope | Single session | Global |
| Lifetime | Session duration (2 hours) | Configurable TTL (7 days) |
| Purpose | Short-term context | Long-term reuse |
| Storage | Turn-by-turn transcript | Question-rubric pairs |

### Data Migration
No migration needed - the two caches serve different purposes and coexist.

## Future Enhancements

Potential improvements:
1. **NLP-based topic extraction**: Use more sophisticated algorithms
2. **Semantic search**: Find similar questions across topics
3. **Quality scoring**: Track which cached questions perform well
4. **Analytics dashboard**: Visualize cache usage and effectiveness
5. **Cache warming**: Pre-populate cache with common topics
6. **Duplicate detection**: Avoid caching very similar questions
