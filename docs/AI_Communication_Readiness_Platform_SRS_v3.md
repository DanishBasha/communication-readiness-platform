# Software Requirements Specification (SRS)

## AI-Powered Communication Readiness Platform

**Document Version:** 3.0  
**Status:** Revised Product Baseline / Requirements Specification  
**Document Type:** Software Requirements Specification  
**Primary Audience:** Product Owners, Client Stakeholders, Architects, Developers, QA Engineers, AI/ML Engineers, UI/UX Designers, Trainers, Mentors, Administrators

---

# 1. Introduction

## 1.1 Purpose

This Software Requirements Specification defines the functional, non-functional, security, access-control, data, AI, assessment, reporting, asynchronous-processing, agent, deployment, observability, testing, and operational requirements for the AI-Powered Communication Readiness Platform.

The platform assesses and improves student communication and interview readiness through AI-powered assessments. It evaluates technical knowledge, communication quality, listening comprehension, and overall performance, then provides reports, skill-gap information, and personalized learning recommendations.

This SRS is the baseline for architecture, database design, API design, UI/UX, implementation, testing, deployment, and project defence.

## 1.2 Product Scope

The platform shall provide:

- Student profile and resume management.
- AI-powered technical interview assessment.
- Voice-based response processing.
- Speech-to-text processing.
- Communication/audio analysis.
- Adaptive interview difficulty.
- Listening assessment.
- Structured AI evaluation.
- Performance history and trend analysis.
- Assessment reports.
- Learning recommendations and skill-gap analysis.
- Student interview-credit management.
- Role-based and scope-based access control.
- Program, domain, batch, mentor, and trainer management.
- Program-level and institution-level dashboards.
- Bounded AI agent capabilities for learning/readiness planning.
- Retrieval-augmented knowledge support with permission-aware retrieval and traceable sources.
- Real-time assessment status using WebSocket or SSE.
- Background processing using BullMQ backed by Redis.
- Production observability, security, testing, deployment, and recovery capabilities.

## 1.3 Current Scope Boundaries

The current implementation includes:

1. AI Interview.
2. Listening Assessment.
3. Voice/audio analysis.
4. Technical evaluation.
5. Communication evaluation.
6. Performance and reporting.
7. Learning recommendations.
8. Bounded learning/readiness agent.

The current implementation does not require:

- Camera/video analysis.
- Facial analysis.
- Group Discussion.

These may be added later without redesigning the complete domain model.

## 1.4 Product Objectives

The system shall:

1. Assess interview readiness.
2. Assess technical knowledge.
3. Assess communication characteristics.
4. Assess listening comprehension independently.
5. Adapt interview difficulty according to demonstrated performance.
6. Produce structured and understandable assessment results.
7. Maintain immutable historical assessment results.
8. Identify skills requiring improvement.
9. Generate personalized learning recommendations.
10. Provide role-specific dashboards.
11. Enforce least-privilege, role-based, and scope-based access.
12. Support program, domain, batch, mentor, and trainer relationships.
13. Provide scalable synchronous AI processing and asynchronous background processing.
14. Provide measurable AI quality evidence.
15. Provide production-grade observability and operational controls.

---

# 2. Definitions and Acronyms

| Term | Definition |
|---|---|
| AI | Artificial Intelligence |
| LLM | Large Language Model |
| STT | Speech-to-Text |
| RBAC | Role-Based Access Control |
| RAG | Retrieval-Augmented Generation |
| SRS | Software Requirements Specification |
| Assessment | An AI Interview or Listening Assessment |
| Assessment Attempt | One execution of an assessment |
| Performance Profile | Current/latest aggregate performance |
| Performance Snapshot | Historical performance state |
| Mentor Scope | Students explicitly assigned to a mentor |
| Program Scope | Students within an administrator's authorized program/domain |
| Credit | Unit used for eligible self-practice interview attempts |
| BullMQ | Redis-backed Node.js job/queue framework |
| Agent | Bounded LangGraph workflow with defined tools and limits |

---

# 3. Product Perspective

## 3.1 Logical Components

The platform shall contain:

- Next.js/React frontend.
- Node.js core application and business layer.
- FastAPI/Python AI services.
- PostgreSQL relational system of record.
- Redis cache and short-lived state.
- BullMQ asynchronous job processing.
- LLM provider abstraction.
- Speech-to-text provider abstraction.
- Audio/communication analysis.
- PostgreSQL pgvector knowledge store.
- Web-search fallback where enabled.
- LangGraph bounded agent.
- MinIO/S3-compatible object storage.
- WebSocket/SSE real-time delivery.
- OpenTelemetry-based observability.
- Prometheus/Grafana metrics.
- Loki or equivalent centralized logs.
- Docker/Kubernetes/Terraform deployment foundation.

## 3.2 Backend Responsibility Boundary

### Node.js

Node.js shall own the core application/business concerns:

- Authentication.
- Authorization.
- RBAC.
- User management.
- Profile management.
- Assessment lifecycle.
- Interview orchestration.
- Listening orchestration.
- Credit management.
- Business rules.
- Score calculation and weighting.
- Difficulty-transition rules.
- Report APIs.
- Dashboard APIs.
- Transaction coordination.
- Critical PostgreSQL persistence.
- BullMQ job creation and consumption where applicable.
- Real-time session coordination.

### FastAPI/Python

FastAPI/Python shall own AI/audio workloads:

- Speech-to-text integration.
- Audio/communication analysis.
- AI/ML processing.
- LLM integration where appropriate.
- AI-specific evaluation processing.
- Agent execution.
- AI-specific provider adapters.

Business-critical authorization, credit rules, and authoritative scoring rules shall not be duplicated inside AI services.

## 3.3 Synchronous Interview Principle

The student-facing interview progression shall remain synchronous.

The critical path shall be:

```text
Student
  -> Next.js
  -> Node.js
  -> FastAPI
  -> STT / Audio Analysis
  -> LLM Evaluation
  -> Combined AI Result
  -> Node.js Scoring
  -> Question Generation
  -> Knowledge Retrieval
  -> Next Question
  -> Student
```

BullMQ shall not be inserted between response submission and the next-question decision when the student is waiting for that decision.

Independent AI workloads such as STT/audio analysis and LLM evaluation may execute concurrently where technically appropriate. This means concurrent asynchronous execution, not mandatory use of two operating-system threads.

---

