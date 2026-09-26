# Module 3 — Complete Verification Guide

Everything built in Module 3, how to start the platform, and how to verify every single piece with Postman — endpoints, agent tools, DB tables, events, RBAC, error cases, and idempotency.

---

## What Was Built in Module 3

### Database tables (migrations 016–025, 035)

| Table | Migration | What it stores |
|-------|-----------|----------------|
| `performance.skills` | 016 | Skill master list (21 seeded skills) |
| `performance.student_skills` | 016 | Student ↔ skill link |
| `performance.performance_profiles` | 017 | Running average scores per student |
| `performance.performance_snapshots` | 017 | Immutable score record per assessment attempt |
| `performance.skill_performances` | 018 | Per-skill score per assessment attempt |
| `knowledge.listening_stories` | 019 | Listening comprehension stories |
| `knowledge.knowledge_documents` | 019 | Learning resource documents |
| `knowledge.knowledge_chunks` | 019 | Document chunks for retrieval |
| `performance.learning_plans` | 020 | AI-generated learning plans (with `plan_data` JSONB) |
| `performance.learning_recommendations` | 020 | Per-skill recommendations linked to a plan |
| `agent.agent_definitions` | 021 | Agent config: max_steps, max_tool_calls, timeout_seconds |
| `agent.agent_runs` | 021 | One row per agent execution with status + correlation_id |
| `agent.agent_steps` | 021 | Every decision/tool step taken during a run |

### API endpoints (all new in Module 3)

| Group | Endpoints |
|-------|-----------|
| Skills | GET /skills · GET /skills/:id · POST /skills · PUT /skills/:id · DELETE /skills/:id |
| Performance | GET /performance/:studentId · GET /performance/:studentId/history · GET /performance/:studentId/skills |
| Listening Stories | GET /listening · GET /listening/:id · POST /listening · PUT /listening/:id · DELETE /listening/:id |
| Knowledge Docs | GET /learning/knowledge · GET /learning/knowledge/:id · POST /learning/knowledge |
| Learning Plans | GET /learning/plans/:studentId |
| Recommendations | GET /learning/recommendations/:studentId |
| Agent | POST /learning/agent/run · GET /learning/agent/run/:runId |

### Agent system (new files)

| File | Role |
|------|------|
| `agents/tools.ts` | 4 specialist tools: GetStudentPerformance, GetSkillGapAnalysis, RetrieveLearningKnowledge, DraftLearningPlan |
| `agents/agentLoop.ts` | LLM-driven loop with MAX_STEPS / MAX_TOOL_CALLS / TIMEOUT hard limits |
| `agents/specialistAgent.ts` | Runs loop, owns its own `agent_run`, linked to supervisor via `correlation_id` |
| `agents/supervisorAgent.ts` | Orchestrates steps, delegates to specialist, idempotently persists plan |
| `agents/agentRunner.ts` | HTTP-decoupled worker: CAS guard, loads run, calls supervisor |

### Events system (new in Module 3)

| Event | What happens |
|-------|-------------|
| `USER_REGISTERED` (STUDENT) | Auto-creates `performance.performance_profiles` row |
| `ATTEMPT_COMPLETED` | Inserts immutable snapshot, recalculates running average + trend, upserts skill scores |

### Python AI service (new endpoints)

| Endpoint | What it does |
|----------|-------------|
| `POST /learning/draft-plan` | Generates a structured learning plan from profile + skill gaps |
| `POST /learning/chat-complete` | LLM bridge for the agent loop — returns `tool_call` or `final_answer` |

---

## Quick Start

### Prerequisites

Install before continuing:

| Tool | Required version |
|------|-----------------|
| Node.js | 18 or 20 LTS |
| Python | 3.10 or 3.11 |
| PostgreSQL | 15 or 16 |

### Step 1 — Create the database

In pgAdmin or psql:

```sql
CREATE DATABASE comm_readiness;
```

