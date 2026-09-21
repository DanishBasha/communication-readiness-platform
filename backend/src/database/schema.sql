-- =========================================================
-- AI-POWERED COMMUNICATION READINESS PLATFORM
-- PostgreSQL Master Database Schema
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. IDENTITY & RBAC
CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE IF NOT EXISTS identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'FACULTY_MENTOR', 'PROGRAM_ADMIN', 'TRAINER', 'PLACEMENT_COORDINATOR', 'SUPER_ADMIN')),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    is_email_verified BOOLEAN DEFAULT TRUE,
    verification_code VARCHAR(10),
    created_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS identity.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. COLLEGE & ACADEMIC COHORTS
CREATE SCHEMA IF NOT EXISTS college;

CREATE TABLE IF NOT EXISTS college.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS college.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES college.programs(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL UNIQUE,
    track_category VARCHAR(50) NOT NULL CHECK (track_category IN ('HOPE', 'PEP', 'DEPARTMENT')),
    admin_user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS college.trainer_tenures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES college.domains(id) ON DELETE CASCADE,
    company_or_institute VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS college.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES identity.users(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    batch_year INT NOT NULL,
    track VARCHAR(50) NOT NULL CHECK (track IN ('HOPE_ELITE', 'HOPE_NON_ELITE', 'PEP', 'DEPARTMENT', 'EXTERNAL')),
    domain_id UUID REFERENCES college.domains(id) ON DELETE SET NULL,
    mentor_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    github_handle VARCHAR(100),
    leetcode_handle VARCHAR(100),
    hackerrank_handle VARCHAR(100),
    codeforces_handle VARCHAR(100),
    codechef_handle VARCHAR(100),
    leetcode_solved INT DEFAULT 0,
    github_repos INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS college.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE REFERENCES college.students(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500),
    file_size INT,
    parsed_summary TEXT,
    parsed_skills JSONB DEFAULT '{"languages":[],"frameworks":[],"databases":[],"tools":[]}',
    parsed_projects JSONB DEFAULT '[]',
    raw_text TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COLLEGE CRITERIA TASKS
CREATE TABLE IF NOT EXISTS college.criteria_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_track VARCHAR(50) NOT NULL CHECK (target_track IN ('ALL', 'HOPE', 'PEP', 'DEPARTMENT')),
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS college.student_task_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    task_id UUID REFERENCES college.criteria_tasks(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    verified_by_mentor BOOLEAN DEFAULT FALSE,
    mentor_user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, task_id)
);

-- 3. ASSESSMENT & INTERVIEW ENGINE
CREATE SCHEMA IF NOT EXISTS assessment;

CREATE TABLE IF NOT EXISTS assessment.interview_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    assigned_by_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    assigned_by_role VARCHAR(50) NOT NULL CHECK (assigned_by_role IN ('PLACEMENT_COORDINATOR', 'PROGRAM_ADMIN', 'TRAINER')),
    target_track_or_domain VARCHAR(150) NOT NULL,
    domain_id UUID REFERENCES college.domains(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assessment.interview_assignments(id) ON DELETE SET NULL,
    session_type VARCHAR(50) DEFAULT 'MOCK_INTERVIEW' CHECK (session_type IN ('MOCK_INTERVIEW', 'PRACTICE')),
    current_difficulty VARCHAR(50) DEFAULT 'EASY' CHECK (current_difficulty IN ('EASY', 'MEDIUM', 'ADVANCED')),
    turn_index INT DEFAULT 0,
    tab_switch_count INT DEFAULT 0,
    fullscreen_exit_count INT DEFAULT 0,
    is_proctor_flagged BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS assessment.session_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES assessment.interview_sessions(id) ON DELETE CASCADE,
    turn_number INT NOT NULL,
    question_text TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'ADVANCED')),
    student_transcript TEXT,
    technical_score DECIMAL(5,2) DEFAULT 0,
    communication_score DECIMAL(5,2) DEFAULT 0,
    speaking_pace_wpm INT DEFAULT 0,
    filler_word_count INT DEFAULT 0,
    filler_breakdown JSONB DEFAULT '{}',
    feedback TEXT,
    strengths TEXT,
    weaknesses TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment.final_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE REFERENCES assessment.interview_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL,
    technical_score DECIMAL(5,2) NOT NULL,
    communication_score DECIMAL(5,2) NOT NULL,
    average_wpm INT NOT NULL,
    total_filler_words INT NOT NULL,
    filler_breakdown JSONB DEFAULT '{}',
    skill_breakdown JSONB DEFAULT '[]',
    actionable_next_steps JSONB DEFAULT '[]',
    tab_switches INT DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. LISTENING COMPREHENSION
CREATE SCHEMA IF NOT EXISTS listening;

CREATE TABLE IF NOT EXISTS listening.passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    narrative_text TEXT NOT NULL,
    duration_seconds INT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    domain_tag VARCHAR(100) DEFAULT 'SYSTEM_DESIGN',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listening.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES listening.passages(id) ON DELETE CASCADE,
    replays_used INT DEFAULT 0,
    max_replays INT DEFAULT 2,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
    overall_score DECIMAL(5,2),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS listening.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES listening.sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    student_answer TEXT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SUGGESTION SYSTEM & CHATBOT
CREATE SCHEMA IF NOT EXISTS suggestions;

CREATE TABLE IF NOT EXISTS suggestions.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES college.students(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'Self-Improvement Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggestions.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES suggestions.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    technical_terminology JSONB DEFAULT '[]',
    communication_suggestions JSONB DEFAULT '[]',
    structural_advice JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_email ON identity.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON identity.users(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON college.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON college.students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_students_domain_id ON college.students(domain_id);
CREATE INDEX IF NOT EXISTS idx_students_track ON college.students(track);
CREATE INDEX IF NOT EXISTS idx_tenures_trainer_id ON college.trainer_tenures(trainer_id);
CREATE INDEX IF NOT EXISTS idx_tenures_domain_id ON college.trainer_tenures(domain_id);
CREATE INDEX IF NOT EXISTS idx_int_sessions_student ON assessment.interview_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_session_turns_session ON assessment.session_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_student ON assessment.final_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_listening_student ON listening.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sug_sessions_student ON suggestions.chat_sessions(student_id);