# 4. Users and Roles

The platform shall support five primary business roles:

1. Student.
2. Communication Trainer.
3. Faculty Mentor.
4. Program Administrator.
5. Placement Coordinator.

AI/STT/audio services are technical components and are not business roles.

## 4.1 Student

Students shall be able to:

- Authenticate.
- Manage their own profile.
- Upload and manage resumes.
- Start eligible self-practice AI interviews.
- Consume eligible interview credits.
- Earn performance-based credits.
- Take listening assessments.
- Answer interview questions.
- Submit voice responses.
- Receive technical and communication evaluation.
- View their own reports.
- View their own performance history.
- View trends.
- View learning recommendations.
- View skill gaps.
- View their own credit balance and transaction history.

Students shall not:

- Access another student's protected data.
- Configure credit rules.
- Grant permissions.
- Modify authoritative scores.

## 4.2 Communication Trainer

Communication Trainers shall be able to:

- Authenticate.
- View authorized student profiles.
- View relevant student skills.
- View communication performance.
- View relevant assessment results.
- View performance trends where authorized.
- Use performance information for communication guidance.

Communication Trainers shall not:

- Access student credits.
- Configure credit rules.
- Access placement-related student reports.
- Access students outside their authorized domain/scope.
- Grant themselves additional access.

A trainer may belong to multiple domains, and multiple trainers may belong to the same domain.

## 4.3 Faculty Mentor

Faculty Mentors shall be able to:

- Authenticate.
- View explicitly assigned students.
- View assigned student profiles.
- View assessment history.
- View performance metrics.
- View trends.
- Monitor progress.
- Use authorized student performance information for mentoring.

Mentors shall not:

- Access another mentor's students unless explicitly authorized.
- Manage credits.
- Configure credit rules.
- Change their own mentor assignments.

Mentor access shall be assignment-based.

A student and mentor are not required to belong to the same department.

## 4.4 Program Administrator

Program Administrators shall be able to:

- View students within authorized program/domain scope.
- View student profiles.
- View student skills.
- View assessment history.
- View technical performance.
- View communication performance.
- View listening performance where applicable.
- View reports.
- View trends.
- View batch-wise performance.
- View program-level performance.
- Configure assessment rules where authorized.
- Configure credit policies where authorized.
- Manage program/domain data.
- Manage batches.
- Manage users/roles within permitted administrative scope.
- Assign students to mentors where authorized.
- Assign trainers to domains where authorized.

Program Administrators shall not automatically access unrelated programs/domains.

## 4.5 Placement Coordinator

Placement Coordinators shall be able to:

- View authorized institution-level performance.
- View batch-wise performance.
- View top performers.
- View placement-readiness information.
- Drill down to authorized student information.
- View placement-related reports.
- Configure credit policies where authorized.
- Perform placement-oriented oversight.

The exact distinction between Program Administrator and Placement Coordinator permissions shall be configurable.

---

# 5. Organization and Scope Model

## 5.1 Organizational Entities

The system shall support:

- Institution.
- Program.
- Domain.
- Batch.
- Department.
- Program subdivision/group.
- Student.
- Mentor assignment.
- Trainer-domain assignment.

Example programs include HOPE and PEP.

PEP may contain domains such as Full Stack and DevOps.

Program subdivisions such as HOPE Elite and Non-Elite shall be configurable data structures, not hard-coded organizational entities.

Batch values such as 2027, 2028, and 2029 shall be configurable.

## 5.2 Student Organization

A student shall have an active program/domain assignment according to the business configuration.

The data model shall support future changes to program, domain, batch, and subdivision structures.

## 5.3 Department

Department belongs to the User entity where applicable.

Department shall not implicitly determine student-mentor relationships.

There shall be no requirement that a mentor and assigned student share the same department.

## 5.4 Mentor Assignment

Mentor access shall be based on explicit Student-Mentor assignment.

The system shall maintain assignment records including:

- Student.
- Mentor.
- Assignment status.
- Effective dates where required.
- Assignment audit information.

A mentor shall not gain student access merely because both users belong to the same department.

## 5.5 Trainer Domain Assignment

A trainer may be assigned to multiple domains.

A domain may have multiple trainers.

Trainer access shall be determined from explicit domain/scope assignments.

---

# 6. Authorization Model

## 6.1 RBAC Structure

Authorization shall separate:

```text
User
  -> Role Assignment
       -> Role
       -> Permission
       -> Access Scope
```

Permissions shall be separate from roles.

Scopes may include:

- Institution.
- Program.
- Domain.
- Batch.
- Department where applicable.
- Explicit student assignment.

## 6.2 Authorization Requirements

Every protected API operation shall:

1. Authenticate the user.
2. Determine the user's roles.
3. Determine required permission.
4. Resolve applicable scope.
5. Verify resource ownership or scope membership.
6. Permit or reject the operation server-side.

Frontend hiding shall never be treated as authorization.

## 6.3 Permission Categories

The permission model shall support permissions for:

### Identity

- `auth.login`
- `profile.read`
- `profile.update`

### Student

- `student.profile.read`
- `student.profile.update`
- `student.resume.read`
- `student.resume.upload`

### Assessment

- `assessment.read`
- `assessment.start`
- `assessment.answer`
- `assessment.submit`
- `assessment.report.read`

### Performance

- `performance.read`
- `performance.history.read`
- `performance.trends.read`

### Credits

- `credit.read.own`
- `credit.consume`
- `credit.earn`
- `credit.policy.read`
- `credit.policy.configure`
- `credit.adjust`

### Program

- `program.read`
- `program.create`
- `program.update`
- `domain.manage`
- `batch.manage`

### User Administration

- `user.read`
- `user.create`
- `user.update`
- `role.assign`
- `permission.manage`

### Mentor/Trainer Assignment

- `mentor.assignment.read`
- `mentor.assignment.manage`
- `trainer.domain.read`
- `trainer.domain.manage`

### Placement

- `placement.read`
- `placement.report.read`
- `placement.readiness.read`

### Agent

- `agent.run`
- `agent.tool.use`
- `agent.audit.read`
- `agent.configuration.manage`

Exact role-to-permission mapping shall be configurable and auditable.

## 6.4 Access Matrix