### Step 2 — Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PG_PASSWORD@127.0.0.1:5432/comm_readiness
JWT_SECRET=any-random-string-of-at-least-32-characters
PORT=5000
NODE_ENV=development
AI_SERVICE_URL=http://127.0.0.1:8000
```

Replace `YOUR_PG_PASSWORD` with your actual Postgres user password.

### Step 3 — Run migrations

```bash
cd backend
npm install
npm run migrate
```

All 35 migrations must apply. Expected last line: `[migrate] all migrations complete`

### Step 4 — AI service `.env`

```bash
cd ai-service
cp .env.example .env
```

Choose one LLM provider:

**Groq (free — recommended)**
```env
LLM_PROVIDER=groq
LLM_API_KEY=your_key_here
LLM_MODEL=llama-3.3-70b-versatile
```
Get a free key: https://console.groq.com → API Keys

**Google Gemini**
```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=AIzaSy_your_key_here
LLM_MODEL=gemini-1.5-flash
```
Get key: https://aistudio.google.com/app/apikey

**No API key (Mock — for offline testing)**
```env
LLM_PROVIDER=mock
```

### Step 5 — Start both services (two terminals)

**Terminal 1 — AI service:**
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Backend:**
```bash
cd backend
npm run dev
```

Both must be running before you test anything. Confirm:
- `http://localhost:5000/api/health` → should return `{"status":"ok"}` (or any 200 response)
- `http://localhost:8000/docs` → Swagger UI for the Python service

---

## Postman Setup

In Postman, create a collection **"Module 3 Verification"** with these **collection variables**:

| Variable | Value to fill in |
|----------|-----------------|
| `base` | `http://localhost:5000/api` |
| `aiBase` | `http://localhost:8000` |
| `token` | *(fill after login)* |
| `adminToken` | *(fill after admin login)* |
| `studentId` | *(fill after register)* |
| `skillId` | *(fill after checking skills)* |
| `storyId` | *(fill after creating story)* |
| `docId` | *(fill after creating document)* |
| `agentRunId` | *(fill after starting agent run)* |
| `planId` | *(fill after agent succeeds)* |

---

## Phase 1 — Create Test Users

### 1.1 Register a Student

**POST** `{{base}}/auth/register`

```json
{
  "name": "Alice Student",
  "email": "alice@test.com",
  "password": "Password123!",
  "role": "STUDENT"
}
```

**Expected:** `200` with `data.token` and `data.studentId`

**Save:** `token` → collection variable `token`, `studentId` → `studentId`

**What this verifies:** `USER_REGISTERED` event fires → `performance.performance_profiles` row is auto-created for this student (the event handler in `module3Handlers.ts` runs).

---

### 1.2 Register a Program Admin

**POST** `{{base}}/auth/register`

```json
{
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "Password123!",
  "role": "PROGRAM_ADMIN"
}
```

**Save:** `data.token` → `adminToken`

---

### 1.3 Register a second student (for RBAC tests)

**POST** `{{base}}/auth/register`

```json
{
  "name": "Bob Student",
  "email": "bob@test.com",
  "password": "Password123!",
  "role": "STUDENT"
}
```

**Save:** `data.token` → `token2`, `data.studentId` → `studentId2`

---

## Phase 2 — Skills API

These verify `skills.routes.ts` and the 21 seeded skills from `024_skills_seed.sql`.

### 2.1 List all skills

**GET** `{{base}}/skills`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.skills` array of 21 items.

Check that all 4 categories are present in the list: `TECHNICAL`, `COMMUNICATION`, `LISTENING`, `PROBLEM_SOLVING`.

**Save** any `id` from the list → `skillId`

---

### 2.2 Filter skills by category

**GET** `{{base}}/skills?category=TECHNICAL`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` — only skills with `category: "TECHNICAL"`. Try all four: `TECHNICAL`, `COMMUNICATION`, `LISTENING`, `PROBLEM_SOLVING`.

---

### 2.3 Get one skill

**GET** `{{base}}/skills/{{skillId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.skill` object containing `id`, `name`, `category`, `description`, `is_active`.

---

### 2.4 Create a skill (admin only)

