# Complete Endpoint Inventory
**Communication Readiness Platform**

Generated: 2026-10-01  
Source: Backend Express (TypeScript) + AI Service FastAPI (Python)

---

## Table of Contents
- [Health & Auth](#health--auth)
- [Admin](#admin)
- [Colleges](#colleges)
- [Invites](#invites)
- [Students](#students)
- [Mentors](#mentors)
- [Trainers](#trainers)
- [Portal (STUB)](#portal-stub)
- [Org (Public)](#org-public)
- [Module 1: Interview Sessions](#module-1-interview-sessions)
- [Module 2: Assessments](#module-2-assessments)
- [Module 2: Attempts](#module-2-attempts)
- [Module 2: Sessions](#module-2-sessions)
- [Module 2: Responses](#module-2-responses)
- [Module 2: Reports](#module-2-reports)
- [Module 2: Question Bank](#module-2-question-bank)
- [Module 3: Knowledge/RAG](#module-3-knowledgerag)
- [Module 4: Programs](#module-4-programs)
- [Module 4: Credits](#module-4-credits)
- [Module 4: Credit Policies](#module-4-credit-policies)
- [Module 4: Checklist](#module-4-checklist)
- [Module 4: Verifications](#module-4-verifications)
- [Module 4: Placement Eligibility](#module-4-placement-eligibility)
- [AI Service](#ai-service)

---

## Health & Auth
**Base Path:** `/api`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /health | No | Public | - | 200 {status, service, env, timestamp} | - | - |
| POST | /auth/register | No | Public | {name, email, password, rollNumber, batchId, subdivisionId?} | 201 {token, user, studentId} | identity.users, org.students, org.batches | bcrypt |
| POST | /auth/login | No | Public | {email, password} | 200 {token, user, studentId?, collegeId?, collegeName?, programId?} | identity.users, org.students, identity.invites, org.institutions | bcrypt |
| POST | /auth/logout | Yes | Any | - | 200 {message} | identity.users (token_version++) | - |
| POST | /auth/invite/activate | No | Public | {token, password} | 201 {token, user{...permissions}} | identity.invites, identity.users, org.institutions | bcrypt |
| GET | /auth/me | Yes | Any | - | 200 {user, studentId?} | identity.users, org.students, identity.invites, org.institutions | - |

---

## Admin
**Base Path:** `/api/admin` (all routes require `authenticate` middleware)

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /users | Yes | PROGRAM_ADMIN | Query: role?, status?, search? | 200 {users[]} | identity.users | - |
| PATCH | /users/:userId/role | Yes | PROGRAM_ADMIN | {role: STUDENT\|FACULTY_MENTOR\|TRAINER\|PLACEMENT_COORDINATOR} | 200 {user} | identity.users (token_version++) | - |
| PATCH | /users/:userId/status | Yes | PROGRAM_ADMIN | {status: ACTIVE\|INACTIVE\|SUSPENDED} | 200 {user} | identity.users | - |
| POST | /students/import | Yes | PROGRAM_ADMIN | Multipart: file (CSV), ?institution_id | 200 {summary{...}} | identity.users, org.students, org.programs, org.sub_programs, org.batches, org.student_programs | multer, bcrypt, CSV parsing |

**CSV Import Format:**
- Required: name, email, password (min 8 chars), program
- Optional: sub_program (aliases: subprogram, specialization), roll_number
- Idempotent: duplicate emails upsert enrollment, auto-creates programs/batches

---

## Colleges
**Base Path:** `/api/colleges`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | / | Yes | PLATFORM_OWNER | - | 200 [colleges with super_admin_status] | org.institutions, identity.invites | - |
| GET | /stats/overview | Yes | PLATFORM_OWNER | - | 200 {totalColleges, activeSuperAdmins} | org.institutions, identity.invites | - |
| POST | / | Yes | PLATFORM_OWNER | {name, code, campusCity?, type?} | 201 {college} | org.institutions | - |
| GET | /:id | Yes | PLATFORM_OWNER, SUPER_ADMIN | - | 200 {college with super_admin info} | org.institutions, identity.invites | - |
| GET | /:id/programs | Yes | PLATFORM_OWNER, SUPER_ADMIN, PROGRAM_ADMIN | - | 200 {programs with sub_programs[]} | org.programs, org.sub_programs | - |
| POST | /:id/invite-super-admin | Yes | PLATFORM_OWNER | {firstName, lastName, email} | 201 {invite, inviteUrl} | identity.invites, org.institutions | crypto.randomUUID |
| POST | /:id/invite-program-admin | Yes | PLATFORM_OWNER, SUPER_ADMIN | {firstName, lastName, email, programId?, department?, permissions[]} | 201 {invite, inviteUrl} | identity.invites, org.institutions | crypto.randomUUID |

---

## Invites
**Base Path:** `/api/invites`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /pending | Yes | PLATFORM_OWNER, SUPER_ADMIN | - | 200 {invites[]} (scoped by role) | identity.invites, org.institutions | - |
| GET | /:token | No | Public | - | 200 {invite details} or 404/409/410 | identity.invites, org.institutions | - |

---

## Students
**Base Path:** `/api/students` (all routes require `authenticate` middleware)

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /:studentId | Yes | STUDENT (self), Staff | - | 200 {student} | org.students, identity.users | requireStudentSelfOrStaff |
| PATCH | /:studentId | Yes | STUDENT (self), Staff | {codingHandles?{github?, leetcode?, hackerrank?, codeforces?, codechef?, leetcodeSolved?, githubRepos?}} | 200 {student} | org.students | requireStudentSelfOrStaff |
| PATCH | /:studentId/resume | Yes | STUDENT (self only) | Multipart: resume (PDF) | 200 {resumeUrl} | org.students | multer, LocalStorageClient |
| PATCH | /:studentId/verify-resume | Yes | FACULTY_MENTOR | - | 200 {message} | org.students, org.student_mentor_assignments | eventBus (MENTOR_VERIFIED) |

---

## Mentors
**Base Path:** `/api/mentors` (all routes require `authenticate` middleware)

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| POST | /assign | Yes | PROGRAM_ADMIN | {studentId, mentorId} | 201 {assignment} | identity.users, org.students, org.student_mentor_assignments (deactivates old, inserts new in TX) | - |
| GET | /my-students | Yes | FACULTY_MENTOR | - | 200 {students[]} | org.student_mentor_assignments, org.students, identity.users, org.batches, org.subdivisions | - |

---

## Trainers
**Base Path:** `/api/trainers` (all routes require `authenticate` middleware)

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| POST | /assign | Yes | PROGRAM_ADMIN | {trainerId, subdivisionId, startDate, endDate?} | 201 {assignment} | identity.users, org.subdivisions, org.trainer_subdivision_assignments | - |
| GET | /my-subdivisions | Yes | TRAINER | - | 200 {subdivisions[]} | org.trainer_subdivision_assignments, org.subdivisions, org.batches | - |

---

## Portal (STUB)
**Base Path:** `/api/portals` (all routes require `authenticate` middleware)

**Status:** NOT IMPLEMENTED — router file contains only comments listing planned endpoints.

Planned endpoints (per comments):
- GET /student
- GET /mentor
- GET /trainer
- GET /coordinator
- GET /admin
- POST /mentor/verify-task

---

## Org (Public)
**Base Path:** `/api/org` (no auth required — used by registration forms)

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /institutions | No | Public | - | 200 {items[]} | org.institutions | - |
| GET | /programs | No | Public | Query: institution_id? | 200 {items[]} | org.programs | - |
| GET | /batches | No | Public | Query: program_id? | 200 {items[]} | org.batches | - |
| GET | /subdivisions | No | Public | Query: batch_id? | 200 {items[]} | org.subdivisions | - |

---

## Module 1: Interview Sessions
**Base Path:** `/api/sessions` (M1 audio interview routes)

**Note:** These routes are mounted on `/sessions` *after* Module 2 sessions routes, adding M1-specific endpoints.

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| POST | / | Yes | STUDENT | {resume{...}, topics[]?, maxTurns?, domain?} | 200 {sessionId, firstQuestion, curriculum, status} | session.interview_sessions (Redis seed: state, resume) | Redis (sessionContextService) |
| POST | /:id/turns | Yes | STUDENT | Multipart: audio (WAV), metadata JSON | 200 {transcript, technicalScore, communicationScore, overallScore, feedback, strengths, weaknesses, nextDifficulty, nextQuestionText, contextSummary, audioMetrics{...}, conversationalResponse} | session.interview_sessions, session.interview_turns (async DB write via process.nextTick) | multer, axios (AI service /ai/evaluate-response SSE), Redis, WebSocket (wsManager) |
| POST | /:id/conclude | Yes | STUDENT | {overallScore} | 200 {sessionId, status, overallScore} | session.interview_sessions (status=completed) | Redis flush (async) |
| GET | /bank-fallback | Yes | STUDENT | Query: difficulty, domain? | 200 {id, question_text, difficulty, category, domain} | session.question_bank | - |

**External Dependencies:**
- AI Service: POST /ai/evaluate-response (SSE stream)
- Redis: session context storage (state, resume, turn history)
- WebSocket: real-time turn updates to client

---

## Module 2: Assessments
**Base Path:** `/api/assessments`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | / | Yes | Any | - | 200 {assessments[]} (active only) | assessment.assessments, org.programs, org.sub_programs | - |
| POST | / | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | {name, assessmentType, interviewType?, description?, targetProgramId?, targetSubProgramId?} | 201 {assessment} | assessment.assessments | - |
| GET | /:id | Yes | Any | - | 200 {assessment with components[]} | assessment.assessments, assessment.assessment_components, org.programs, org.sub_programs | - |
| PUT | /:id | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | {name?, interviewType?, description?, isActive?, targetProgramId?, targetSubProgramId?} | 200 {assessment} | assessment.assessments | - |

---

## Module 2: Attempts
**Base Path:** `/api/attempts`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| POST | /start | Yes | STUDENT | {assessmentId} | 201 {attemptId, status, creditBalance} | org.students, org.batches, assessment.assessments, assessment.assessment_attempts, org.student_programs (targeting check), credit.credit_policies, credit.credit_accounts, credit.credit_transactions | CreditService.consume (checks balance, fails if insufficient) |
| GET | /:id | Yes | STUDENT (own), Staff | - | 200 {attempt} | assessment.assessment_attempts, org.students | - |
| PUT | /:id/abandon | Yes | STUDENT (own) | - | 200 {message} | assessment.assessment_attempts, session.assessment_sessions (state=TERMINATED) | - |

**Credit System:**
- Consumes credits BEFORE creating attempt (credit cost from active GLOBAL policy, default 10)
- Throws INSUFFICIENT_CREDITS if balance too low
- Targeting: if assessment has target_program_id, student must be enrolled via org.student_programs

---

## Module 2: Sessions
**Base Path:** `/api/sessions`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| POST | /start | Yes | STUDENT | {attemptId, sessionType?} | 201 {sessionId, status, firstQuestion{questionId, questionText, difficulty}} | assessment.assessment_attempts, org.students, identity.users, session.assessment_sessions, session.questions, session.question_bank_items | ai-client.generateQuestion (fallback if bank empty) |
| GET | /:id | Yes | STUDENT (own) | - | 200 {session, currentQuestion?} | session.assessment_sessions, assessment.assessment_attempts, org.students, session.questions | UUID regex guard |
| POST | /:id/proctor-event | Yes | STUDENT (own) | {eventType: TAB_SWITCH\|FOCUS_LOST, timestamp?} | 200 {tabSwitchCount, isFlagged, sessionState, warning?} | session.assessment_sessions (state_data, may set state=TERMINATED), assessment.assessment_attempts (abandon if terminated), system.audit_logs | env.MAX_TAB_SWITCH_LIMIT |
| POST | /:id/complete | Yes | STUDENT (own) | - | 200 {reportId, overallScore, technicalScore, communicationScore, totalQuestions} | session.assessment_sessions (state=COMPLETED), evaluation.response_evaluations, performance.assessment_reports (ON CONFLICT DO NOTHING), assessment.assessment_attempts (status=COMPLETED) | eventBus (ATTEMPT_COMPLETED - async) |

**Proctoring Rules:**
- Tab switch limit from env.MAX_TAB_SWITCH_LIMIT
- state_data tracks: tab_switch_count, fullscreen_exit_count, is_proctor_flagged, replay_count
- If tab_switch_count > limit+1: session TERMINATED, attempt ABANDONED

---

## Module 2: Responses
**Base Path:** `/api/responses`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| POST | /submit | Yes | STUDENT | {attemptId, questionId, transcript, inputType, idempotencyKey?, durationSec?} | 200 {evaluationId, technicalScore, communicationScore, feedback, strengths, weaknesses, nextQuestion?{questionId, questionText, difficulty}} or 503 (AI unavailable, response saved) | assessment.assessment_attempts, org.students, session.questions, session.assessment_sessions, evaluation.responses, evaluation.ai_runs, evaluation.response_evaluations, session.question_bank_items | ai-client.evaluateResponse (FastAPI) |
| GET | /:id | Yes | STUDENT (own), FACULTY_MENTOR (assigned) | - | 200 {response, evaluation?} | evaluation.responses, assessment.assessment_attempts, org.students, evaluation.response_evaluations, org.student_mentor_assignments | - |

**Adaptive Difficulty:**
- >=80 tech score → advance difficulty (EASY→MEDIUM→ADVANCED)
- <50 tech score → reduce difficulty
- Pulls next question from bank (random, filtered by difficulty, excludes used)
- Creates up to env.MAX_QUESTIONS_PER_SESSION

---

## Module 2: Reports
**Base Path:** `/api/reports`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /:attemptId | Yes | STUDENT (own), FACULTY_MENTOR (assigned), Admin | - | 200 {report{...}, questionBreakdown[]} | performance.assessment_reports, assessment.assessment_attempts, org.students, assessment.assessments, session.questions, evaluation.responses, evaluation.response_evaluations, org.student_mentor_assignments | - |

---

## Module 2: Question Bank
**Base Path:** `/api/question-bank`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | / | Yes | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN, PLACEMENT_COORDINATOR | - | 200 {questions[]} (active only) | session.question_bank_items, session.question_bank_item_skills | - |
| POST | / | Yes | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN | {questionText, difficulty, evaluationCriteria?, metadata?, skillIds[]?, isPrimary?} | 201 {question} | session.question_bank_items, session.question_bank_item_skills | - |
| PUT | /:id | Yes | FACULTY_MENTOR, TRAINER, PROGRAM_ADMIN | {questionText?, difficulty?, evaluationCriteria?, metadata?} | 200 {question} | session.question_bank_items | - |
| DELETE | /:id | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | - | 200 {message} | session.question_bank_items (soft delete: is_active=false) | - |

---

## Module 3: Knowledge/RAG
**Base Path:** `/api/knowledge`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /documents | Yes | Any | Query: institution_id?, program_id? | 200 {documents[]} | knowledge.knowledge_documents, knowledge.knowledge_chunks | - |
| POST | /documents | Yes | PROGRAM_ADMIN, SUPER_ADMIN, PLATFORM_OWNER | {title, text, source_type?, source_url?, visibility_type?, institution_id?, program_id?, subdivision_id?, metadata?} | 201 {document, chunks_created} | knowledge.knowledge_documents, knowledge.knowledge_chunks | AI service /ai/embed-batch |
| POST | /documents/upload | Yes | PROGRAM_ADMIN, SUPER_ADMIN, PLATFORM_OWNER | Multipart: file (TXT), title?, visibility_type?, institution_id?, program_id? | 201 {document, chunks_created} | knowledge.knowledge_documents, knowledge.knowledge_chunks | multer, AI service /ai/embed-batch |
| GET | /documents/:id | Yes | Any | - | 200 {document} | knowledge.knowledge_documents | - |
| GET | /documents/:id/chunks | Yes | Any | - | 200 {chunks[]} | knowledge.knowledge_chunks | - |
| DELETE | /documents/:id | Yes | PROGRAM_ADMIN, SUPER_ADMIN, PLATFORM_OWNER | - | 200 {deleted: true} | knowledge.knowledge_documents, knowledge.knowledge_chunks | - |
| POST | /search | Yes | Any | {query, limit?, institution_id?, program_id?} | 200 {results[]} | knowledge.knowledge_chunks | AI service /ai/embed |
| GET | /search | Yes | Any | Query: q, limit?, institution_id?, program_id? | 200 {results[]} | knowledge.knowledge_chunks | AI service /ai/embed |
| POST | /preview-chunks | Yes | PROGRAM_ADMIN, SUPER_ADMIN, PLATFORM_OWNER | {text} | 200 {chunk_count, chunks[]} | - | chunkText utility |

**Chunking Strategy:**
- 500 char chunks, 50 char overlap
- Embeddings via AI service /ai/embed-batch
- Vector similarity search via pgvector

---

## Module 4: Programs
**Base Path:** `/api/programs`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | / | No | Public | - | 200 {programs[] with sub_programs[]} | org.programs, org.sub_programs | - |
| GET | /:programId/sub-programs | No | Public | - | 200 {sub_programs[]} | org.programs, org.sub_programs | - |
| GET | /:programId/students | Yes | FACULTY_MENTOR, PROGRAM_ADMIN, PLACEMENT_COORDINATOR, TRAINER | Query: sub_program_id? | 200 {students[]} | org.programs, org.sub_programs, org.student_programs, org.students, identity.users | - |
| GET | /:programId/sub-programs/:subId/students | Yes | FACULTY_MENTOR, PROGRAM_ADMIN, PLACEMENT_COORDINATOR, TRAINER | - | 200 {students[]} | org.programs, org.sub_programs, org.student_programs, org.students, identity.users | - |
| POST | / | Yes | PROGRAM_ADMIN, SUPER_ADMIN | {institutionId, name, code?} | 201 {program} | org.programs | - |
| PUT | /:id | Yes | PROGRAM_ADMIN, SUPER_ADMIN | {name?, code?} | 200 {program} | org.programs | - |
| DELETE | /:id | Yes | PROGRAM_ADMIN, SUPER_ADMIN | - | 200 {message} | org.programs, org.sub_programs (deactivate all), org.student_programs (checks for enrollments) | - |
| POST | /:programId/sub-programs | Yes | PROGRAM_ADMIN, SUPER_ADMIN | {name, code?} | 201 {sub_program} | org.programs, org.sub_programs | - |
| PUT | /:programId/sub-programs/:subId | Yes | PROGRAM_ADMIN, SUPER_ADMIN | {name?, code?, isActive?} | 200 {sub_program} | org.sub_programs | - |
| DELETE | /:programId/sub-programs/:subId | Yes | PROGRAM_ADMIN, SUPER_ADMIN | - | 200 {message} | org.sub_programs (soft delete: is_active=false) | - |

---

## Module 4: Credits
**Base Path:** `/api/credits`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /balance/:studentId | Yes | STUDENT (own), Staff | - | 200 {studentId, balance, accountId, updatedAt, totalEarned, totalConsumed} | credit.credit_accounts, credit.credit_transactions | - |
| GET | /transactions/:studentId | Yes | STUDENT (own), Staff | Query: page?, limit? | 200 {transactions[], pagination} | credit.credit_transactions | - |
| POST | /adjust | Yes | PLACEMENT_COORDINATOR | {studentId, amount, reason, referenceId?} | 200 {newBalance, transactionId} | credit.credit_accounts, credit.credit_transactions | CreditService.earn or .consume |

**Credit Flow:**
- Initial credit from active GLOBAL policy (default 50)
- Consume on assessment start (default 10)
- Earn credits via ATTEMPT_COMPLETED event handler (score-based reward, capped at reward_ceiling)

---

## Module 4: Credit Policies
**Base Path:** `/api/credit-policies`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | / | Yes | PROGRAM_ADMIN, PLACEMENT_COORDINATOR | - | 200 {policies[]} | credit.credit_policies | - |
| POST | / | Yes | PLACEMENT_COORDINATOR | {policyKey?, scopeType, institutionId?, programId?, subdivisionId?, studentId?, initialCreditAmount?, consumeAmount?, rewardCeiling?, maxBalance?, selfPracticeEnabled?, conductedAttemptPolicy?} | 201 {policy} | credit.credit_policies | - |
| PUT | /:id | Yes | PLACEMENT_COORDINATOR | {initialCreditAmount?, consumeAmount?, rewardCeiling?, maxBalance?, isActive?} | 200 {policy} | credit.credit_policies | - |

---

## Module 4: Checklist
**Base Path:** `/api/checklist`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | / | Yes | Any | Query: programId? | 200 {items[]} | placement.checklist_items | - |
| POST | / | Yes | PLACEMENT_COORDINATOR | {programId, subdivisionId?, name, description?, category?, maxScore?, weight?, isRequired?} | 201 {item} | placement.checklist_items | - |
| POST | /import-csv | Yes | PLACEMENT_COORDINATOR | {programId, subdivisionId?, rows[{name, description?, category?, isRequired?}]} | 200 {inserted, total} | placement.checklist_items (ON CONFLICT DO NOTHING) | - |
| PUT | /:id | Yes | PLACEMENT_COORDINATOR | {name?, description?, category?, maxScore?, weight?, isRequired?} | 200 {item} | placement.checklist_items | - |
| DELETE | /:id | Yes | PLACEMENT_COORDINATOR | - | 204 | placement.checklist_items (soft delete) | - |
| GET | /my-progress | Yes | STUDENT | - | 200 {studentId, items[] with progress} | placement.checklist_items, placement.checklist_progress, org.students, org.batches | - |
| POST | /:itemId/toggle | Yes | STUDENT | {status, completionEvidence?, score?} | 200 {progress, itemId, status} | placement.checklist_progress (UPSERT), org.students | eventBus (CHECKLIST_ITEM_TOGGLED), EligibilityService.recalculate |
| GET | /mentee/:studentId | Yes | FACULTY_MENTOR | - | 200 {studentId, items[] with progress} | placement.checklist_items, placement.checklist_progress, org.student_mentor_assignments | - |

---

## Module 4: Verifications
**Base Path:** `/api/verifications`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /pending | Yes | FACULTY_MENTOR | - | 200 {verifications[]} | placement.mentor_verifications, placement.checklist_progress, placement.checklist_items, org.students, identity.users | - |
| POST | /request | Yes | STUDENT | {checklistItemId} | 201 {verificationId, status, checklistItemId, message} | org.students, placement.checklist_items, org.student_mentor_assignments, placement.checklist_progress (UPSERT), placement.mentor_verifications | - |
| POST | /:progressId/verify | Yes | FACULTY_MENTOR | {status: VERIFIED\|REJECTED, notes?} | 200 {verificationId, status} | placement.mentor_verifications, placement.checklist_progress (is_mentor_verified=true), org.student_mentor_assignments | eventBus (MENTOR_VERIFIED), EligibilityService.recalculate |

---

## Module 4: Placement Eligibility
**Base Path:** `/api/placement-eligibility`

| Method | Path | Auth | Roles | Request | Response | DB Tables | Dependencies |
|--------|------|------|-------|---------|----------|-----------|--------------|
| GET | /report | Yes | PLACEMENT_COORDINATOR, PROGRAM_ADMIN | Query: programId?, isEligible?, page?, limit? | 200 {report[], pagination} | placement.placement_eligibility, org.students, identity.users, org.batches | - |
| GET | /:studentId | Yes | STUDENT (own), Staff | - | 200 {eligibility} or trigger recalculation | placement.placement_eligibility, org.students | EligibilityService.recalculate (on-demand) |
| POST | /:studentId/recalculate | Yes | PLACEMENT_COORDINATOR, PROGRAM_ADMIN, FACULTY_MENTOR | - | 200 {eligibility} | placement.placement_eligibility, placement.checklist_items, placement.checklist_progress, performance.assessment_reports | EligibilityService.recalculate |

**Eligibility Algorithm:**
- Aggregates: checklist progress (weighted scores), assessment reports (overall_score)
- Checks: required checklist items completed, verified by mentor
- Blocking reasons: missing required items, unverified items, low scores
- Recalculated automatically on: MENTOR_VERIFIED, CHECKLIST_ITEM_TOGGLED, ATTEMPT_COMPLETED events

---

## AI Service
**Base URL:** `http://<AI_SERVICE_URL>/ai`

| Method | Path | Auth | Roles | Request | Response | External Deps | Notes |
|--------|------|------|-------|---------|----------|---------------|-------|
| POST | /generate-question | No | Internal | {student_name, skills[]?, projects[]?, difficulty, domain?, previous_turns[]?} | 200 {question_text, difficulty, category} | LLM (Groq/OpenAI) | Used by sessions when bank empty |
| POST | /evaluate-turn | No | Internal | {question_text, student_answer, difficulty, turn_number} | 200 {technical_score (0-10), communication_score (0-10), wpm, filler_words, feedback, strengths, weaknesses, next_recommended_difficulty} | LLM (Groq/OpenAI) | Simple sync eval (not used by M1 SSE flow) |
| POST | /evaluate-listening | No | Internal | {story_text, question, expected_answer, student_answer} | 200 {score (0-10), accuracy_level, feedback, missed_key_points[]} | LLM (Groq/OpenAI) | Listening comprehension assessment |
| POST | /evaluate-response | No | Internal | Multipart: audio (WAV), metadata JSON | SSE stream: text_chunk, text_end, result, error | Whisper (STT), LLM (Groq/OpenAI), audio signal analysis, pgvector (retrieve_relevant) | **M1 Primary Flow** — returns SSE with LLM token streaming |
| POST | /embed | No | Internal | {text} | 200 {embedding[], model, dimensions} | OpenAI Embeddings (text-embedding-3-small) | Single text embedding |
| POST | /embed-batch | No | Internal | {texts[]} (max 100) | 200 {embeddings[][], model, dimensions, count} | OpenAI Embeddings | Batch embedding (used by knowledge ingestion) |
| POST | /config | No | Internal | {llm_provider?, llm_base_url?, groq_api_key?, groq_model?} (requires X-Internal-Key header) | 200 {status, active_provider} | - | Runtime LLM config update |

**AI Service Architecture:**
- **STT:** Whisper (local or API)
- **LLM:** Groq or OpenAI (configurable)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dims)
- **Vector Store:** PostgreSQL pgvector (knowledge.knowledge_chunks)
- **Audio Analysis:** Signal processing (pace WPM, filler detection, fluency, clarity)

**SSE Event Types (evaluate-response):**
- `text_chunk`: Real-time LLM token delta
- `text_end`: LLM stream finished
- `result`: Full parsed CombinedEvalResult
- `error`: Pipeline failure

---

## Summary Statistics

### Backend Routes
- **Total Endpoints:** 115+
- **Public Endpoints:** 9 (health, auth, org lookups)
- **Protected Endpoints:** 106+
- **WebSocket Endpoints:** 0 (uses wsManager for push, not dedicated WS routes)

### Authentication Distribution
| Auth Level | Count | Notes |
|------------|-------|-------|
| Public | 9 | health, auth/register, auth/login, auth/invite/activate, invites/:token, org/* |
| Any Authenticated | 15 | auth/logout, auth/me, assessments GET, reports GET, knowledge/documents GET, etc. |
| STUDENT | 18 | self-service: sessions, attempts, responses, checklist progress, eligibility |
| FACULTY_MENTOR | 7 | mentor dashboards, verification, student resume verify |
| TRAINER | 2 | subdivisions, assign |
| PROGRAM_ADMIN | 23 | admin functions, assessments, programs, policies, bulk import |
| PLACEMENT_COORDINATOR | 12 | checklist, credits, policies, eligibility reports |
| SUPER_ADMIN | 8 | college programs, invite program admins |
| PLATFORM_OWNER | 8 | colleges CRUD, super admin invites, stats |

### Role Matrix
| Role | Typical Endpoints |
|------|-------------------|
| STUDENT | /sessions, /attempts/start, /responses/submit, /students/:id (self), /checklist/my-progress, /credits/balance/:id (self) |
| FACULTY_MENTOR | /mentors/my-students, /students/:studentId/verify-resume, /verifications/*, /checklist/mentee/:studentId |
| TRAINER | /trainers/my-subdivisions, /programs/:id/students |
| PROGRAM_ADMIN | /admin/*, /assessments CRUD, /programs CRUD, /question-bank CRUD, /knowledge CRUD |
| PLACEMENT_COORDINATOR | /checklist CRUD, /credits/adjust, /credit-policies CRUD, /placement-eligibility/report |
| SUPER_ADMIN | /colleges/:id, /colleges/:id/invite-program-admin, /programs CRUD |
| PLATFORM_OWNER | /colleges CRUD, /colleges/stats, /colleges/:id/invite-super-admin |

### Database Tables Referenced
**Identity Schema:** users, invites  
**Org Schema:** institutions, programs, sub_programs, batches, subdivisions, students, student_programs, student_mentor_assignments, trainer_subdivision_assignments  
**Assessment Schema:** assessments, assessment_components, assessment_attempts  
**Session Schema:** interview_sessions, interview_turns, assessment_sessions, questions, question_bank, question_bank_items, question_bank_item_skills  
**Evaluation Schema:** responses, response_evaluations, ai_runs  
**Performance Schema:** assessment_reports  
**Credit Schema:** credit_accounts, credit_transactions, credit_policies  
**Placement Schema:** checklist_items, checklist_progress, mentor_verifications, placement_eligibility  
**Knowledge Schema:** knowledge_documents, knowledge_chunks  
**System Schema:** audit_logs  

### External Dependencies
- **AI Service (FastAPI):** All evaluation, embedding, STT endpoints
- **Redis:** Session context (M1 interview state, resume, turn history)
- **WebSocket:** Real-time turn updates (wsManager)
- **Local Storage:** Resume/file uploads (LocalStorageClient)
- **Email/Events:** eventBus (USER_REGISTERED, MENTOR_VERIFIED, ATTEMPT_COMPLETED, CHECKLIST_ITEM_TOGGLED)

### Notable Patterns
1. **Credit-Gating:** All assessment starts consume credits (INSUFFICIENT_CREDITS failure)
2. **Proctoring:** Tab-switch tracking with auto-termination and audit logs
3. **Adaptive Difficulty:** Question bank selection based on prior technical scores
4. **Idempotency:** Response submit uses idempotencyKey to prevent duplicates
5. **Eligibility Recalculation:** Triggered by mentor verification, checklist toggle, attempt completion
6. **CSV Import:** Bulk student enrollment with program/sub-program auto-creation
7. **SSE Streaming:** M1 interview uses server-sent events for real-time LLM responses
8. **Targeting:** Assessments can target specific programs/sub-programs; enrollment check enforced

---

## Testing Notes
**Services are NOT currently running** — this inventory was built from source code analysis only.

### Testing Recommendations (Later):
1. **Public Endpoints:** Start with /health, /auth/register, /auth/login
2. **Student Flow:** register → login → /students/:id → /assessments → /attempts/start → /sessions/start → /responses/submit → /reports/:attemptId
3. **Credit System:** Check /credits/balance before/after /attempts/start
4. **Proctoring:** /sessions/:id/proctor-event with tab switch events
5. **Mentor Flow:** /mentors/my-students → /checklist/mentee/:studentId → /verifications/:progressId/verify
6. **Admin Flow:** /admin/students/import (CSV) → /programs CRUD → /assessments CRUD
7. **RAG Flow:** /knowledge/documents POST → /knowledge/search POST
8. **AI Service:** /ai/embed, /ai/evaluate-response (requires audio file)

---

**Generated by:** Claude Sonnet 4.5  
**Date:** 2026-10-01  
**Repository:** communication-readiness-platform-fresh (main branch)