| Capability | Student | Trainer | Mentor | Program Admin | Placement |
|---|---|---|---|---|---|
| Own profile | Own | Authorized | Authorized | Authorized | Authorized |
| Student profile | Own | Authorized scope | Assigned students | Program/domain scope | Authorized broad scope |
| Resume | Own | If authorized | If authorized | If authorized | If authorized |
| AI interview | Yes | No default | Authorized conducted workflow | As configured | Authorized conducted workflow |
| Listening | Yes | No default | No default | As configured | As configured |
| Technical results | Own | Authorized | Assigned | Program/domain | Authorized |
| Communication results | Own | Authorized | Assigned | Program/domain | Authorized |
| Performance history | Own | Authorized | Assigned | Program/domain | Authorized |
| Assessment report | Own | Relevant data | Assigned | Program/domain | Authorized |
| Learning recommendations | Own | Guidance context | Guidance context | Program oversight | Readiness context |
| Own credits | Yes | No | No | No | No |
| Configure credit rules | No | No | No | If authorized | If authorized |
| Mentor assignment | No | No | No self-change | Authorized | If authorized |
| Trainer-domain assignment | No | No self-grant | No | Authorized | If authorized |
| User/role management | No | No | No | Scoped | Authorized |
| Program management | No | No | No | Authorized | Authorized oversight |
| Placement reports | No | No | No unless explicitly authorized | According to scope | Authorized |

---

# 7. Authentication and Account Management

### FR-AUTH-01

The system shall authenticate authorized users securely.

### FR-AUTH-02

The system shall establish authenticated identity before protected operations.

### FR-AUTH-03

The system shall support secure session/token handling.

### FR-AUTH-04

Authentication secrets shall not be stored insecurely.

### FR-AUTH-05

Authentication and authorization failures shall not expose sensitive implementation details.

### FR-AUTH-06

Security-sensitive authentication events shall be auditable.

---

# 8. Student Profile and Resume

### FR-PROFILE-01

Each student shall have a profile.

### FR-PROFILE-02

Students shall be able to update permitted profile fields.

### FR-PROFILE-03

The profile shall support program, domain, batch, target domain, skills, and relevant readiness information.

### FR-RESUME-01

Students shall be able to upload resumes.

### FR-RESUME-02

The system shall support resume parsing where enabled.

### FR-RESUME-03

Parsed resume information may be used as interview context.

### FR-RESUME-04

Resume files shall be stored using controlled object storage.

### FR-RESUME-05

Resume access shall follow RBAC and scope restrictions.

---

# 9. Assessment Model

## 9.1 Assessment Abstraction

The platform shall use a common Assessment abstraction supporting:

- AI Interview.
- Listening Assessment.
- Future assessment types.

An assessment definition shall be separate from an assessment attempt.

A student may have multiple attempts when permitted by assessment configuration.

## 9.2 Assessment Components

An assessment may contain configurable components.

Each active component may have:

- Component type.
- Score.
- Weight.
- Version.
- Configuration.

Only configured active components shall contribute to the overall score.

Example:

```text
Technical = 90%
Communication = 10%
```

Exact production weights shall be configurable.

---

# 10. AI Interview

## 10.1 Interview Initiation

### FR-INT-01

An eligible student shall be able to start an AI interview.

### FR-INT-02

Eligibility shall be checked before starting.

### FR-INT-03

The system shall support self-practice and configured conducted interview types.

### FR-INT-04

The interview shall maintain a unique session.

## 10.2 Question Flow

The interview shall support:

```text
Easy
  -> Medium
  -> Advanced
```

Question progression shall depend on demonstrated performance and configured rules.

The initial interview may include:

- Self-introduction.
- Resume-related question.
- Easy technical question.

Subsequent questions may become more difficult based on performance.

## 10.3 Question Generation Inputs

Question generation may use:

- Current question.
- Previous questions.
- Student responses.
- Technical evaluation.
- Current difficulty.
- Student profile.
- Resume context.
- Target domain.
- Retrieved knowledge where enabled.

The system shall avoid substantially repeating questions within the same attempt.

## 10.4 Deterministic Business Logic

The application, not the LLM, shall own:

- Eligibility.
- Credit accounting.
- Authorization.
- Score weighting.
- Difficulty-transition rules.
- Attempt state.
- Persistence.
- Completion state.

---

# 11. Voice and Audio Processing

### FR-AUDIO-01

Voice responses shall be supported.

### FR-AUDIO-02

The client shall submit audio through a secure channel.

### FR-AUDIO-03

The current implementation shall not require camera access.

### FR-AUDIO-04

Raw interview audio shall be transient by default and shall not be permanently retained unless an approved retention rule requires it.

### FR-AUDIO-05

Speech-to-text shall convert eligible audio responses into transcripts.

### FR-AUDIO-06

Audio analysis shall generate structured communication metrics.

Potential metrics include:

- Fluency.
- Clarity.
- Speaking pace.
- Pitch-related indicators.
- Pausing/silence patterns.
- Other validated communication indicators.

### FR-AUDIO-07

Invalid, empty, corrupted, or unsupported audio shall be rejected safely.

---

# 12. Synchronous AI Evaluation

## 12.1 Parallel AI Work

After a voice response is submitted, independent processing may occur concurrently:

```text
                    Response
                       |
             +---------+---------+
             |                   |
             v                   v
       STT / Audio          LLM Evaluation
       Analysis             Technical
             |                   |
             +---------+---------+
                       |
                       v
                Combined Result
```

The system shall not use RabbitMQ/BullMQ to queue these student-blocking evaluation steps.

## 12.2 Single-Pass Technical Evaluation

By default, one comprehensive LLM evaluation call shall be made per response.

The evaluation prompt shall instruct the model to consider:

- Technical correctness.
- Completeness.
- Reasoning.
- Conceptual understanding.
- Relevance.
- Terminology.
- Assumptions and edge cases.
- Depth appropriate to difficulty.
- Misconceptions and contradictions.
- Evidence in the answer.

The system shall not expose hidden chain-of-thought.

The system shall store structured evaluation output rather than hidden reasoning.

## 12.3 Structured Output

AI output shall be schema-validated before entering business logic.

Example:

```json
{
  "technical_score": 82,
  "correctness": 85,
  "depth": 78,
  "relevance": 90,
  "strengths": [],
  "weaknesses": [],
  "feedback": "",
  "confidence": 0.87
}
```

The exact production schema shall be versioned.

---

# 13. Scoring and Adaptive Difficulty

### FR-SCORE-01

The system shall calculate component scores deterministically.