**POST** `{{base}}/skills`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "name": "Docker & Kubernetes",
  "category": "TECHNICAL",
  "description": "Container orchestration for deployment readiness"
}
```

**Expected:** `201` with the new skill object.

---

### 2.5 Create skill — unauthorized (student should get 403)

**POST** `{{base}}/skills`

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:
```json
{
  "name": "Test Skill",
  "category": "TECHNICAL"
}
```

**Expected:** `403 FORBIDDEN` — students cannot create skills.

---

### 2.6 Update a skill (admin only)

**PUT** `{{base}}/skills/{{skillId}}`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "description": "Updated description for testing"
}
```

**Expected:** `200` with updated skill.

---

### 2.7 Soft-delete a skill (admin only)

First create a throwaway skill:

**POST** `{{base}}/skills`
```json
{ "name": "Delete Me", "category": "TECHNICAL" }
```

Save its `id` as `deleteSkillId`. Then:

**DELETE** `{{base}}/skills/{{deleteSkillId}}`

```
Authorization: Bearer {{adminToken}}
```

**Expected:** `200`. Now GET `/skills` — `Delete Me` should NOT appear (is_active=false filtered out).

---

### 2.8 Get non-existent skill

**GET** `{{base}}/skills/00000000-0000-0000-0000-000000000000`

```
Authorization: Bearer {{token}}
```

**Expected:** `404 NOT_FOUND`

---

## Phase 3 — Events System & Performance API

These verify `module3Handlers.ts` event handlers and `performance.routes.ts`.

### 3.1 Verify profile was auto-created on registration

**GET** `{{base}}/performance/{{studentId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.profile` containing:
```json
{
  "student_id": "...",
  "overall_score": null,
  "technical_score": null,
  "communication_score": null,
  "listening_score": null,
  "trend": "STABLE"
}
```

The profile exists because the `USER_REGISTERED` event fired when Alice registered in step 1.1 and the `handleUserRegistered` handler created it with `ON CONFLICT DO NOTHING`.

---

### 3.2 Simulate an ATTEMPT_COMPLETED event

The event is fired internally when an assessment is submitted. To test the handler directly, use the backend's internal event bus — or trigger it via a direct DB insert + simulate. For Postman testing, the cleanest approach is to confirm the event fires when an assessment attempt completes.

If you have no assessment module yet, you can verify the event handler works by running the automated tests:

```bash
cd backend
npx jest src/__tests__/module3/events.test.ts --verbose
```

Expected: `18 tests pass` covering USER_REGISTERED (profile created, duplicate safe, non-student skipped) and ATTEMPT_COMPLETED (first attempt, multi-attempt running average, duplicate idempotent, trend calculation).

After an ATTEMPT_COMPLETED fires:

- `performance_snapshots` gets a new immutable row
- `performance_profiles` overall_score updates via running average formula: `new_avg = (old_avg × (n−1) + new_score) / n`
- `trend` recalculates: IMPROVING if last-3 avg vs prev-3 avg differs by > 5 points

---

### 3.3 Performance history (snapshots)

**GET** `{{base}}/performance/{{studentId}}/history`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.snapshots` array (empty if no attempts yet) and `data.total`.

Optional pagination: `?limit=10&offset=0`

---

### 3.4 Performance skill breakdown

**GET** `{{base}}/performance/{{studentId}}/skills`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.skills` — grouped per skill with `latest_score` and `history[]`.

---

### 3.5 Performance scope — Student cannot view another student

**GET** `{{base}}/performance/{{studentId}}`

```
Authorization: Bearer {{token2}}
```

**Expected:** `403 FORBIDDEN` — Bob's token cannot read Alice's profile.

---

### 3.6 Performance scope — Admin can view any student

**GET** `{{base}}/performance/{{studentId}}`

```
Authorization: Bearer {{adminToken}}
```

**Expected:** `200` — admin has no scope restriction.

---

## Phase 4 — Listening Stories API

These verify `listening.routes.ts` and `knowledge.listening_stories` table.

### 4.1 List stories (empty at first)

