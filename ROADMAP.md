# Roadmap

This roadmap reflects the phased delivery plan derived from SRS v3.0.  
Dates are targets, not commitments. Each phase ships to `develop` before promotion to `main`.

---

## Phase 1 — Foundation  `v0.1.x`

Monorepo scaffold, infrastructure baseline, and shared concerns.

- [ ] Monorepo structure (`apps/web`, `apps/api`, `apps/ai-service`, `packages/shared-types`)
- [ ] Docker Compose local development environment
- [ ] PostgreSQL + pgvector schema and Alembic migrations (all SRS §23 data areas)
- [ ] Redis connection and health check
- [ ] Environment configuration and secret management
- [ ] OpenTelemetry base setup (structured logs + correlation IDs)
- [ ] CI/CD pipeline (lint, test, build, security scan)
- [ ] Kubernetes manifests skeleton and Terraform foundation

---

## Phase 2 — Auth, RBAC, and Profiles  `v0.2.x`

Identity, access control, and student data management.

- [ ] Authentication (FR-AUTH-01 to FR-AUTH-06) — JWT + secure session handling
- [ ] Role-based access control: User → RoleAssignment → Role → Permission → AccessScope
- [ ] Five business roles: Student, CommunicationTrainer, FacultyMentor, ProgramAdmin, PlacementCoordinator
- [ ] Student profile CRUD with program/domain/batch fields
- [ ] Resume upload, parsing, and MinIO/S3 object storage
- [ ] Authorization-negative test suite (cross-mentor, cross-program, privilege escalation)
- [ ] Program, Domain, Batch, Department management APIs

---

## Phase 3 — AI Interview Core  `v0.3.x`

The synchronous interview critical path end-to-end.

- [ ] Assessment abstraction (Assessment → AssessmentAttempt → ComponentScore)
- [ ] Interview orchestration: eligibility check, credit deduction, session lifecycle
- [ ] Question flow: Easy → Medium → Advanced with configured difficulty transitions
- [ ] Voice/audio capture via Web Speech API (STT MVP)
- [ ] FastAPI audio analysis service: fluency, clarity, pace, pitch, pausing metrics
- [ ] FastAPI LLM evaluation: single-pass concurrent STT + LLM execution (Groq/LLaMA)
- [ ] LLMProvider and STTProvider abstraction interfaces
- [ ] Schema-validated structured AI output (versioned Pydantic schema)
- [ ] Deterministic scoring and adaptive difficulty (Node.js — no LLM involvement)
- [ ] WebSocket/SSE real-time interview status

---

## Phase 4 — Listening Assessment, Credits, and Reporting  `v0.4.x`

Independent assessment type, credit accounting, and performance history.

- [ ] Listening Assessment: story delivery, question generation, comprehension evaluation
- [ ] Credit system: CreditAccount, CreditTransaction (EARN/CONSUME/ADJUSTMENT), policy enforcement, idempotency
- [ ] AssessmentReport generation (immutable snapshots after completion)
- [ ] PerformanceProfile + PerformanceSnapshot historical records
- [ ] Performance trend analysis and skill gap identification
- [ ] Learning recommendations engine
- [ ] Role-specific dashboards (Student, Trainer, Mentor, ProgramAdmin, PlacementCoordinator)

---

## Phase 5 — Agent, RAG, and Async Pipeline  `v0.5.x`

Bounded AI agent, knowledge retrieval, and BullMQ background workers.

- [ ] LangGraph bounded agent: GetStudentPerformance, RetrieveLearningKnowledge, GetSkillGapAnalysis, DraftLearningPlan
- [ ] Agent bounds: typed tools, max tool-call count, retry limit, loop detection, audit logging
- [ ] KnowledgeProvider abstraction: pgvector RAG + web-search fallback
- [ ] Permission-aware retrieval with source traceability
- [ ] BullMQ workers: analytics aggregation, report enrichment, embedding generation, notifications
- [ ] Transactional outbox pattern for reliable domain event publication
- [ ] Agent failure test suite (prompt injection, malformed output, tool timeout, excessive loops)

---

## Phase 6 — Production Hardening  `v1.0.0`

Observability, security, load testing, and deployment readiness.

- [ ] OpenTelemetry → Prometheus/Grafana, Loki, distributed tracing
- [ ] Health and readiness checks for all services
- [ ] Full automated test suite: unit, integration, E2E (Playwright), performance (k6)
- [ ] Security scanning: Semgrep, Trivy, OWASP ZAP, secret scanning
- [ ] AI evaluation dataset, model/data cards, baseline metrics, error analysis
- [ ] Kubernetes production manifests with independent service scaling
- [ ] Backup, restore, and rollback procedures documented and tested
- [ ] Architecture decision records (ADRs) for all major technology choices
- [ ] Production runbook

---

## Deferred (Post v1.0)

- Camera / video analysis
- Facial analysis
- Group Discussion (multi-participant real-time)
- Additional assessment types

---

## Open Items Requiring Client Confirmation

See `CLAUDE.md` → Open Items section for the 15 items pending stakeholder sign-off before they can be locked into a phase.