### FR-SCORE-02

Technical and communication scores shall remain distinguishable.

### FR-SCORE-03

Overall scores shall use configured component weights.

### FR-SCORE-04

Scoring rules shall be versioned.

### FR-SCORE-05

The application shall determine the next difficulty using configured business rules and validated evaluation results.

### FR-SCORE-06

A strong response may increase difficulty.

### FR-SCORE-07

A weak response may retain or reduce difficulty.

### FR-SCORE-08

Score calculation shall not depend on unvalidated free-form LLM output.

---

# 14. Listening Assessment

The listening assessment shall be independent from the interview.

Flow:

```text
Story / Listening Passage
        |
        v
Questions
        |
        v
Student Responses
        |
        v
Comprehension Evaluation
        |
        v
Listening Score
```

### FR-LISTEN-01

Students shall be able to start a listening assessment independently.

### FR-LISTEN-02

The system shall present a story/listening passage.

### FR-LISTEN-03

Questions shall be generated or selected according to configuration.

### FR-LISTEN-04

Students shall answer listening questions.

### FR-LISTEN-05

The system shall evaluate comprehension.

### FR-LISTEN-06

The system shall produce a structured listening score.

### FR-LISTEN-07

Listening results shall be stored in assessment history.

Whether listening contributes to overall performance shall be configurable.

---

# 15. Context Management

Interview context may include:

- Current question.
- Previous questions.
- Responses.
- Transcripts.
- Technical evaluations.
- Communication metrics.
- Current difficulty.
- Current score.
- Progress.
- Session status.
- Timestamps.

The platform shall avoid unnecessarily sending the complete conversation history to the LLM on every request.

Context management shall support:

- Short-term context.
- Structured session state.
- Compressed summaries where useful.

Persistent historical assessment data shall remain separate from transient session context.

---

# 16. Reporting

After a completed assessment, the system shall generate an AssessmentReport.

A report shall contain, as applicable:

- Component scores.
- Overall score.
- Technical performance.
- Communication performance.
- Listening performance.
- Strengths.
- Weaknesses.
- Feedback.
- Recommendations.
- Skill gaps.
- Target-domain skills.
- Historical comparison.

Reports shall be immutable historical snapshots after completion, except for explicitly versioned corrections.

---

# 17. Performance Model

## 17.1 Performance Profile

The current performance profile may contain:

- Technical score.
- Communication score.
- Listening score.
- Overall score.
- Previous overall score.
- Trend.
- Skill-level performance.

## 17.2 Historical Snapshots

Each completed assessment shall preserve historical performance.

Historical records shall not be silently overwritten when new assessments occur.

Changes to scoring logic shall not invalidate historical scores.

The system shall support performance trend analysis.

---

# 18. Learning Recommendations

The platform shall generate recommendations from demonstrated performance.

Recommendations shall consider:

- Weak skills.
- Skill gaps.
- Target domain.
- Assessment history.
- Communication issues.
- Technical weaknesses.
- Listening performance where relevant.

Students shall be able to view recommendations from their report/profile.

---

# 19. Bounded Learning/Readiness Agent

## 19.1 Agent Purpose

The platform shall contain a bounded LangGraph agent for personalized learning/readiness analysis.

The agent shall not replace deterministic interview orchestration.

The agent goal shall be limited to:

1. Gather authorized performance evidence.
2. Retrieve permitted learning knowledge.
3. Analyze skill gaps.
4. Draft a personalized learning/readiness plan.

## 19.2 Agent Tools

The agent shall have at least three meaningful typed tools.

Recommended tools:

1. `GetStudentPerformance`
2. `RetrieveLearningKnowledge`
3. `GetSkillGapAnalysis`
4. `DraftLearningPlan`

Tool inputs and outputs shall be typed and validated.

## 19.3 Agent Permissions

The agent shall operate under the invoking user's authorization scope.

It shall not:

- Change roles.
- Grant permissions.
- Modify credits.
- Modify authoritative scores.
- Circumvent access scope.
- Access another student's protected data.
- Execute arbitrary unrestricted database queries.
- Perform unrestricted external communication.

## 19.4 Agent Bounds

The agent shall have:

- Explicit goal.
- Allowed tool list.
- Prohibited actions.
- Maximum tool-call count.
- Retry limit.
- Time/resource budget.
- Termination conditions.
- Loop detection.
- Structured state where needed.
- Cancellation handling.
- Partial-failure handling.
- Audit logging.

## 19.5 Agent Failure Handling

The system shall handle:

- Tool timeout.
- Tool failure.
- Malformed tool output.
- Prompt injection.
- Unauthorized tool invocation.
- Invalid tool parameters.
- Excessive tool loops.
- Resource exhaustion.
- Cancellation.
- Partial tool failure.

The system shall fail safely when an agent tool cannot be completed.

## 19.6 Agent Persistence and Audit

The system shall support records for:

- Agent definition.
- Agent run.
- Agent steps.
- Agent tool calls.
- Errors/status.
- Relevant input/output metadata.

---

# 20. Retrieval and Knowledge

## 20.1 Knowledge Provider

Knowledge access shall use an abstraction:

```text
QuestionGenerationService
        |
        v
KnowledgeProvider
        |
        +---- pgvector / RAG
        |
        +---- Web Search Fallback
```

## 20.2 Grounding

Where retrieval is used:

- Retrieved sources shall be traceable.
- Retrieved content shall be treated as untrusted input.
- Permission filtering shall be applied.
- Unauthorized knowledge shall not be exposed.
- Source metadata shall be retained where required.

## 20.3 pgvector

PostgreSQL with pgvector shall support embedding-based retrieval.

Knowledge chunks shall be stored with appropriate metadata and source references.

## 20.4 Web Search

Web search may be used as a fallback where permitted.

External search shall have:

- Timeout.
- Error handling.
- Provider abstraction.
- Source tracking.
- Safe content handling.

---

# 21. Credits

## 21.1 Credit Account

Each student shall have a CreditAccount.

Every balance change shall have a CreditTransaction.

Transaction types shall include at least:

- EARN.
- CONSUME.
- ADJUSTMENT.

## 21.2 Credit Rules

- Eligible self-practice interviews consume credits.
- Qualifying performance may earn credits.
- Reward limits are configurable.
- Current business ceiling is 10 unless changed by an authorized administrator.
- Negative balances shall be prevented.
- Credit accounting shall be deterministic and transactional.
- Duplicate requests shall not double-consume or double-award credits.
- Administrative adjustments shall be auditable.