**GET** `{{base}}/listening`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.stories: []`

---

### 4.2 Create a listening story (admin only)

**POST** `{{base}}/listening`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "title": "The Art of Active Listening",
  "content": "In a busy office, Sarah noticed her colleague Mark seemed distracted during meetings. Instead of ignoring this, Sarah chose to listen actively — maintaining eye contact, nodding, and summarizing what Mark said before responding. This simple habit transformed their working relationship.",
  "difficulty": "MEDIUM",
  "source_type": "MANUAL"
}
```

**Expected:** `201` with story object including `id`.

**Save:** `data.story.id` → `storyId`

---

### 4.3 Filter stories by difficulty

**GET** `{{base}}/listening?difficulty=MEDIUM`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` — only MEDIUM difficulty stories. Try `EASY`, `MEDIUM`, `HARD`.

---

### 4.4 Get one story

**GET** `{{base}}/listening/{{storyId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with full story object.

---

### 4.5 Update a story (admin only)

**PUT** `{{base}}/listening/{{storyId}}`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "difficulty": "HARD"
}
```

**Expected:** `200` with updated story.

---

### 4.6 Soft-delete a story (admin only)

**DELETE** `{{base}}/listening/{{storyId}}`

```
Authorization: Bearer {{adminToken}}
```

**Expected:** `200`. GET `/listening` should no longer return this story.

---

### 4.7 Create story — student gets 403

**POST** `{{base}}/listening`

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body: `{ "title": "Test", "content": "Test", "difficulty": "EASY" }`

**Expected:** `403 FORBIDDEN`

---

## Phase 5 — Knowledge Documents API

These verify `learning.routes.ts` knowledge endpoints and the `knowledge.knowledge_documents` / `knowledge.knowledge_chunks` tables.

### 5.1 List documents (empty at first)

**GET** `{{base}}/learning/knowledge`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.documents: []`

---

### 5.2 Create a knowledge document with chunks (admin only)

**POST** `{{base}}/learning/knowledge`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "title": "Java Interview Fundamentals",
  "source_type": "MANUAL",
  "visibility_type": "PUBLIC",
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_text": "Core Java concepts: OOP principles, inheritance, polymorphism, encapsulation, and abstraction. Collections framework: ArrayList, HashMap, LinkedList, TreeMap."
    },
    {
      "chunk_index": 1,
      "chunk_text": "System design fundamentals: scalability patterns, load balancing, caching strategies (Redis, Memcached), database sharding, and microservices architecture."
    },
    {
      "chunk_index": 2,
      "chunk_text": "Concurrency in Java: threads, synchronized blocks, locks, ExecutorService, CompletableFuture, and common concurrency pitfalls to avoid."
    }
  ]
}
```

**Expected:** `201` with `data.document` (the created document) and `data.chunks` (array of 3 chunks).

**Save:** `data.document.id` → `docId`

---

### 5.3 Create second document (for RetrieveLearningKnowledge tool)

**POST** `{{base}}/learning/knowledge`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "title": "Communication Skills for Technical Interviews",
  "source_type": "MANUAL",
  "visibility_type": "PUBLIC",
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_text": "Structuring technical answers using the STAR method: Situation, Task, Action, Result. Always quantify your impact."
    },
    {
      "chunk_index": 1,
      "chunk_text": "Active listening during technical interviews: confirm understanding before answering, clarify ambiguous requirements, and think aloud to show your reasoning."
    }
  ]
}
```

**Expected:** `201`

---

### 5.4 Filter documents by visibility

