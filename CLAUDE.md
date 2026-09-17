# AI-Powered Communication Readiness Platform

## Project Overview

An enterprise-grade platform that assesses and improves student communication and interview readiness through AI-powered assessments. Targets students and job seekers at educational institutions; users include Students, Communication Trainers, Faculty Mentors, Program Administrators, and Placement Coordinators.

**SRS Version:** 3.0  
**Status:** Greenfield — requirements finalized, implementation not yet started.

---

## Architecture

```
                     ┌──────────────────┐
                     │ Next.js / React  │  (Frontend — Vite + Tailwind + shadcn/ui)
                     └────────┬─────────┘
                              │ REST + WS/SSE
                              ▼
                 ┌─────────────────────────┐
                 │       Node.js           │  (Core Business Layer)
                 │ Auth · RBAC · Credits   │
                 │ Assessment Lifecycle    │
                 │ Scoring · Reports       │
                 └──────┬──────────┬───────┘
                        │          │
               SYNC AI  │          │ ASYNC
                        ▼          ▼
             ┌──────────────┐  ┌──────────────┐
             │   FastAPI    │  │    Redis     │
             │  / Python    │  │ Cache/State  │
             │              │  └──────┬───────┘
             │ STT · Audio  │         ▼
             │ LLM / AI     │  ┌──────────────┐
             │ Agent        │  │   BullMQ     │
             └──────┬───────┘  └──────┬───────┘
                    │                  │
                    ▼                  ▼
              AI Providers       Background Workers
                    │             Analytics · Reports
                    ▼             Embeddings · Notifications
         ┌────────────────────┐
         │  KnowledgeProvider │
         │  pgvector / RAG    │
         │  Web Search        │
         └─────────┬──────────┘
                   ▼
            ┌──────────────┐
            │  PostgreSQL  │  ← Authoritative source of truth
            └──────────────┘

MinIO/S3-compatible storage for resumes, knowledge docs.
OpenTelemetry → Prometheus/Grafana · Loki · Distributed Tracing
```

### Responsibility Boundary

| Layer | Owns |
|---|---|
| Node.js | Auth, RBAC, assessment lifecycle, credit accounting, scoring, difficulty transitions, reports, BullMQ job creation, real-time coordination |
| FastAPI/Python | STT, audio analysis, LLM integration, AI evaluation, agent execution, AI provider adapters |
| Neither | Business-critical authorization, credit rules, and authoritative scoring are **never duplicated** inside AI services |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Frontend | Next.js / React, Vite, Tailwind CSS, shadcn/ui |
| Core Backend | Node.js (Express or Fastify) |
| AI Services | FastAPI / Python |
| Primary LLM | Groq (LLaMA 3.1-70b) — abstracted behind a provider interface |
| STT (MVP) | Browser Web Speech API → server-side provider abstraction |
| Database | PostgreSQL (primary) — SQLAlchemy + Alembic for migrations |
| Vector Search | PostgreSQL + pgvector |
| Cache / State | Redis |
| Async Jobs | BullMQ (Redis-backed) |
| Agent Framework | LangGraph (bounded agent) |
| Object Storage | MinIO / S3-compatible |
| Real-time | WebSocket / SSE |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki |
| Containers | Docker, Docker Compose, Kubernetes, Terraform |
| CI/CD | GitHub Actions |
| Testing | Pytest, Vitest/Jest, Playwright, Postman/Newman, k6, Semgrep, Trivy |

---

## Project Structure (Target)

```
/
├── apps/
│   ├── web/                  # Next.js frontend
│   ├── api/                  # Node.js core business API
│   └── ai-service/           # FastAPI AI/ML service
├── packages/
│   ├── shared-types/         # Shared TypeScript/Pydantic schemas
│   └── config/               # Shared environment config
├── infra/
│   ├── docker/
│   ├── k8s/
│   └── terraform/
├── scripts/                  # Dev/ops helper scripts
├── docs/                     # SRS and architecture documents
├── .github/workflows/        # CI/CD pipelines
├── CLAUDE.md
└── progress.json
```

---

## Core Principles (Enforced in All Code)

1. **Authorization is server-side always.** Frontend hiding is not authorization.
2. **LLM never owns business rules.** Eligibility, credit accounting, scoring, difficulty transitions, and authorization stay in Node.js.
3. **AI output is schema-validated** before entering any business logic.
4. **PostgreSQL is the authoritative source of truth.** Redis is cache/state only; it is never the source of business truth.
5. **Interview critical path is synchronous.** BullMQ is never inserted between a student's response submission and the next-question decision.
6. **Independent AI workloads (STT + LLM eval) run concurrently** — not sequentially, not queued.
7. **Historical assessment records are immutable.** New assessments create new snapshots; existing ones are never overwritten.
8. **Credit operations are transactional and idempotent.** Negative balances are prevented at the database level.
9. **Agent is bounded.** It cannot change roles, grant permissions, modify credits, or access data outside the invoking user's authorization scope.
10. **Retrieval is permission-aware.** Retrieved content is treated as untrusted; sources are always traceable.
11. **Decoupled by design.** Every external provider (LLM, STT, search) is accessed through an abstraction interface so it can be swapped without touching business logic.
12. **SOLID principles throughout.** New assessment types, roles, programs, and AI capabilities can be added without redesigning existing subsystems.

---

## Key Design Patterns

