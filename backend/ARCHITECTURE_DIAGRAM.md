# Persistent Topic Cache - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND / CLIENT                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       BACKEND (Node.js)                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    REST API Routes                           │ │
│  │  /api/topic-cache/*  (NEW)                                   │ │
│  │  /api/sessions/*     (EXISTING)                              │ │
│  └─────────┬────────────────────────────────┬───────────────────┘ │
│            │                                 │                     │
│  ┌─────────▼─────────────┐       ┌─────────▼──────────────────┐  │
│  │  topicCacheService    │       │ sessionContextService       │  │
│  │  (NEW - Persistent)   │       │ (EXISTING - Session-based)  │  │
│  │                       │       │                             │  │
│  │ • Topic extraction    │       │ • Turn context              │  │
│  │ • Cache CRUD          │       │ • Interview state           │  │
│  │ • TTL management      │       │ • 2-hour TTL                │  │
│  │ • Random selection    │       │ • Per-session scope         │  │
│  └─────────┬─────────────┘       └─────────┬──────────────────┘  │
│            │                                 │                     │
│  ┌─────────▼─────────────────────────────────▼──────────────────┐ │
│  │              llmEvaluationService (MODIFIED)                 │ │
│  │                                                              │ │
│  │  • Evaluate student answers                                 │ │
│  │  • Generate next question + rubric                          │ │
│  │  • Extract topic from question (NEW)                        │ │
│  │  • Auto-cache to persistent layer (NEW, non-blocking)       │ │
│  │  • Store turn in session cache (EXISTING)                   │ │
│  └───────────────────────────┬──────────────────────────────────┘ │
│                              │                                     │
│                              │ LLM API Call                        │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   AI Service (LLM)   │
                    │   - Question Gen     │
                    │   - Evaluation       │
                    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        REDIS (Cache Layer)                          │
│                                                                     │
│  ┌──────────────────────────┐      ┌──────────────────────────┐   │
│  │   Topic Cache (NEW)      │      │ Session Cache (EXISTING) │   │
│  │   TTL: 7 days            │      │ TTL: 2 hours             │   │
│  │                          │      │                          │   │
│  │  Key Pattern:            │      │ Key Pattern:             │   │
│  │  topic:cache:{topic}     │      │ session:{id}:context     │   │
│  │                          │      │ session:{id}:state       │   │
│  │  Value:                  │      │                          │   │
│  │  {                       │      │ Value:                   │   │
│  │    topic: "...",         │      │ [{turn, question,        │   │
│  │    items: [              │      │   answer, summary}]      │   │
│  │      {question,          │      │                          │   │
│  │       rubric,            │      │ Interview state JSON     │   │
│  │       difficulty}        │      │                          │   │
│  │    ]                     │      │                          │   │
│  │  }                       │      │                          │   │
│  └──────────────────────────┘      └──────────────────────────┘   │
│                                                                     │
│  Shared across all users/sessions   Per-session, cleared on end   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Flow 1: Question Generation with Auto-Caching

```
┌─────────┐
│ Student │ Answers question
└────┬────┘
     │
     ▼
┌────────────────────┐
│ LLM Evaluation     │ 1. Evaluate answer
│ Service            │ 2. Generate next question + rubric
└────┬───────────────┘
     │
     ├─────────────────────────────┐
     │                             │
     ▼                             ▼
┌────────────────┐         ┌────────────────────┐
│ Session Cache  │         │ Topic Cache (NEW)  │
│ (Existing)     │         │                    │
│                │         │ 1. Extract topic   │
│ Store turn     │         │ 2. Normalize       │
│ context        │         │ 3. Store Q+R       │
└────────────────┘         │    (background)    │
                           └────────────────────┘
```

### Flow 2: Retrieving Cached Questions

```
┌─────────┐
│  User   │ Request question for topic
└────┬────┘
     │
     ▼
┌───────────────────┐
│ API: GET          │
│ /topic-cache/     │
│ {topic}/random    │
└────┬──────────────┘
     │
     ▼
┌────────────────────┐
│ Topic Cache        │
│ Service            │
│                    │
│ 1. Check cache     │ ─────► Cache Hit ───────► Return Q+R
│ 2. Filter by diff  │                          (instant)
│ 3. Random select   │
└────┬───────────────┘
     │
     │ Cache Miss
     ▼
┌────────────────────┐
│ Generate via LLM   │ ─────► Cache result ───► Return Q+R
│ (fallback)         │        for future         (slower)
└────────────────────┘
```

### Flow 3: Cache Management (Admin)

```
┌───────────┐
│   Admin   │
└─────┬─────┘
      │
      ├────────────────────────────────────────────────┐
      │                                                │
      ▼                                                ▼
┌──────────────────┐                      ┌──────────────────┐
│ Clear Cache      │                      │ Update TTL       │
│ DELETE /topic-   │                      │ PATCH /topic-    │
│ cache/{topic}    │                      │ cache/{topic}/ttl│
└────┬─────────────┘                      └────┬─────────────┘
     │                                         │
     ▼                                         ▼
┌────────────────────────────────────────────────────────────┐
│              Redis - Topic Cache Keys                      │
│                                                            │
│  topic:cache:system_design      [DELETED / TTL UPDATED]   │
│  topic:cache:data_structures    [DELETED / TTL UPDATED]   │
│  topic:cache:algorithms         [DELETED / TTL UPDATED]   │
└────────────────────────────────────────────────────────────┘
```

## Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Component Interactions                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ topicCache      │  Provides:
│ Service         │  • addToCache(topic, Q, R, difficulty)
└────┬────────────┘  • getFromCache(topic)
     │               • getRandomPair(topic, difficulty?)
     │               • getCacheStats(topic)
     │               • clearTopicCache(topic)
     │               • extractTopicFromQuestion(question)
     │               • tryGetCachedQuestion(topic, diff?)
     ├───────────────────────────────────────────────┐
     │                                               │
     ▼                                               ▼
┌────────────────┐                          ┌──────────────────┐
│ llmEvaluation  │ Uses for:                │ API Routes       │ Uses for:
│ Service        │ • Auto-cache new Q+R     │ /topic-cache/*   │ • CRUD ops
└────────────────┘ • Background writes      └──────────────────┘ • Stats
                   • Non-blocking                               • Management

┌─────────────────┐
│ questionGen     │  Utility functions:
│ Utility         │  • getQuestionWithRubric() - Cache-first
└─────────────────┘  • hasTopicCache()
                     • getTopicCacheStats()
                     • preWarmCache()
```

## Cache Key Structure

```
Redis Database
│
├── topic:cache:system_design
│   └── {
│         topic: "system design",
│         items: [
│           {
│             question: "What is meant by system design?",
│             rubric: { criteria: [...], maxScore: 10 },
│             difficulty: "EASY",
│             createdAt: "2026-10-06T10:30:00Z"
│           },
│           {
│             question: "Explain load balancing in system design",
│             rubric: { criteria: [...], maxScore: 10 },
│             difficulty: "MEDIUM",
│             createdAt: "2026-10-06T11:00:00Z"
│           }
│         ],
│         lastUpdated: "2026-10-06T11:00:00Z"
│       }
│       [TTL: 7 days]
│
├── topic:cache:data_structures
│   └── { ... }
│       [TTL: 7 days]
│
├── session:abc123:context
│   └── [{turn: 1, question: "...", answer: "...", summary: "..."}]
│       [TTL: 2 hours]
│
└── session:abc123:state
    └── {session_id: "...", student_id: "...", ...}
        [TTL: 2 hours]
```

## Topic Extraction Algorithm

```
Input: "What is meant by system design?"
│
├─► Remove question marks: "What is meant by system design"
│
├─► Remove question starters: "system design"
│   (removes: what, how, why, is, are, meant by, etc.)
│
├─► Normalize: "system design"
│   • Convert to lowercase
│   • Trim whitespace
│   • Replace multiple spaces with single space
│
└─► Output: "system design"
    (used as cache key)
```

## Scalability Considerations

```
┌────────────────────────────────────────────────────────────┐
│                    Scalability Features                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Redis Clustering                                       │
│     • Horizontal scaling                                   │
│     • Automatic sharding                                   │
│                                                            │
│  2. TTL-Based Expiration                                   │
│     • Automatic memory management                          │
│     • Prevents unbounded growth                            │
│                                                            │
│  3. Non-Blocking Writes                                    │
│     • Cache failures don't affect performance              │
│     • Background processing                                │
│                                                            │
│  4. Read Optimization                                      │
│     • O(1) cache lookups                                   │
│     • Random selection from filtered list                  │
│                                                            │
│  5. Multi-User Sharing                                     │
│     • One cache benefits all users                         │
│     • Reduced LLM API calls                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Monitoring Dashboard (Future)

```
┌──────────────────────────────────────────────────────────────┐
│                  Topic Cache Analytics                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Cache Hit Rate:  85%  [████████████░░░░]                    │
│  Cache Miss Rate: 15%  [███░░░░░░░░░░░░░]                    │
│                                                              │
│  Top Topics:                                                 │
│    1. system design        (150 questions, 450 hits)         │
│    2. data structures      (120 questions, 380 hits)         │
│    3. algorithms           (100 questions, 310 hits)         │
│                                                              │
│  Memory Usage:  45 MB / 100 MB  [█████████░░░░░░░░]          │
│                                                              │
│  Cost Savings:  $125 / month                                 │
│    (380 LLM calls avoided)                                   │
│                                                              │
│  Cache Age Distribution:                                     │
│    < 1 day:    40%  [████████░░░░░░░░░░]                     │
│    1-3 days:   30%  [██████░░░░░░░░░░░░]                     │
│    3-7 days:   25%  [█████░░░░░░░░░░░░░]                     │
│    > 7 days:    5%  [█░░░░░░░░░░░░░░░░░] (auto-expire)      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

**Legend:**
- ┌─┐ = Component boundary
- ─►  = Data flow
- │   = Relationship
- [NEW] = New feature added
- [EXISTING] = Unchanged existing feature
- [MODIFIED] = Enhanced existing feature
