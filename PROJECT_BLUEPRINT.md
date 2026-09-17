# Master Project Blueprint & Build Guide
# AI-Powered Communication Readiness Platform

> **Status:** Production-Ready Architectural Blueprint  
> **Target Audience:** Full-Stack & AI Engineers, DevOps, Project Leads  
> **Source Design:** [Miro Board uXjVHnCy97Q](https://miro.com/app/board/uXjVHnCy97Q=/)  

---

## Table of Contents
1. [Executive Summary & Core Value Proposition](#1-executive-summary--core-value-proposition)
2. [High-Level System Architecture & Principles](#2-high-level-system-architecture--principles)
3. [Recommended Repository & Folder Structure](#3-recommended-repository--folder-structure)
4. [Database & Data Layer Specification](#4-database--data-layer-specification)
5. [Core Application Layer (Node.js Monolith)](#5-core-application-layer-nodejs-monolith)
6. [AI Intelligence Layer (FastAPI Service)](#6-ai-intelligence-layer-fastapi-service)
7. [Frontend Architecture (React SPA)](#7-frontend-architecture-react-spa)
8. [API Specifications & Contracts](#8-api-specifications--contracts)
9. [Core Algorithms, Scoring & State Machines](#9-core-algorithms-scoring--state-machines)
10. [Step-by-Step Implementation Roadmap](#10-step-by-step-implementation-roadmap)
11. [Environment Variables & Configuration](#11-environment-variables--configuration)
12. [Verification & Testing Strategy](#12-verification--testing-strategy)

---

## 1. Executive Summary & Core Value Proposition

### 1.1 Problem Statement
Universities and technical bootcamps struggle to prepare thousands of students for high-stakes corporate placement interviews. Traditional faculty-led mock interviews do not scale, lack objective evaluation rubrics, and fail to provide granular communication diagnostics (such as speaking pace, clarity, and fluency).

### 1.2 The Solution
The **AI-Powered Communication Readiness Platform** is an end-to-end automated interview ecosystem:
- **Resume-Tailored Technical Interviews:** Reads candidate resumes, matches curriculum domains, and dynamically generates questions via **RAG** (Retrieval-Augmented Generation).
- **Dual-Track Evaluation:** Analyzes **technical correctness & depth** alongside **spoken communication metrics** (fluency, clarity, words-per-minute pace, pitch modulation).
- **Real-Time Adaptive Difficulty:** Adjusts dynamically (Easy <-> Medium <-> Advanced) based on response quality.
- **Auditable & Immutable Diagnostics:** Generates permanent historical reports (`AssessmentReport`) while updating dynamic student readiness profiles (`PerformanceProfile`).
- **Institutional Oversight:** Placement cells, program admins, and mentors receive real-time visibility into student readiness rankings and skill deficiencies.

---

## 2. High-Level System Architecture & Principles

The platform follows a **Modular Monolith + AI Services + RAG** design pattern:

```
+-------------------------------------------------------------+
| 01 · PRESENTATION LAYER: React SPA (Tailwind CSS / Vite)    |
| Single SPA with role-scoped views (Student, Trainer, Mentor,|
| Program Admin, Placement Coordinator)                       |
+------------------------------+------------------------------+
                               | HTTPS / REST / WebSockets
+------------------------------v------------------------------+
| 02 · CORE APPLICATION LAYER: Node.js + Express Monolith     |
| 15 Domain Modules: Auth/RBAC, Student/Org, Assessment State,|
| Scoring Engine, Report Generator, Credit Ledger, Backgrounds|
+--------------+-------------------------------+--------------+
               | Internal HTTP / gRPC          | SQL / ORM
+--------------v-------------+   +-------------v--------------+
| 03 · AI INTELLIGENCE:      |   | 04 · DATA LAYER:           |
| FastAPI (Python)           |   | PostgreSQL (System of Rec) |
| - Transient STT Pipeline   |   | - 8 Logical Schemas        |
| - Audio Metrics (Librosa)  |   | - pgvector Semantic Search |
| - Provider Abstractions    |   +-------------+--------------+
| - Single-Pass LLM Eval     |                 |
+--------------+-------------+                 |
               |                               |
+--------------v-------------------------------v--------------+
| 05 · EXTERNAL PROVIDERS (Interface-Driven & Pluggable)      |
| LLM (Gemini/OpenAI MVP -> Local vLLM/Ollama) | STT (Deepgram|
| / Whisper) | Web Search Fallback (Tavily/Serper)            |
+-------------------------------------------------------------+
```

### The 15 Core Architectural Principles
1. **Modular Monolith for Core Logic:** Domain logic runs in a single Node.js runtime with strict internal boundaries. Avoids premature microservices.
2. **Node.js for Business Orchestration:** State transitions, credit rules, attempt tracking, and scoring calculations reside strictly in Node.js.
3. **FastAPI / Python for AI & Audio:** Audio processing, speech transcription, vector embeddings, and LLM prompt chaining reside in Python.
4. **PostgreSQL as Single System of Record:** Operational data, audit trails, and configurations live in a unified database.
5. **pgvector for Native RAG:** Embeddings live in PostgreSQL, eliminating third-party vector database dependencies.
6. **Provider Abstraction (`LLMProvider`, `SpeechProvider`):** Abstract interfaces decouple business workflows from underlying AI vendors.
7. **Server-Side RBAC + Scope Authorization:** `Authorization = Role + Permission + Scope`. Frontend restrictions are cosmetic.
8. **Single-Pass LLM Evaluation:** A single structured JSON prompt simultaneously evaluates correctness, depth, reasoning, and evidence.
9. **Immutable Historical Reports:** Reports (`AssessmentReport`) are point-in-time snapshots that never change once finalized.
10. **Profile vs. Snapshot State:** `PerformanceProfile` stores current aggregate scores; `PerformanceSnapshot` logs append-only historical trends.
11. **Transient Audio Processing:** Raw voice audio is processed in memory and **never permanently written to disk**.
12. **Extensible for Future Modalities:** Architecture ready to add camera/video analysis without restructuring the core API.
13. **No Unnecessary Microservices:** Minimizes operational complexity, network latency, and distributed transactions.
14. **No Business Logic in Controllers:** Controllers solely validate inputs, call services, and serialize responses.
15. **AI Never Controls Deterministic State:** AI generates text and scores answers; deterministic code enforces difficulty progression, attempts, and credits.

---

## 3. Recommended Repository & Folder Structure

```
communication-readiness-platform/
├── README.md
├── PROJECT_BLUEPRINT.md
├── docker-compose.yml
├── docs/
│   └── architecture/
│       ├── CLASS_DIAGRAM.md
│       ├── SYSTEM_ARCHITECTURE.md
│       ├── SEQUENCE_DIAGRAM.md
│       ├── USE_CASE_DIAGRAM.md
│       ├── DATA_MODEL.md
│       ├── GALLERY.md
│       └── images/
│
├── backend/                       # Node.js + Express Modular Monolith
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       ├── common/                # Middleware (auth, rbac, errors, logging)
│       └── modules/
│           ├── auth/              # JWT, password hashing, session
│           ├── user-role/         # User, Role, Permission, Scope
│           ├── student/           # Student profiles, Resumes, Mentors
│           ├── organization/      # Program, Domain, Batch, Department
│           ├── assessment/        # Assessment, Configurations, Attempts
│           ├── interview/         # InterviewSession, Question dispatch
│           ├── listening/         # ListeningSession, Audio playback logic
│           ├── question-bank/     # Curated question inventory
│           ├── evaluation/        # Orchestrates calls to AI Service
│           ├── scoring/           # Deterministic formula engine (90/10)
│           ├── performance/       # PerformanceProfile, Snapshots, Trends
│           ├── report/            # AssessmentReport compilation & PDF
│           ├── credit/            # CreditAccount, Transactions, Policies
│           ├── learning/          # LearningRecommendation engine
│           ├── placement/         # Readiness scoring, Top performers
│           └── admin/             # Batch operations, Mentor assignment
│
├── ai-service/                    # Python + FastAPI Intelligence Layer
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── src/
│       ├── main.py
│       ├── config.py
│       ├── providers/             # Provider Abstractions
│       │   ├── base.py            # LLMProvider, SpeechProvider interfaces
│       │   ├── cloud_llm.py       # OpenAI / Gemini API (MVP)
│       │   ├── local_llm.py       # vLLM / Ollama (Production)
│       │   ├── speech_provider.py # Whisper / Deepgram implementation
│       │   └── factory.py         # Factory based on ENV
│       ├── audio/                 # Transient audio parsing, Librosa metrics
│       ├── rag/                   # pgvector client, Chunking, Embeddings
│       ├── routers/
│       │   ├── speech.py          # /ai/transcribe & audio analysis
│       │   ├── evaluate.py        # /ai/evaluate-answer
│       │   ├── questions.py       # /ai/generate-question
│       │   └── rag.py             # /ai/knowledge/query & ingest
│       └── schemas/               # Pydantic models for structured outputs
│
└── frontend/                      # React SPA (Vite + TypeScript + Tailwind)
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/            # AudioVisualizer, Timer, Modals, Badges
        ├── context/               # AuthContext, AssessmentSessionContext
        ├── hooks/                 # useAudioRecorder, useSessionState
        ├── services/              # Axios API client
        └── routes/
            ├── student/           # Dashboard, InterviewRoom, Reports
            ├── trainer/           # Student communication results
            ├── mentor/            # Assigned students tracking
            ├── admin/             # Programs, Batches, User roles
            └── placement/         # Readiness matrices & rankings
```

---

## 4. Database & Data Layer Specification

The PostgreSQL database is organized into **8 logical schemas**:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Schema: identity
CREATE SCHEMA IF NOT EXISTS identity;
CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE identity.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE identity.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    UNIQUE(resource, action)
);

CREATE TABLE identity.access_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(50) NOT NULL, -- 'GLOBAL', 'PROGRAM', 'DOMAIN', 'BATCH', 'DEPARTMENT'
    scope_id UUID NOT NULL
);

CREATE TABLE identity.role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES identity.roles(id) ON DELETE CASCADE,
    access_scope_id UUID REFERENCES identity.access_scopes(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Schema: assessment & session
CREATE SCHEMA IF NOT EXISTS assessment;
CREATE TABLE assessment.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'TECHNICAL_INTERVIEW', 'LISTENING_ASSESSMENT'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE assessment.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    assessment_id UUID REFERENCES assessment.assessments(id),
    attempt_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE SCHEMA IF NOT EXISTS session;
CREATE TABLE session.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES assessment.assessment_attempts(id) ON DELETE CASCADE,
    interview_type VARCHAR(100) NOT NULL,
    current_difficulty VARCHAR(50) DEFAULT 'EASY',
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE TABLE session.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES session.interview_sessions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL
);

-- Schema: evaluation
CREATE SCHEMA IF NOT EXISTS evaluation;
CREATE TABLE evaluation.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES session.questions(id) ON DELETE CASCADE,
    mode VARCHAR(50) DEFAULT 'VOICE',
    transcript TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluation.evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES evaluation.responses(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    strengths TEXT,
    weaknesses TEXT,
    feedback TEXT,
    evaluation_version VARCHAR(50) NOT NULL
);

CREATE TABLE evaluation.communication_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES evaluation.responses(id) ON DELETE CASCADE,
    fluency_score DECIMAL(5,2) NOT NULL,
    clarity_score DECIMAL(5,2) NOT NULL,
    pace_score DECIMAL(5,2) NOT NULL,
    pitch_score DECIMAL(5,2) NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schema: performance
CREATE SCHEMA IF NOT EXISTS performance;
CREATE TABLE performance.assessment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES assessment.assessment_attempts(id) UNIQUE,
    total_score DECIMAL(5,2) NOT NULL,
    scoring_version VARCHAR(50) NOT NULL,
    feedback TEXT NOT NULL,
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    learning_path TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE performance.performance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE NOT NULL,
    technical_score DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    communication_score DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    listening_score DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    previous_overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    trend VARCHAR(50) DEFAULT 'STABLE'
);

CREATE TABLE performance.performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    technical_score DECIMAL(5,2) NOT NULL,
    communication_score DECIMAL(5,2) NOT NULL,
    listening_score DECIMAL(5,2) NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schema: credit
CREATE SCHEMA IF NOT EXISTS credit;
CREATE TABLE credit.credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE NOT NULL,
    balance INT DEFAULT 5,
    maximum_balance INT DEFAULT 10
);

CREATE TABLE credit.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES credit.credit_accounts(id),
    amount INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Core Application Layer (Node.js Monolith)

The Node.js backend acts as the deterministic system orchestrator:
1. **Session Lifecycle:** Guarantees credit deduction BEFORE creating an attempt.
2. **Difficulty Transition:** Evaluates the last score and adjusts the `currentDifficulty` on `InterviewSession`.
3. **Aggregate Scoring:** Formula: `Total = (Technical * 0.90) + (Communication * 0.10)`.
4. **Immutability:** Once an attempt status is marked `COMPLETED`, its `AssessmentReport` is strictly read-only.

---

## 6. AI Intelligence Layer (FastAPI Service)

### 6.1 Provider Factory Pattern
Allows starting immediately with a Cloud API (Gemini or OpenAI) and later swapping to a self-hosted model (vLLM / Ollama):

```python
# ai-service/src/providers/factory.py
import os
from .base import LLMProvider
from .cloud_llm import CloudAPIProvider
from .local_llm import SelfHostedLLMProvider

def get_llm_provider() -> LLMProvider:
    provider = os.getenv('LLM_PROVIDER', 'cloud_api')
    if provider == 'cloud_api':
        return CloudAPIProvider()
    return SelfHostedLLMProvider()
```

### 6.2 Structured Single-Pass Evaluation Prompt
```python
PROMPT = '''
You are an expert technical interviewer.
Evaluate the transcribed answer against the technical question and reference context.

Return JSON ONLY with:
{
  "score": 85,
  "confidence": 0.92,
  "strengths": "Accurate explanation of indexing.",
  "weaknesses": "Missed compound index ordering.",
  "feedback": "Review B-Tree index traversal."
}
'''
```

---

## 7. Frontend Architecture (React SPA)

- **Role-based Protected Routes:** Protects student, trainer, mentor, and admin portals.
- **Interview Room UI:** Features real-time audio waveform visualization, countdown timer, question display, and submit buttons.
- **Report View:** Displays radar chart of skills, communication scores (WPM, fluency), strengths, weaknesses, and step-by-step learning recommendations.

---

## 8. API Specifications & Contracts

### Node.js REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Returns JWT and user role/scope |
| POST | `/api/assessments/:id/start` | Deducts credit and initiates session |
| GET | `/api/sessions/:id/next-question` | Fetches next adaptive question |
| POST | `/api/sessions/:id/submit-answer` | Submits audio/text response for evaluation |
| POST | `/api/sessions/:id/complete` | Concludes session, calculates final scores, generates report |
| GET | `/api/reports/:id` | Fetches immutable assessment report |

---

## 9. Core Algorithms, Scoring & State Machines

### Adaptive Difficulty Matrix
- **Start:** EASY
- If score on current question >= 80: **EASY -> MEDIUM**
- If score on current question >= 85: **MEDIUM -> ADVANCED**
- If score on current question < 50: **MEDIUM -> EASY**
- If score on current question < 60: **ADVANCED -> MEDIUM**

### Aggregate Scoring Formula
`Total = (TechnicalScore * 0.90) + (CommunicationScore * 0.10)`

---

## 10. Step-by-Step Implementation Roadmap

### Phase 1: Foundation (Week 1)
- Scaffolding repository structure.
- PostgreSQL Docker container + schema migration.
- JWT authentication + RBAC middleware.

### Phase 2: AI Intelligence MVP (Week 2)
- FastAPI setup with `LLMProvider` interface.
- Gemini / OpenAI API integration.
- Speech-to-Text integration.
- Single-pass evaluation endpoint.

### Phase 3: Student Flow & Interview Room (Week 3)
- Interview state machine in Node.js.
- React Interview Room with mic audio recording.
- Adaptive difficulty loop.

### Phase 4: Reports, Performance & Credits (Week 4)
- Deterministic scoring engine (90% tech / 10% comm).
- Immutable report generation & performance profile updates.
- Credit ledger system (-1 on start, +2 on >= 85%).

### Phase 5: Institutional Portals (Week 5)
- Trainer, Mentor, Admin, and Placement dashboards.
- Readiness index & top-performers leaderboard.

---

## 11. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/readiness_db
JWT_SECRET=super_secret_jwt_key
AI_SERVICE_URL=http://localhost:8000
```

### AI Service (`ai-service/.env`)
```env
PORT=8000
LLM_PROVIDER=cloud_api
GEMINI_API_KEY=your_gemini_api_key
STT_PROVIDER=whisper
```

---

## 12. Verification & Testing Strategy
1. **Unit Testing:** Validate difficulty transitions, credit caps, and 90/10 scoring.
2. **Mock AI Provider:** Use mock LLM responses during tests to avoid API costs.
3. **Privacy Audit:** Verify raw audio files are not retained on disk.

---
*End of Master Blueprint*