## 21.3 Conducted Interviews

Mentor/placement-conducted interviews shall follow a separate configured attempt policy.

The current requirement is one conducted interview attempt per configured assessment/campaign/event policy. The exact meaning of "once" shall remain configurable until finalized.

## 21.4 Credit Security

Only authorized roles may configure credit rules.

Students can view/use only their own credits.

Trainers and mentors shall not have credit-management access.

---

# 22. Redis and BullMQ

## 22.1 Redis

Redis shall be used for:

- Cache.
- Short-lived state where appropriate.
- Rate limiting.
- BullMQ job state.
- Temporary coordination data where appropriate.

Redis shall not be treated as the authoritative source of business truth.

## 22.2 BullMQ

BullMQ backed by Redis shall be used for appropriate asynchronous workloads, including:

- Analytics aggregation.
- Report enrichment.
- Report generation where not student-blocking.
- Embedding generation.
- Knowledge ingestion.
- Notification delivery.
- Derived statistics.
- Non-critical projections.
- Other long-running background work.

## 22.3 Critical vs Asynchronous Data

Authoritative data required by the next interview step shall be persisted synchronously.

Example:

```text
Evaluation
   -> Score
   -> PostgreSQL transaction
   -> Next Question
```

Non-critical derived work may be asynchronous:

```text
Domain Event
   -> BullMQ
   -> Worker
   -> Derived DB Update
```

## 22.4 Queue Reliability

Each asynchronous job shall define:

- Retry policy.
- Idempotency behavior.
- Failure state.
- Backoff strategy.
- Dead-letter/failed-job handling where applicable.
- Timeout/cancellation behavior.
- Correlation ID.
- Observability.

## 22.5 Outbox Pattern

For important domain events that must reliably be published after a PostgreSQL transaction, the implementation should use a transactional outbox or equivalent reliable event-publication mechanism.

---

# 23. Database Requirements

PostgreSQL shall be the relational system of record.

SQLAlchemy and Alembic shall be used for relational persistence and migrations.

The database shall support:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Indexes.
- Transactions.
- Referential integrity.
- Versioned migrations.
- Concurrency control.
- Query analysis.

## 23.1 Required Logical Data Areas

At minimum:

- Users.
- Roles.
- Permissions.
- Role assignments.
- Access scopes.
- Programs.
- Domains.
- Batches.
- Departments.
- Program subdivisions.
- Students.
- Student-mentor assignments.
- Trainer-domain assignments.
- Resumes.
- Assessments.
- Assessment configurations.
- Assessment components.
- Assessment attempts.
- Interview sessions.
- Listening sessions.
- Questions.
- Question bank items.
- Responses.
- Communication analyses.
- Evaluation results.
- Component scores.
- Assessment reports.
- Performance profiles.
- Performance snapshots.
- Skill performances.
- Learning recommendations.
- Listening stories.
- Listening questions.
- Credit accounts.
- Credit transactions.
- Credit policies.
- Knowledge documents.
- Knowledge chunks.
- Agent definitions.
- Agent runs.
- Agent steps.
- Agent tool calls.
- Audit logs.

---

# 24. Object Storage

MinIO or an S3-compatible object store shall be used for appropriate file objects.

Examples:

- Resume files.
- Knowledge documents.
- Other approved large objects.

Raw interview audio shall remain transient by default unless an explicit retention requirement is approved.

Object access shall be controlled using authorization and short-lived access mechanisms where appropriate.

---

# 25. API Requirements

## 25.1 REST APIs

The platform shall expose documented REST APIs.

APIs shall provide:

- Consistent request/response structures.
- Validation.
- Authentication.
- Server-side authorization.
- Consistent error handling.
- Correlation IDs.
- Idempotency where required.
- OpenAPI documentation for applicable FastAPI endpoints.

## 25.2 API Domains

API domains shall include:

- Authentication.
- Users.
- Profiles.
- Resumes.
- Assessments.
- Interview sessions.
- Listening sessions.
- Responses.
- Reports.
- Performance.
- Credits.
- Programs.
- Domains.
- Batches.
- Mentor assignments.
- Trainer assignments.
- Knowledge.
- Agent execution.
- Agent audit.
- Administrative operations.

---

# 26. Real-Time Requirements

The platform shall support WebSocket or SSE for appropriate real-time status.

Use cases may include:

- Interview processing status.
- Audio/STT processing status.
- Assessment completion status.
- Background report readiness.
- Agent execution status.

Real-time delivery shall not replace authoritative persistence.

---

# 27. External Integration Requirements

External integrations shall use provider abstractions.

Applicable integrations include:

- LLM providers.
- STT providers.
- Search providers.
- Other AI providers.

Integrations shall support where applicable:

- Connection/read timeout.
- Retry policy.
- Circuit breaking where useful.
- Correlation IDs.
- Structured error mapping.
- Fallback behavior.
- Provider/model version tracking.

External provider failure shall not corrupt authoritative assessment or credit state.

---

# 28. AI/ML Quality Requirements

## 28.1 Evaluation Dataset

The project shall maintain a representative evaluation dataset for applicable AI capabilities.

The dataset shall cover:

- Technical response scoring.
- Communication analysis where ground truth is available.
- Question-generation quality.
- Listening evaluation.
- Agent behavior.

## 28.2 Non-AI Baseline

Applicable AI capabilities shall have a non-AI or deterministic baseline where meaningful.

The project shall compare AI behavior against the baseline.

## 28.3 Metrics

Metrics shall include appropriate measures such as:

- Agreement with reference/human evaluation.
- Structured-output validity rate.
- Question relevance.
- Error/hallucination rate where measurable.
- Latency.
- Failure rate.
- Resource usage.
- Agent tool-use correctness.

## 28.4 Error Analysis

The project shall maintain qualitative error analysis documenting:

- Common failures.
- Model limitations.
- Incorrect evaluations.
- Retrieval failures.
- Communication-analysis limitations.
- Agent failures.

## 28.5 Model/Data Card

Each production AI capability shall document:

- Model/provider.
- Version.
- Intended use.
- Input/output format.
- Reference/evaluation data.
- Metrics.
- Latency/resource observations.
- Known limitations.
- Safety/guardrail considerations.
- Licence where applicable.

---