**GET** `{{base}}/learning/knowledge?visibility_type=PUBLIC`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` — both documents just created.

---

### 5.5 Get document with all chunks

**GET** `{{base}}/learning/knowledge/{{docId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.document` and `data.chunks` (ordered by `chunk_index`).

---

### 5.6 Create document — student gets 403

**POST** `{{base}}/learning/knowledge`

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body: `{ "title": "Test", "source_type": "MANUAL" }`

**Expected:** `403 FORBIDDEN`

---

### 5.7 Get non-existent document

**GET** `{{base}}/learning/knowledge/00000000-0000-0000-0000-000000000000`

```
Authorization: Bearer {{token}}
```

**Expected:** `404 NOT_FOUND`

---

## Phase 6 — Learning Plans & Recommendations (pre-agent)

### 6.1 Plans — empty before agent runs

**GET** `{{base}}/learning/plans/{{studentId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.plans: []` (no plans yet)

---

### 6.2 Recommendations — empty before agent runs

**GET** `{{base}}/learning/recommendations/{{studentId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.recommendations: []`

---

## Phase 7 — Python AI Service Verification

Before testing the agent, confirm the AI service is working correctly on its own.

### 7.1 AI service health

**GET** `{{aiBase}}/docs`

Open in browser. Swagger UI should load, showing all endpoints including `/learning/chat-complete` and `/learning/draft-plan`.

---

### 7.2 Test `/learning/draft-plan` directly

**POST** `{{aiBase}}/learning/draft-plan`

```
Content-Type: application/json
```

Body:
```json
{
  "student_id": "00000000-0000-0000-0000-000000001001",
  "performance_summary": {
    "overall_score": 62.0,
    "technical_score": 48.0,
    "communication_score": 71.0,
    "trend": "STABLE"
  },
  "skill_gaps": [
    { "skill_id": "skill-1", "name": "System Design", "avg_score": 45.0 },
    { "skill_id": "skill-2", "name": "Java Core", "avg_score": 52.0 }
  ],
  "knowledge_context": [
    { "title": "Java Interview Fundamentals", "excerpt": "Core Java concepts..." }
  ]
}
```

**Expected:** `200` with a structured learning plan:
```json
{
  "goal": "...",
  "durationWeeks": 4,
  "focusSkills": ["System Design", "Java Core"],
  "weeklyPlan": [...]
}
```

This verifies the Python service can call your LLM provider and return a structured plan.

---

### 7.3 Test `/learning/chat-complete` directly

**POST** `{{aiBase}}/learning/chat-complete`

```
Content-Type: application/json
```

Body:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a learning specialist. Analyze the student 00000000-0000-0000-0000-000000001001."
    },
    {
      "role": "user",
      "content": "Analyze performance and draft a learning plan."
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "GetStudentPerformance",
        "description": "Get student performance data",
        "parameters": {
          "type": "object",
          "properties": {
            "studentId": { "type": "string" }
          },
          "required": ["studentId"]
        }
      }
    }
  ]
}
```

**Expected:** `200` with either:
```json
{ "type": "tool_call", "tool_name": "GetStudentPerformance", "tool_args": { "studentId": "..." } }
```
or
```json
{ "type": "final_answer", "content": "..." }
```

This verifies the `chat_complete_with_tools` bridge that the agent loop uses.

---

## Phase 8 — Agent Run: The Full Flow

This is the core Module 3 feature. These tests verify the supervisor agent, specialist agent, all 4 tools, step persistence, and plan creation.

### 8.1 Verify agent definitions are seeded

Check directly in Postman or psql that both agent definitions exist. You can't query DB from Postman, so instead trigger the agent and watch the steps — if the agent runs, the definitions were seeded.

Expected from migration `025_agent_definition_seed.sql` + `035_specialist_agent_seed.sql`:
- `learning_readiness_agent` — max_steps=10, max_tool_calls=20, timeout_seconds=60
- `learning_specialist_agent` — max_steps=12, max_tool_calls=8, timeout_seconds=45

---

### 8.2 Start an agent run — returns 202 immediately

**POST** `{{base}}/learning/agent/run`

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:
```json
{
  "studentId": "{{studentId}}",
  "goal": "Improve technical interview readiness"
}
```

**Expected:** `202 Accepted` — response arrives in under 100ms because the agent runs in the background:
```json
{
  "status": "success",
  "data": {
    "agentRunId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Save:** `data.agentRunId` → `agentRunId`

> The run is `QUEUED`. A `setImmediate` worker picks it up after the HTTP response is sent. The agent loop calls your LLM provider via the AI service.

---

### 8.3 Poll — QUEUED state

**GET** `{{base}}/learning/agent/run/{{agentRunId}}`

```
Authorization: Bearer {{token}}
```

Call immediately after 8.2. You may catch:

```json
{
  "data": {
    "run": { "status": "QUEUED", "started_at": null },
    "steps": [],
    "learningPlan": null
  }
}
```

---

### 8.4 Poll — RUNNING state

Call the same endpoint a moment later. You may see:

```json
{
  "data": {
    "run": { "status": "RUNNING", "started_at": "2026-09-24T10:00:00Z" },
    "steps": [
      { "sequence_no": 1, "step_type": "DECISION", "tool_name": null, "status": "COMPLETED", "output": "{\"decision\":\"START\"}" },
      { "sequence_no": 2, "step_type": "TOOL", "tool_name": "GetStudentPerformance", "status": "COMPLETED" }
    ],
    "learningPlan": null
  }
}
```

This shows the supervisor's DECISION step and its direct `GetStudentPerformance` call.

---

### 8.5 Poll — SUCCEEDED state (keep polling until this)

```json
{
  "data": {
    "run": {
      "status": "SUCCEEDED",
      "termination_reason": "LearningPlanPersisted",
      "started_at": "2026-09-24T10:00:00Z",
      "completed_at": "2026-09-24T10:00:08Z"
    },
    "steps": [
      { "sequence_no": 1, "step_type": "DECISION", "tool_name": null,                      "status": "COMPLETED" },
      { "sequence_no": 2, "step_type": "TOOL",     "tool_name": "GetStudentPerformance",    "status": "COMPLETED" },
      { "sequence_no": 3, "step_type": "DECISION", "tool_name": null,                      "status": "COMPLETED" },
      { "sequence_no": 4, "step_type": "DECISION", "tool_name": null,                      "status": "COMPLETED" }
    ],
    "learningPlan": {
      "id": "...",
      "student_id": "...",
      "generated_by_agent_run_id": "{{agentRunId}}",
      "goal": "Improve technical interview readiness",
      "plan_data": {
        "durationWeeks": 4,
        "focusSkills": ["System Design"],
        "weeklyPlan": [...]
      },
      "status": "ACTIVE",
      "version": 1
    }
  }
}
```

**What this proves:**
- Supervisor ran correctly (4 supervisor steps visible)
- Specialist ran inside the supervisor (specialist creates its own `agent_run` linked via `correlation_id`)
- All 4 tools executed: GetStudentPerformance → GetSkillGapAnalysis → RetrieveLearningKnowledge → DraftLearningPlan
- `learning_plans` row created with `generated_by_agent_run_id`, `plan_data`, `version=1`

**Save:** `data.learningPlan.id` → `planId`

---

### 8.6 Verify the 4 specialist tools ran

After SUCCEEDED, the specialist's `agent_run` (a separate row in `agent_runs` with `correlation_id = {{agentRunId}}`) will have its own steps. You can infer the tools ran because `learningPlan` is present and `plan_data` contains `focusSkills` populated from `GetSkillGapAnalysis`.

To confirm each tool:

| Tool | Evidence in SUCCEEDED response |
|------|-------------------------------|
| GetStudentPerformance | `learningPlan.plan_data` references actual student scores |
| GetSkillGapAnalysis | `learningPlan.plan_data.focusSkills` contains weak skills |
| RetrieveLearningKnowledge | `plan_data` may reference document titles from Phase 5 |
| DraftLearningPlan | `learningPlan` exists — this tool called `/learning/draft-plan` on the AI service |

---

### 8.7 Verify learning plans were persisted

**GET** `{{base}}/learning/plans/{{studentId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with at least one plan containing:
```json
{
  "id": "...",
  "generated_by_agent_run_id": "{{agentRunId}}",
  "goal": "Improve technical interview readiness",
  "plan_data": { ... },
  "status": "ACTIVE",
  "version": 1
}
```

**What this proves:** `generated_by_agent_run_id` links the plan to its agent run (DBML column).

---

### 8.8 Verify recommendations were created

**GET** `{{base}}/learning/recommendations/{{studentId}}`

```
Authorization: Bearer {{token}}
```

**Expected:** `200` with `data.recommendations` — one row per weak skill the agent identified (those with average_score < 70). Each recommendation contains `skill_id`, `skill_name`, `recommendation_type: "SKILL_GAP"`, `title`, `priority`, `status: "ACTIVE"`.

---

### 8.9 Idempotency — run the same agent twice, plan is NOT duplicated

Start a second agent run with the exact same `studentId` and `goal`:

**POST** `{{base}}/learning/agent/run`

```json
{
  "studentId": "{{studentId}}",
  "goal": "Improve technical interview readiness"
}
```

**Expected:** `202` with a new `agentRunId2`. Wait for it to reach SUCCEEDED.

Now GET `/learning/plans/{{studentId}}` — **there should still be only one plan**, not two. The supervisor checks `SELECT id FROM performance.learning_plans WHERE generated_by_agent_run_id = $1` before inserting.

> The second run uses a different supervisor run ID, so it creates its own plan. What idempotency prevents is: if the same run ID is somehow processed twice (e.g., crash + retry), it will NOT insert a duplicate.

---

### 8.10 Agent run — 404 for unknown runId

**GET** `{{base}}/learning/agent/run/00000000-0000-0000-0000-000000000000`

```
Authorization: Bearer {{token}}
```

**Expected:** `404 NOT_FOUND`

---

### 8.11 Agent run — scope enforcement (student cannot poll another student's run)

**GET** `{{base}}/learning/agent/run/{{agentRunId}}`

```
Authorization: Bearer {{token2}}
```

**Expected:** `403 FORBIDDEN` — Bob cannot poll Alice's agent run.

---

### 8.12 Agent run — missing goal returns 422

**POST** `{{base}}/learning/agent/run`

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:
```json
{
  "studentId": "{{studentId}}"
}
```

**Expected:** `422 VALIDATION_ERROR` — Zod rejects the missing `goal` field.

---

### 8.13 Agent run — invalid studentId format returns 422

**POST** `{{base}}/learning/agent/run`

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

Body:
```json
{
  "studentId": "not-a-uuid",
  "goal": "Test"
}
```

**Expected:** `422 VALIDATION_ERROR` — Zod rejects the non-UUID.

---

### 8.14 Agent run — student not found returns 404

**POST** `{{base}}/learning/agent/run`

```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:
```json
{
  "studentId": "00000000-0000-0000-0000-000000000001",
  "goal": "Test"
}
```

**Expected:** `404 NOT_FOUND` — no student with that ID.

---

### 8.15 Verify scope violation is caught inside the tools

This is enforced in TypeScript code BEFORE any DB query runs (not by the LLM). You cannot trigger this through HTTP directly, but it is covered by the automated test suite:

```bash
cd backend
npx jest src/__tests__/module3/agent.test.ts -t "scope violation" --verbose
```

**Expected:** test passes, proving `GetStudentPerformance` returns `{ success: false, errorCode: 'SCOPE_VIOLATION' }` before touching the DB when the requested `studentId` does not match the agent's authorized `studentId`.

---

## Phase 9 — Agent Hard Limits

These are tested via the automated test suite (not Postman, because you cannot inject LLM responses via HTTP).

```bash
cd backend
npx jest src/__tests__/module3/agent.test.ts --verbose
```

| Test | What it verifies |
|------|-----------------|
| Test 7 — MAX_STEPS | `runAgentLoop` with `maxSteps=3` returns `terminationReason: 'MAX_STEPS'` when LLM keeps calling tools |
| Test 8 — MAX_TOOL_CALLS | `maxToolCalls=2` returns `'MAX_TOOL_CALLS'` and `toolCallCount=2` |
| Test 9 — TIMEOUT | `timeoutMs=-1` returns `'TIMEOUT'` immediately |
| Test 10 — Tool failure | DB throws → loop continues with error message → `'NATURAL'` termination |
| Test 11 — Specialist failure | Specialist finds no plan → supervisor marks run `'FAILED'` |
| Test 14 — Idempotency | Existing plan → no second INSERT |
| Test 15 — Normal end | All tools + final_answer → `'SUCCEEDED'` |
| Test 16 — Model loops | LLM keeps calling same tool → `MAX_TOOL_CALLS` |

---

## Phase 10 — Full Automated Test Suite

Run all Module 3 tests at once:

```bash
cd backend
npx jest src/__tests__/module3 --runInBand --verbose
```

**Expected final output:**

```
PASS src/__tests__/module3/agent.test.ts
  Test 1 — Supervisor starts correctly (3 tests)
  Test 2 — Supervisor delegates to specialist (1 test)
  Test 3 — Specialist receives only its task (1 test)
  Test 4 — Specialist has only authorized tools (2 tests)
  Test 5 — Read-only tools cannot modify data (2 tests)
  Test 6 — Unauthorized student access is rejected (2 tests)
  Test 7 — Agent step limit works (1 test)
  Test 8 — Tool call limit works (1 test)
  Test 9 — Timeout works (1 test)
  Test 10 — Tool failure is handled (1 test)
  Test 11 — Specialist failure is returned safely (1 test)
  Test 12 — Agent run and steps are persisted (2 tests)
  Test 13 — Learning plan is persisted (1 test)
  Test 14 — Duplicate/replayed side effects are safe (1 test)
  Test 15 — Agent terminates normally (1 test)
  Test 16 — Agent terminates when model loops (1 test)
  Test 17 — Existing Module 3 APIs still work (3 tests)
  Test 18 — Module 1 authentication still works (3 tests)

PASS src/__tests__/module3/skills.test.ts
PASS src/__tests__/module3/events.test.ts
PASS src/__tests__/module3/performance.test.ts

Tests: 63 passed, 0 failed
```

TypeScript check (must be 0 errors):

```bash
npm run typecheck
```

---

## Phase 11 — Security Guardrails (Summary)

These are all enforced in TypeScript code, never by the LLM.

| Guardrail | Where enforced | Test |
|-----------|---------------|------|
| Student can only read own data | `assertStudentScope()` in routes | Phase 3.5, 8.11 |
| SCOPE_VIOLATION inside tools | `tools.ts` checks `args.studentId === ctx.studentId` before any DB query | Phase 8.15 |
| Read-only tools have no INSERT/UPDATE | `authorization.readOnly: true` on 3 of 4 tools | Test 5 |
| DraftLearningPlan never writes to DB | Only calls AI service HTTP, no `db.query` | Test 5.4 |
| Skill/Knowledge create requires admin | `requireRole('PROGRAM_ADMIN', 'TRAINER')` | Phase 2.5, 5.6, 4.7 |
| Skill delete requires admin | `requireRole('PROGRAM_ADMIN')` | Phase 2.7 |
| Agent definitions required | Returns `503 AGENT_UNAVAILABLE` if no active def | Test 17.3 |
| CAS prevents double-execution | `UPDATE WHERE status='QUEUED'` — only one worker wins | Test 14 |
| Plan idempotency | `SELECT` before `INSERT` on learning_plans | Phase 8.9 |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `SASL: client password must be a string` | `DATABASE_URL` has no password | Set `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/comm_readiness` |
| `database "comm_readiness" does not exist` | DB not created | Run `CREATE DATABASE comm_readiness;` in psql |
| `connection refused port 5432` | Postgres not running | Start it: Windows Services → postgresql-x64-16 → Start |
| `connection refused port 8000` | AI service not running | Run `uvicorn app.main:app --reload --port 8000` in `ai-service/` |
| Agent stays `QUEUED` forever | Backend crashed after enqueue | Check terminal 2 for error output |
| Agent goes to `FAILED` | AI service error or missing API key | Try `LLM_PROVIDER=mock` in `ai-service/.env` to test without LLM |
| `401 UNAUTHENTICATED` | Token expired | `POST /api/auth/login` again, save new token |
| `403 FORBIDDEN` on own data | Wrong studentId or wrong token | Make sure token matches the student the data belongs to |
| `503 AGENT_UNAVAILABLE` | No active agent definition | Re-run migrations: `npm run migrate` |