- **Provider Abstraction**: LLMProvider, STTProvider, SearchProvider interfaces — concrete adapters are injected.
- **Assessment Abstraction**: Common `Assessment` → `AssessmentAttempt` model supports AI Interview, Listening Assessment, and future types without schema changes.
- **Component Scoring**: Configurable weighted components (e.g., Technical 90%, Communication 10%); only active components contribute to overall score.
- **Transactional Outbox**: Domain events that must be reliably published after a PostgreSQL transaction use the outbox pattern before being handed to BullMQ.
- **Structured Output + Schema Validation**: LLM responses are validated against a versioned JSON schema before any downstream use.
- **Bounded Agent (LangGraph)**: Explicit goal, typed tools, max tool-call count, retry limit, loop detection, audit logging.

---

## RBAC Model

Five business roles: `Student`, `CommunicationTrainer`, `FacultyMentor`, `ProgramAdministrator`, `PlacementCoordinator`.

Authorization separates:
```
User → RoleAssignment → Role → Permission → AccessScope
```

Scopes: Institution / Program / Domain / Batch / Department / ExplicitStudentAssignment.

Every protected API operation must: authenticate → check role → check permission → resolve scope → verify ownership/membership → permit or reject.

---

## Data Areas (PostgreSQL)

Users, Roles, Permissions, RoleAssignments, AccessScopes, Programs, Domains, Batches, Departments, ProgramSubdivisions, Students, StudentMentorAssignments, TrainerDomainAssignments, Resumes, Assessments, AssessmentConfigurations, AssessmentComponents, AssessmentAttempts, InterviewSessions, ListeningSessions, Questions, QuestionBankItems, Responses, CommunicationAnalyses, EvaluationResults, ComponentScores, AssessmentReports, PerformanceProfiles, PerformanceSnapshots, SkillPerformances, LearningRecommendations, ListeningStories, ListeningQuestions, CreditAccounts, CreditTransactions, CreditPolicies, KnowledgeDocuments, KnowledgeChunks (pgvector), AgentDefinitions, AgentRuns, AgentSteps, AgentToolCalls, AuditLogs.

---

## Agent Tools (LangGraph Bounded Agent)

1. `GetStudentPerformance` — reads authorized performance data
2. `RetrieveLearningKnowledge` — permission-filtered pgvector / web-search retrieval
3. `GetSkillGapAnalysis` — computes skill gaps from assessment history
4. `DraftLearningPlan` — produces structured personalized learning plan

All tool inputs/outputs are typed (Pydantic models) and validated. Agent operates under invoking user's auth scope only.

---

## Interview Critical Path

```
Student
  → Next.js (capture voice)
  → Node.js (eligibility + credit check)
  → FastAPI [concurrent: STT/Audio Analysis ∥ LLM Technical Evaluation]
  → Combined AI Result (schema-validated)
  → Node.js (scoring + difficulty transition — deterministic)
  → Question Generation + Knowledge Retrieval
  → Next Question
  → Student
```

---

## Async Workloads (BullMQ)

Non-blocking background jobs only:
- Analytics aggregation
- Report enrichment / generation (when not student-blocking)
- Embedding generation
- Knowledge ingestion
- Notification delivery
- Derived statistics / projections

Each job must define: retry policy, idempotency behavior, backoff, dead-letter handling, timeout/cancellation, correlation ID.

---

## Business Rules Quick Reference

| ID | Rule |
|---|---|
| BR-02 | Eligible self-practice interviews consume student credits |
| BR-05 | Performance-based credit rewards capped at 10 (configurable) |
| BR-15 | LLM never owns auth, credits, or business rules |
| BR-17 | Interview evaluation stays on synchronous critical path |
| BR-22 | Bounded agent cannot change roles/permissions/credits/scores |
| BR-24 | Raw audio is transient by default |
| BR-27 | Historical assessment results are immutable snapshots |
| BR-28 | Credit operations are transactional and idempotent |
| BR-30 | Critical interview state shall not depend on eventual consistency |

---

## Development Guidelines

- **No code before explicit instruction.** Await user confirmation before starting any implementation phase.
- **No unnecessary abstractions.** Add only what the current requirement demands.
- **No comments that describe what the code does.** Only add a comment when the WHY is non-obvious.
- **Provider secrets in environment variables only.** Never hard-code API keys.
- **Migrations are versioned.** Never modify existing migration files; always create new ones.
- **Schema-first for AI outputs.** Define Pydantic/Zod schema before writing any LLM prompt.
- **Test the authorization negative cases** (cross-mentor, cross-program, privilege escalation, agent boundary violations) alongside happy-path tests.

---

## Open Items (Require Client Confirmation)

1. Exact Program Admin vs Placement Coordinator permissions
2. Exact credit-reward formula
3. Scope of conducted-interview one-attempt rule
4. Institution-wide credit-policy authority
5. Exact trainer-visible fields
6. Mentor reassignment workflow
7. Program hierarchy / subdivisions structure
8. Whether a student may belong to multiple programs/groups
9. Retention periods (resumes, transcripts, reports, sessions, agent records, audio)
10. Exact overall-score formula and production weights
11. Production LLM/provider
12. Listening-story generation strategy
13. Exact placement-readiness formula
14. Group Discussion requirements (deferred)
15. Final backend tech decision if client mandates FastAPI as external REST API

---

## Out of Scope (Current Phase)

- Camera / video analysis
- Facial analysis
- Group Discussion
