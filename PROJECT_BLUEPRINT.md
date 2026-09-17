# Master Project Blueprint & Build Guide
# AI-Powered Communication Readiness Platform (College Edition)

> **Deployment Scope:** Single-College Internal Implementation (2,000–3,000 Students)
> **Target Audience:** Engineering Team, Project Leads, Campus System Admins
> **Source Reference:** University Placement & Training Ecosystem Specifications

---

## Table of Contents
1. [College Structure & Problem Statement](#1-college-structure--problem-statement)
2. [Role-Based Access Control (RBAC) & Reporting Hierarchy](#2-role-based-access-control-rbac--reporting-hierarchy)
3. [Practice Interview Assignment Matrix](#3-practice-interview-assignment-matrix)
4. [Core Features & Student Journey](#4-core-features--student-journey)
5. [Database Schema & Data Layer (PostgreSQL)](#5-database-schema--data-layer-postgresql)
6. [Core Application Layer (Node.js Modular Monolith)](#6-core-application-layer-nodejs-modular-monolith)
7. [AI & Speech Processing Layer (FastAPI Service)](#7-ai--speech-processing-layer-fastapi-service)
8. [Frontend Architecture (React SPA)](#8-frontend-architecture-react-spa)
9. [Proctoring, Audio Analysis & Scoring Algorithms](#9-proctoring-audio-analysis--scoring-algorithms)
10. [Step-by-Step Implementation Roadmap](#10-step-by-step-implementation-roadmap)
11. [Environment Configuration & Verification](#11-environment-configuration--verification)

---

## 1. College Structure & Problem Statement

### 1.1 Context & Problem
Our institution prepares approximately 2,000 to 3,000 engineering students for campus placement drives. While technical skills are developed in class, students frequently fail placement interviews due to **poor communication readiness**—specifically nervous speaking pace, excessive filler words ('uh', 'um'), fragmented sentences, weak vocal clarity, and lack of structured articulation.

### 1.2 The Three Student Cohorts
The student body is systematically partitioned into three tracks:
1. **HOPE Track (~300 Students - Advanced Coding Focus):**
   - **HOPE Elite (52–60 Students):** Top-tier coders receiving intensive problem-solving and high-bar mock interviews.
   - **HOPE Non-Elite (~240 Students):** Foundation-to-intermediate coding track.
2. **PEP Track (Professional Enhancement Program - 21 Industry Domains):**
   - Specialized domain preparation (e.g., Full Stack, Cybersecurity, Cloud Computing, AI/ML, Embedded Systems, etc.).
   - Supported by a **100-day training curriculum** (25 days/semester), including **10–15 days of intensive workshops delivered by external visiting trainers**.
3. **Department Stream (General):**
   - Students not enrolled in HOPE or PEP.
   - **Mandatory Rule:** They still have assigned faculty mentors, attend communication practice sessions, and track their college placement checklist.

---

## 2. Role-Based Access Control (RBAC) & Reporting Hierarchy

### 2.1 The 5 Roles
1. **Placement Coordinator (Super Admin):**
   - Manages all user accounts and roles across the college.
   - Directly oversees and assigns **Faculty Mentors**.
   - Views institution-wide readiness analytics, batch comparisons, and top-performer rankings.
   - Can assign mandatory practice mock interviews to the entire university or specific cohorts.
2. **Program Admin (Track/Domain In-Charge):**
   - Faculty lead responsible for a specific track (HOPE Elite, HOPE Non-Elite, or one of the 21 PEP domains).
   - Manages students enrolled in their track.
   - **Onboards and revokes access for visiting Trainers** during their 10–15 day tenure.
   - **Assigns domain practice mock interviews** to students under their domain.
3. **Communication / Domain Trainer (Visiting Expert):**
   - Industry instructors visiting for 10–15 day training modules.
   - Has access ONLY to students in their assigned domain.
   - Views communication metrics, speech scores, and weak areas of domain students.
   - **Can assign practice mock interviews** to their domain students during their active tenure.
   - Access is deactivated by the Program Admin once the training concludes.
4. **Faculty Mentor (Student Progress Guide):**
   - **Reports directly under the Placement Coordinator.**
   - Assigned approximately **25 students** (drawn from ANY track: HOPE, PEP, or Department).
   - **View-Only on student records:** Cannot delete students or modify academic cohorts.
   - Inspects mentee interview scores, communication progress, and **verifies completion of college criteria tasks** from the uploaded CSV sheet.
5. **Student (The Candidate):**
   - Uploads resume; connects external coding handles (GitHub, LeetCode, Codeforces, HackerRank, CodeChef).
   - Attends proctored mock interviews and listening comprehension assessments.
   - Views granular communication diagnostics (filler words, WPM pace, tone, conceptual gaps).
   - Checks off required college placement tasks for mentor verification.

---

## 3. Practice Interview Assignment Matrix

| Action | Placement Coordinator | Program Admin | Trainer | Faculty Mentor | Student |
|---|:---:|:---:|:---:|:---:|:---:|
| **Assign Interviews College-Wide** |  | - | - | - | - |
| **Assign Interviews to Domain Students** |  |  |  (Active tenure) | - | - |
| **Self-Initiate Practice Interview** | - | - | - | - |  |
| **Onboard / Revoke Trainers** |  |  (Their domain) | - | - | - |
| **Assign Mentors to Students** |  | - | - | - | - |
| **Verify Criteria CSV Tasks** |  | - | - |  (Their ~25 mentees) | - |
| **View Student Records** | College-wide | Their Domain | Their Domain | Assigned ~25 Mentees | Self Only |

---

## 4. Core Features & Student Journey

### 4.1 Resume Upload & Grounding
- Student uploads PDF/DOCX resume.
- Extractor parses domain skills, listed projects, frameworks, and academic background.
- AI mock interview questions strictly ground themselves in the candidate's actual projects and claims.

### 4.2 Proctored Mock Interview Room
- **Proctored Constraints:**
  - Fullscreen mode enforced upon entry.
  - **Tab-Switch & Blur Tracking:** Logs every tab switch or window minimize; flags sessions exceeding violation limits.
  - Browser permissions check for microphone.
- **Realistic Question Flow:** Simulates a real human technical interviewer asking follow-up questions based on student answers.

### 4.3 Listening Comprehension Assessment
- AI narrates an audio scenario, client specification, or technical problem passage.
- Candidate cannot read the text; they must listen actively.
- AI asks targeted comprehension questions; candidate responds via voice.
- Generates an independent Listening Comprehension score.

### 4.4 Speech & Communication Diagnostics
- **Filler Word Frequency:** Counts exact occurrences of 'uh', 'um', 'like', 'actually', 'you know'.
- **Speaking Pace (WPM):** Classifies rate (Under 110 WPM = Hesitant, 120–150 WPM = Ideal, >160 WPM = Rushed).
- **Sentence Breaking & Pauses:** Flags mid-sentence hesitations and dead-air intervals.
- **Tone & Delivery:** Evaluates structural confidence.
- **Self-Improvement Action Items:** Provides tailored next-step recommendations even for top performers.

### 4.5 External Coding Profiles & Criteria CSV Checklist
- **Coding Handles:** Profile links to GitHub, LeetCode, Codeforces, CodeChef, and HackerRank.
- **Placement Criteria Checklist:**
  - Admin uploads college criteria via CSV (e.g., 'Solve 50 LeetCode Mediums', 'Complete AWS Cloud Practitioner', 'Attend 3 Mock Interviews').
  - Students mark checklist items as completed.
  - Faculty Mentors inspect evidence and verify completion.

---

## 5. Database Schema & Data Layer (PostgreSQL)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Schema: identity
CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'PLACEMENT_COORDINATOR', 'PROGRAM_ADMIN', 'TRAINER', 'FACULTY_MENTOR', 'STUDENT'
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schema: college_structure
CREATE SCHEMA IF NOT EXISTS college;

CREATE TABLE college.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- 'HOPE_ELITE', 'HOPE_NON_ELITE', or one of 21 PEP domains
    track_category VARCHAR(50) NOT NULL, -- 'HOPE', 'PEP', 'DEPARTMENT'
    admin_user_id UUID REFERENCES identity.users(id),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE college.trainer_tenures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES college.domains(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE college.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    batch_year INT NOT NULL,
    domain_id UUID REFERENCES college.domains(id), -- Nullable for Department-only students
    mentor_id UUID REFERENCES identity.users(id),  -- Assigned mentor under Placement Coordinator
    github_handle VARCHAR(100),
    leetcode_handle VARCHAR(100),
    hackerrank_handle VARCHAR(100),
    codeforces_handle VARCHAR(100),
    codechef_handle VARCHAR(100),
    resume_text TEXT,
    resume_url VARCHAR(500)
);

-- College Criteria CSV Checklist
CREATE TABLE college.criteria_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_track VARCHAR(50), -- 'ALL', 'HOPE', 'PEP'
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE college.student_task_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    task_id UUID REFERENCES college.criteria_tasks(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    verified_by_mentor BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, task_id)
);

-- Schema: interview_engine
CREATE SCHEMA IF NOT EXISTS assessment;

CREATE TABLE assessment.interview_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    assigned_by_id UUID REFERENCES identity.users(id),
    assigned_by_role VARCHAR(50) NOT NULL, -- 'PLACEMENT_COORDINATOR', 'PROGRAM_ADMIN', 'TRAINER'
    target_type VARCHAR(50) NOT NULL, -- 'ALL', 'DOMAIN', 'STUDENT_LIST'
    domain_id UUID REFERENCES college.domains(id),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assessment.interview_assignments(id),
    session_type VARCHAR(50) NOT NULL, -- 'MOCK_INTERVIEW', 'LISTENING_COMPREHENSION'
    current_difficulty VARCHAR(50) DEFAULT 'EASY',
    tab_switch_count INT DEFAULT 0,
    fullscreen_exit_count INT DEFAULT 0,
    is_proctor_flagged BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE assessment.session_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES assessment.interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    student_transcript TEXT NOT NULL,
    technical_score DECIMAL(5,2) NOT NULL,
    fluency_score DECIMAL(5,2) NOT NULL,
    clarity_score DECIMAL(5,2) NOT NULL,
    speaking_pace_wpm INT NOT NULL,
    filler_word_count INT NOT NULL,
    feedback TEXT NOT NULL,
    strengths TEXT,
    weaknesses TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment.final_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE REFERENCES assessment.interview_sessions(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL,
    technical_average DECIMAL(5,2) NOT NULL,
    communication_average DECIMAL(5,2) NOT NULL,
    average_wpm INT NOT NULL,
    total_filler_words INT NOT NULL,
    actionable_next_steps TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Core Application Layer (Node.js Modular Monolith)

- **Assignment Router:** Validates assignment rights (Coordinator can target anyone; Program Admin & Trainer can target only their domain).
- **Mentor Supervision:** Endpoints for mentors to fetch their 25 mentees and check off criteria tasks.
- **Trainer Access Guard:** Middleware checking `college.trainer_tenures` to ensure visiting trainers can only access records during active dates.
- **Proctoring Telemetry:** Webhook `/api/sessions/:id/proctor-event` increments tab-switch and fullscreen-exit counters in real time.

---

## 7. AI & Speech Processing Layer (FastAPI Service)

### 7.1 Single-Pass Evaluation with Speech Metrics
The Python service ingests transient audio, runs Speech-to-Text (STT), calculates acoustic metrics (WPM, fillers, pause frequency), and calls the LLM Provider in a single pass:

```python
COMMON_FILLERS = ['uh', 'um', 'like', 'you know', 'actually', 'basically', 'sort of']

def compute_speech_metrics(transcript: str, duration_sec: float):
    words = transcript.lower().split()
    word_count = len(words)
    wpm = int((word_count / duration_sec) * 60) if duration_sec > 0 else 0
    fillers_detected = sum(1 for w in words if w in COMMON_FILLERS)
    return {
        'wpm': wpm,
        'filler_count': fillers_detected,
        'is_pace_optimal': 120 <= wpm <= 150
    }
```

---

## 8. Frontend Architecture (React SPA)

### 8.1 Distinct Portals
1. **Student Portal:** Resume uploader, Coding handles input, Checklist tab, Proctored Mock Room, Report Card.
2. **Faculty Mentor Portal:** List of assigned ~25 mentees, interview history cards, criteria checklist verify toggle.
3. **Program Admin Portal:** Track manager (HOPE / PEP domain), Trainer onboarding modal with active date picker, assign domain interview button.
4. **Trainer Portal:** Domain student communication scorecards, weak area clusters, assign practice session form.
5. **Placement Coordinator Portal:** Institution readiness gauge, top-performer filter (e.g. 'Show HOPE Elite + LeetCode > 100 + Score > 80'), college-wide interview assignment form.

---

## 9. Proctoring, Audio Analysis & Scoring Algorithms

### 9.1 Proctoring Rules
- **Violation Level 1 (1–2 tab switches):** Yellow warning banner on screen.
- **Violation Level 2 (3–4 tab switches):** Orange banner, logged in report.
- **Violation Level 3 (>= 5 switches):** Session marked `is_proctor_flagged = TRUE` with red flag visible to Coordinator and Mentor.

### 9.2 Weighted Scoring
`Final Score = (TechnicalAverage * 0.70) + (CommunicationAverage * 0.30)`
Communication average incorporates:
- Fluency (35%)
- Pacing / WPM (25%)
- Filler word penalty (20%)
- Clarity & Tone (20%)

---

## 10. Step-by-Step Implementation Roadmap

### Phase 1: Database & RBAC Foundation
- Initialize PostgreSQL with `college`, `identity`, and `assessment` schemas.
- Build user auth with 5 roles.
- Setup Mentor assignment table (Mentors reporting to Placement Coordinator).

### Phase 2: Resume Parser & AI Evaluation Microservice
- Build resume extraction endpoint.
- Setup FastAPI with Cloud LLM Provider (Gemini/OpenAI) + STT.
- Implement WPM and filler word calculation.

### Phase 3: Proctored Interview & Listening Comprehension
- Build React proctored interview room with fullscreen & tab-switch tracker.
- Build Listening Comprehension audio playback and answer evaluation.
- Implement interview assignment workflow for Coordinator, Admin, and Trainer.

### Phase 4: College Checklist & Mentor Verification
- CSV criteria upload for Placement Coordinator.
- Student checklist view & Mentor verification toggle.
- Coding profile integration (LeetCode, GitHub, etc.).

### Phase 5: Institutional Dashboards & Trainer Lifecycle
- Program Admin Trainer onboarding & tenure deactivation.
- Placement Coordinator college-wide readiness leaderboard.
- End-to-end college pilot testing.

---

## 11. Environment Configuration & Verification

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/college_readiness_db
JWT_SECRET=college_secret_key
AI_SERVICE_URL=http://localhost:8000
MAX_TAB_SWITCH_LIMIT=4
```

*End of Master Blueprint*