# 29. Security Requirements

## 29.1 Authentication Security

The system shall provide:

- Secure password handling where passwords are used.
- Secure token/session handling.
- Secret management.
- Protection against common authentication attacks.

## 29.2 Authorization Security

The system shall prevent:

- Horizontal privilege escalation.
- Vertical privilege escalation.
- Cross-mentor data access.
- Cross-program data access.
- Unauthorized placement-data access.
- Unauthorized credit access.
- Agent privilege escalation.

## 29.3 AI Security

The system shall defend against:

- Prompt injection.
- Malicious retrieved content.
- Tool parameter manipulation.
- Unauthorized tool invocation.
- Excessive tool loops.
- Malformed model outputs.
- Sensitive-data exfiltration through prompts/responses.

Retrieved content shall be treated as untrusted.

## 29.4 Data Protection

Sensitive data shall be:

- Protected in transit.
- Protected at rest where appropriate.
- Access-controlled by least privilege.
- Logged without unnecessary raw sensitive content.

---

# 30. Privacy and Retention

The platform may process:

- Student profile data.
- Resumes.
- Voice/audio.
- Transcripts.
- Assessment responses.
- Performance records.
- AI evaluation data.
- Agent execution metadata.

The system shall:

- Collect only required information.
- Restrict access by role and scope.
- Protect audio and transcripts.
- Restrict placement information.
- Define retention periods before production.
- Provide applicable privacy notices and consent mechanisms.

Raw audio shall be transient by default.

---

# 31. Error Handling and Resilience

The system shall handle:

- Invalid input.
- Invalid audio.
- Empty response.
- STT failure.
- LLM timeout.
- LLM malformed output.
- Audio-analysis failure.
- Database failure.
- Redis failure.
- BullMQ job failure.
- Unauthorized access.
- Expired session.
- Insufficient credits.
- Duplicate submission.
- Concurrent requests.
- External provider failure.
- Agent tool failure.
- Agent cancellation.

User-facing errors shall be understandable and shall not expose internal implementation details.

AI failure shall not corrupt credit accounting or authoritative assessment state.

---

# 32. Idempotency and Consistency

The following operations shall be idempotent where applicable:

- Response submission.
- Credit consumption.
- Credit rewards.
- Background job execution.
- Event processing.
- Report generation requests.
- Notification delivery.

The system shall prevent:

- Double credit consumption.
- Double credit rewards.
- Duplicate response records caused by retries.
- Conflicting assessment state caused by concurrent requests.

PostgreSQL remains the source of truth.

Redis and BullMQ shall not replace authoritative transactional persistence.

---

# 33. Performance Requirements

The system shall:

- Keep normal application operations responsive.
- Avoid unnecessary blocking of unrelated requests.
- Keep student-facing interview progression synchronous.
- Execute independent AI workloads concurrently where beneficial.
- Offload non-critical long-running workloads to BullMQ.
- Support horizontal scaling of Node.js and FastAPI workloads.
- Use appropriate PostgreSQL connection management.
- Use indexes based on observed query patterns.
- Monitor AI latency and resource usage.

The system shall measure AI latency, including p50/p95 where appropriate.

---

# 34. Scalability Requirements

The architecture shall allow independent scaling of:

- Frontend.
- Node.js application.
- FastAPI AI services.
- AI workers.
- BullMQ workers.
- PostgreSQL resources.
- Redis resources.

The architecture shall support concurrent interview sessions.

AI processing shall not require scaling the entire application layer.

---

# 35. Dashboards

## 35.1 Student Dashboard

Shall show:

- Available assessments.
- Credit balance.
- Recent assessments.
- Scores.
- Performance trends.
- Recommendations.
- Skill gaps.

## 35.2 Trainer Dashboard

Shall show authorized:

- Student summaries.
- Communication performance.
- Relevant assessment results.
- Trends.
- Students requiring attention.

Placement reports shall not be exposed unless explicitly authorized.

## 35.3 Mentor Dashboard

Shall show assigned students:

- Student summary.
- Assessment activity.
- Performance.
- Trends.
- Progress.
- Attention areas.

## 35.4 Program Administrator Dashboard

Shall show authorized program/domain:

- Student count.
- Performance overview.
- Batch performance.
- Top performers.
- Trends.
- Student drill-down.

## 35.5 Placement Coordinator Dashboard

Shall show authorized:

- Institution-level performance.
- Batch-wise performance.
- Top performers.
- Placement readiness.
- Performance distributions.
- Student drill-down.
- Program/domain views where permitted.

Dashboards shall avoid excessive content density and support drill-down.

---

# 36. Observability

The platform shall provide:

- Structured logs.
- Correlation IDs.
- Request metrics.
- AI processing metrics.
- Queue/job metrics.
- Database performance metrics.
- Error tracking.
- Distributed tracing.
- Health checks.
- Readiness checks.

The intended observability stack includes:

```text
OpenTelemetry
     |
     +--> Prometheus --> Grafana
     |
     +--> Loki
     |
     +--> Distributed Traces
```

Sensitive raw audio and unnecessary sensitive prompt content shall not be logged.

---

# 37. Health and Operational Requirements

The system shall expose health/readiness information for deployed services.

Health checks shall distinguish:

- Process health.
- Dependency readiness.
- Database connectivity.
- Redis connectivity.
- Queue/worker readiness.
- AI provider availability where appropriate.

The platform shall document:

- Startup.
- Shutdown.
- Deployment.
- Rollback.
- Recovery.
- Backup.
- Restore.
- Incident response.

---

# 38. Deployment and Infrastructure

The platform shall support:

- Docker.
- Docker Compose for local/development orchestration.
- Kubernetes manifests.
- Terraform foundation.
- GitHub Actions CI/CD.

The deployment shall support independent scaling of appropriate components.

Core product reproduction shall not require a paid external service where prohibited by the client.

---

# 39. CI/CD and Security Scanning

CI/CD shall include appropriate automated checks.

Expected tools include:

- Pytest.
- Vitest/Jest.
- Playwright.
- Postman/Newman.
- k6.
- Semgrep.
- Trivy.
- Secret scanning.
- Dependency scanning.
- OWASP ZAP.

Blocking CI checks shall prevent deployment when configured critical checks fail.

---

# 40. Testing Requirements

## 40.1 Unit Testing

Core business logic shall have unit tests.

Required areas include:

- Authorization.
- Credit calculation.
- Score calculation.
- Difficulty transitions.
- Agent tools.
- Validation.
- Queue/job handlers.

## 40.2 Integration/API Testing

Integration tests shall cover:

- Authentication.
- RBAC.
- Scope isolation.
- Assessment lifecycle.
- Credit transactions.
- PostgreSQL persistence.
- Redis interactions.
- BullMQ jobs.
- AI-provider adapters.

## 40.3 End-to-End Testing

At least three critical E2E journeys shall be automated.

Recommended journeys:

1. Student completes AI interview.
2. Student completes listening assessment and views report.
3. Authorized administrator/mentor/trainer views scoped student performance.

## 40.4 Security-Negative Tests

Tests shall verify rejection of:

- Cross-mentor access.
- Cross-program access.
- Unauthorized credit access.
- Unauthorized placement-report access.
- Privilege escalation.
- Agent unauthorized tool calls.

## 40.5 AI/Agent Failure Tests

The system shall test:

- Prompt injection.
- Malformed AI output.
- Model timeout.
- Model failure.
- Tool timeout.
- Tool failure.
- Invalid tool arguments.
- Excessive tool loops.
- Agent cancellation.
- Partial tool failure.

## 40.6 Performance Testing

k6 or equivalent shall measure:

- API latency.
- Concurrent users.
- Interview-session concurrency.
- Queue throughput.
- Database performance.
- AI latency.
- p50/p95 response times.

---

# 41. Accessibility and UX

The UI shall:

- Provide clear assessment state.
- Clearly show when audio is being captured.
- Provide usable keyboard navigation where applicable.
- Provide understandable errors.
- Avoid excessive dashboard density.
- Provide accessible labels and controls.
- Provide clear progress indicators.

The student shall clearly understand:

- Assessment type.
- Current question.
- Submission state.
- Processing state.
- Completion state.
- Report availability.
- Recommended next actions.

---

# 42. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Students are the primary users of self-practice interviews. |
| BR-02 | Eligible self-practice interviews consume student credits. |
| BR-03 | Credit policies are configurable by authorized administrators. |
| BR-04 | Performance may generate additional credits. |
| BR-05 | Performance-based credit rewards are capped by configured policy; current ceiling is 10. |
| BR-06 | Conducted interviews follow a separate configured attempt policy. |
| BR-07 | Trainers do not manage credits. |
| BR-08 | Mentors do not manage credits. |
| BR-09 | Mentors access only explicitly assigned students unless extra authorization exists. |
| BR-10 | Students and mentors do not need to share a department. |
| BR-11 | Trainers may belong to multiple domains. |
| BR-12 | Multiple trainers may belong to one domain. |
| BR-13 | Program administrators access only authorized program/domain scopes. |
| BR-14 | Placement coordinators have broader placement/readiness visibility according to permission. |
| BR-15 | The LLM does not own authorization, credit accounting, or authoritative business rules. |
| BR-16 | Technical evaluation uses a single comprehensive evaluation call per response by default. |
| BR-17 | Interview evaluation remains on the synchronous critical path. |
| BR-18 | BullMQ backed by Redis is used for appropriate non-critical asynchronous work. |
| BR-19 | Required authoritative database updates remain synchronous. |
| BR-20 | Redis is not the authoritative source of business truth. |
| BR-21 | Retrieval must respect permission boundaries and source traceability. |
| BR-22 | The bounded agent cannot change roles, permissions, credits, or authoritative scores. |
| BR-23 | Agent actions remain bounded by typed tools and explicit permissions. |
| BR-24 | Raw audio is transient by default. |
| BR-25 | Camera/video is not part of the current implementation. |
| BR-26 | Group Discussion remains outside the current confirmed scope. |
| BR-27 | Historical assessment results are immutable snapshots. |
| BR-28 | Credit operations are transactional and idempotent. |
| BR-29 | Queue jobs must be retry-safe and idempotent where applicable. |
| BR-30 | Critical interview state shall not depend on eventual consistency. |

---

# 43. Out of Scope / Deferred

## 43.1 Camera and Video

Camera access, facial analysis, visual behavior analysis, and video storage are future extensions.

## 43.2 Group Discussion

Group Discussion is not part of the current confirmed scope.

Future implementation may include:

- Multiple participants.
- Real-time discussion.
- Turn-taking analysis.
- Participant communication analysis.
- Group evaluation.

## 43.3 Additional Roles

The RBAC model shall allow future roles.

---

# 44. Extensibility Requirements

The system shall support future addition of:

- Assessment types.
- Group Discussion.
- Camera/video analysis.
- Communication metrics.
- Technical scoring models.
- AI models/providers.
- Programs.
- Domains.
- Program subdivisions.
- Batches.
- Roles.
- Permissions.
- Knowledge sources.
- Agent tools.
- Bounded agents.
- External integrations.

Future extensions shall not break historical assessment records or existing authorization semantics.

---

# 45. Production Quality and Engineering Requirements

The implementation shall demonstrate:

- Modular separation of concerns.
- Clear dependency direction.
- REST API contracts.
- Database migrations.
- Transaction design.
- Indexing.
- Query analysis.
- Cache invalidation/consistency reasoning.
- Background job retry/idempotency.
- External integration timeout/fallback/circuit behavior.
- AI evaluation evidence.
- Retrieval grounding.
- Permission-aware retrieval.
- Bounded agent behavior.
- Security-negative testing.
- Automated testing.
- Accessibility testing.
- Load testing.
- Backup/restore testing.
- Rollback testing.
- Containerization.
- CI/CD.
- Health/readiness.
- Logs.
- Metrics.
- Traces.
- Alerts.
- Kubernetes deployment.
- Terraform foundation.
- Production runbook.

---

# 46. Core CS-to-Project Traceability

| Core Area | Project Evidence |
|---|---|
| Data Structures & Algorithms | Search, ranking, scheduling, matching, retrieval, complexity justification |
| DBMS | Normalization, constraints, indexes, transactions, concurrency, query plans |
| Operating Systems | Processes, threads/async execution, workers, memory, containers |
| Computer Networks | HTTP/TLS, WebSockets/SSE, latency, timeout, retry, connections |
| OOP & Design | Interfaces, abstractions, dependency direction, testability |
| Distributed Systems | BullMQ, delivery semantics, idempotency, cache consistency, graceful degradation |
| Security | Authentication, authorization, scope isolation, threat model, auditability |
| Software Engineering | Git, reviews, CI/CD, tests, ADRs, releases, runbooks |

