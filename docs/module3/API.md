# Module 3 — API Reference

All Node.js routes require a valid JWT (`Authorization: Bearer <token>`).

## Learning endpoints

### POST /learning/agent/run
Trigger a learning-plan agent run for a student.

**Body**
```json
{ "studentId": "uuid", "goal": "optional override goal string" }
```

**Response 200**
```json
{ "runId": "uuid", "status": "QUEUED" }
```

---

### GET /learning/agent/run/:runId
Poll the status of an agent run.

**Response 200**
```json
{
  "runId": "uuid",
  "status": "QUEUED | RUNNING | SUCCEEDED | FAILED | DEAD",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

### GET /learning/plans/:studentId
Retrieve all learning plans for a student.

**Response 200**
```json
[
  {
    "id": "uuid",
    "studentId": "uuid",
    "goal": "string",
    "plan": { ... },
    "agentRunId": "uuid",
    "createdAt": "ISO8601"
  }
]
```

---

### GET /learning/recommendations/:studentId
Retrieve learning recommendations for a student.

---

### GET /learning/knowledge
List knowledge documents (public).

### POST /learning/knowledge
Create a knowledge document (FACULTY_MENTOR / PROGRAM_ADMIN only).

---

## Performance endpoints

### GET /performance/:studentId
Returns the current performance profile.

**Response 200**
```json
{
  "studentId": "uuid",
  "overallScore": 72.4,
  "technicalScore": 68.0,
  "communicationScore": 75.1,
  "listeningScore": 73.2,
  "trend": "STABLE | IMPROVING | DECLINING"
}
```

---

### GET /performance/:studentId/history
Returns all performance snapshots (newest first).

---

### GET /performance/:studentId/skills
Returns per-skill performance records.

---

## Internal endpoint (Python AI service)

### POST /internal/cache/invalidate
Called by the Node.js backend after ATTEMPT_COMPLETED to clear stale Redis cache.

**Header**: `X-Internal-Key: <AI_INTERNAL_KEY>`

**Body**
```json
{ "student_id": "uuid" }
```

**Response**: 204 No Content (even if Redis is unavailable)

**Error**: 403 if key is wrong or missing.

---

## Health check (Python AI service)

### GET /health
```json
{
  "status": "ok",
  "service": "HOPE AI Service",
  "version": "1.0.0",
  "llm_provider": "GroqProvider",
  "redis_cache": "connected | disabled"
}
```