---

# 47. Acceptance Criteria

The baseline shall be considered acceptable when:

1. Users can authenticate securely.
2. RBAC and scope-based authorization are enforced server-side.
3. Students can manage profiles and resumes.
4. Students can start eligible AI interviews.
5. Voice responses can be captured and processed.
6. STT produces transcripts.
7. Communication metrics can be generated.
8. Technical answers receive structured AI evaluation.
9. Adaptive difficulty works according to configured rules.
10. Independent listening assessments can be completed and scored.
11. Component and overall scores are calculated deterministically.
12. Assessment reports are generated and historically preserved.
13. Performance profiles and historical snapshots are available.
14. Learning recommendations and skill gaps are available.
15. Credit consumption and earning are transactional and idempotent.
16. Mentor isolation is enforced.
17. Trainer credit and placement restrictions are enforced.
18. Program administrators are restricted to authorized program/domain scope.
19. Placement coordinators can access authorized readiness information.
20. Retrieval is permission-aware and source-traceable.
21. The bounded agent has at least three meaningful tools.
22. Agent tool inputs and outputs are typed and validated.
23. Agent boundaries and failure handling are tested.
24. BullMQ handles configured asynchronous workloads.
25. The interview critical path is not unnecessarily queued.
26. Redis supports cache/short-lived state and BullMQ without becoming business source of truth.
27. Real-time status is delivered through WebSocket or SSE where required.
28. External integrations have timeout/retry/fallback behavior as applicable.
29. AI evaluation has dataset, baseline, metrics, latency/resource measurements, and error analysis.
30. Security scans and automated tests run in CI/CD.
31. Docker, Kubernetes, and Terraform foundations are present.
32. Health/readiness checks are deployed.
33. Logs, metrics, and traces are available.
34. Backup, recovery, and rollback procedures are documented and tested.
35. Critical database operations remain consistent under retries and concurrent requests.

---

# 48. Required Design and Evidence Artifacts

The project shall produce:

1. System architecture diagram.
2. Deployment architecture diagram.
3. Data-flow diagrams.
4. Interview sequence diagram.
5. Agent workflow diagram.
6. Use-case diagram.
7. RBAC/permission matrix.
8. Database ER/schema diagram.
9. Database migrations.
10. API/OpenAPI documentation.
11. AI model/data card.
12. AI evaluation dataset.
13. AI metrics and error analysis.
14. Threat model.
15. Authorization-negative test evidence.
16. Unit-test results.
17. Integration/API test results.
18. E2E test results.
19. Performance/load-test results.
20. Accessibility evidence.
21. Security-scan results.
22. Container build evidence.
23. CI/CD pipeline evidence.
24. Health/readiness evidence.
25. Observability dashboards.
26. Backup/recovery evidence.
27. Rollback evidence.
28. Production runbook.
29. Architecture decision records for major technology/trade-off decisions.

---

# 49. Open Items Requiring Confirmation

The following remain configurable or require final client confirmation:

1. Exact Program Administrator versus Placement Coordinator permissions.
2. Exact credit-reward formula.
3. Exact scope of the one conducted-interview rule.
4. Institution-wide credit-policy authority.
5. Exact trainer-visible fields.
6. Mentor reassignment workflow.
7. Exact program hierarchy and subdivisions.
8. Whether a student may belong to multiple programs/groups.
9. Retention period for resumes, transcripts, reports, sessions, and agent records.
10. Raw-audio retention period.
11. Exact overall-score formula and production weights.
12. Production LLM/provider.
13. Listening-story generation strategy.
14. Exact placement-readiness formula.
15. Group Discussion requirements.
16. Final approved backend technology substitution if the client’s mandatory API stack requires FastAPI as the external REST API.

---

# 50. Architecture Summary

The intended logical architecture is:

```text
                         ┌──────────────────┐
                         │ Next.js / React  │
                         └────────┬─────────┘
                                  │
                           REST + WS/SSE
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │       Node.js           │
                    │ Core Business Layer     │
                    │                         │
                    │ Auth / RBAC             │
                    │ Authorization            │
                    │ Assessment              │
                    │ Interview               │
                    │ Credits                 │
                    │ Scoring                 │
                    │ Reports                 │
                    │ Program Management      │
                    └──────┬──────────┬───────┘
                           │          │
                  SYNC AI  │          │ ASYNC
                           │          │
                           ▼          ▼
                 ┌──────────────┐  ┌──────────────┐
                 │   FastAPI    │  │    Redis     │
                 │   / Python   │  │ Cache/State  │
                 │              │  └──────┬───────┘
                 │ STT          │         │
                 │ Audio        │         ▼
                 │ LLM / AI     │  ┌──────────────┐
                 │ Agent        │  │   BullMQ     │
                 └──────┬───────┘  └──────┬───────┘
                        │                  │
                        ▼                  ▼
                  AI Providers        Background Workers
                                      Analytics
                                      Reports
                                      Embeddings
                                      Notifications
                        │
                        ▼
              ┌────────────────────┐
              │ Knowledge Provider │
              │                    │
              │ pgvector / RAG     │
              │ Web Search         │
              └─────────┬──────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ PostgreSQL   │
                 │ Source of    │
                 │ Truth        │
                 └──────────────┘

       MinIO/S3-compatible storage for approved file objects

       OpenTelemetry
          ├── Prometheus / Grafana
          ├── Loki
          └── Distributed Tracing
```

---

# 51. Final Requirement Principles

The platform shall follow these principles:

1. Authorization is enforced server-side.
2. Business rules are deterministic and application-owned.
3. AI output is validated before entering critical workflows.
4. PostgreSQL is the authoritative source of business truth.
5. Redis is for cache/short-lived state and BullMQ infrastructure.
6. BullMQ is for asynchronous, non-critical, retryable workloads.
7. The interview's student-facing progression remains synchronous.
8. Independent AI operations may execute concurrently.
9. Critical state changes are committed before dependent workflow progression.
10. Historical assessment results are preserved.
11. Retrieval is permission-aware and traceable.
12. The agent is bounded, typed, permission-aware, and auditable.
13. Security, reliability, observability, and testing are first-class requirements.
14. Future assessment types, roles, programs, domains, and AI capabilities can be added without redesigning the complete system.
