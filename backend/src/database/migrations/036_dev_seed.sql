-- Development seed data for end-to-end testing of Module 3.
-- Creates a minimal but fully interconnected set of records.
-- These are DEVELOPMENT fixtures only — never hardcode these IDs in application logic.
-- Safe to run multiple times: all INSERTs use ON CONFLICT DO NOTHING.

-- ── Fixed IDs for deterministic seed data ────────────────────────────────────

-- org.institutions
INSERT INTO org.institutions (id, name, code, is_active)
VALUES ('10000000-0000-0000-0000-000000000001', 'Demo Institute', 'DEMO', true)
ON CONFLICT (code) DO NOTHING;

-- org.programs
INSERT INTO org.programs (id, institution_id, name, code, is_active)
VALUES ('20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'Full Stack Engineering', 'FSE', true)
ON CONFLICT (institution_id, code) DO NOTHING;

-- org.batches
INSERT INTO org.batches (id, program_id, name, year, is_active)
VALUES ('30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'Batch 2026-A', 2026, true)
ON CONFLICT DO NOTHING;

-- org.subdivisions (Full Stack, DevOps)
INSERT INTO org.subdivisions (id, program_id, name, code, is_active)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'Full Stack', 'FS', true),
  ('40000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', 'DevOps', 'DO', true)
ON CONFLICT (program_id, code) DO NOTHING;

-- identity.users (admin user — password = 'Password123!' bcrypt hash)
INSERT INTO identity.users (
  id, name, email, password_hash, role,
  institution_id, first_name, last_name, is_active
)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  'Demo Admin',
  'admin@demo.local',
  '$2b$10$eW5NG4H8N9UUcxVW8u0FzeXPRFLEamx1vMjX0fCT7uMRY1EWdB5Ky',
  'PROGRAM_ADMIN',
  '10000000-0000-0000-0000-000000000001',
  'Demo', 'Admin', true
)
ON CONFLICT (email) DO NOTHING;

-- identity.users (student user — password = 'Password123!' bcrypt hash)
INSERT INTO identity.users (
  id, name, email, password_hash, role,
  institution_id, first_name, last_name, is_active
)
VALUES (
  '50000000-0000-0000-0000-000000000002',
  'Alice Seed',
  'alice@demo.local',
  '$2b$10$eW5NG4H8N9UUcxVW8u0FzeXPRFLEamx1vMjX0fCT7uMRY1EWdB5Ky',
  'STUDENT',
  '10000000-0000-0000-0000-000000000001',
  'Alice', 'Seed', true
)
ON CONFLICT (email) DO NOTHING;

-- identity.users (faculty mentor — password = 'Password123!')
INSERT INTO identity.users (
  id, name, email, password_hash, role,
  institution_id, first_name, last_name, is_active
)
VALUES (
  '50000000-0000-0000-0000-000000000003',
  'Bob Mentor',
  'bob@demo.local',
  '$2b$10$eW5NG4H8N9UUcxVW8u0FzeXPRFLEamx1vMjX0fCT7uMRY1EWdB5Ky',
  'FACULTY_MENTOR',
  '10000000-0000-0000-0000-000000000001',
  'Bob', 'Mentor', true
)
ON CONFLICT (email) DO NOTHING;

-- org.students (Alice)
INSERT INTO org.students (
  id, user_id, program_id, batch_id, subdivision_id
)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001'
)
ON CONFLICT (user_id) DO NOTHING;

-- performance.performance_profiles (Alice — seeded as if USER_REGISTERED fired)
INSERT INTO performance.performance_profiles (student_id)
VALUES ('60000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id) DO NOTHING;

-- org.student_mentor_assignments (Bob mentors Alice)
INSERT INTO org.student_mentor_assignments (
  id, student_id, mentor_user_id, is_active, assigned_by, starts_at
)
VALUES (
  '70000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000003',
  true,
  '50000000-0000-0000-0000-000000000001',
  now()
)
ON CONFLICT DO NOTHING;

-- performance.student_skills (assign some skills to Alice)
-- Uses the first few skills seeded in 024_skills_seed.sql
-- We use a subquery so the seed is resilient to different skill UUIDs.
INSERT INTO performance.student_skills (student_id, skill_id, source, updated_at)
SELECT
  '60000000-0000-0000-0000-000000000001',
  id,
  'SEED',
  now()
FROM performance.skills
WHERE category = 'TECHNICAL'
LIMIT 5
ON CONFLICT (student_id, skill_id) DO NOTHING;

-- knowledge.listening_stories (two demo stories)
INSERT INTO knowledge.listening_stories (
  id, title, content, difficulty, source_type, is_active
)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    'The Power of Active Listening',
    'Sarah noticed her colleague Mark seemed distracted during their daily stand-up. Instead of immediately jumping into her own update, Sarah paused and asked Mark if everything was okay. Mark admitted he was overwhelmed by a complex bug. Sarah listened carefully, asked clarifying questions, and helped Mark break the problem into smaller steps. By truly listening, Sarah not only helped solve the technical problem but also strengthened her team relationship.',
    'MEDIUM',
    'MANUAL',
    true
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    'Communicating Technical Concepts Clearly',
    'During a client meeting, David had to explain why the database migration would take two hours. He resisted the urge to use jargon and instead used an analogy: "Think of our database like a library. We need to reorganise every book into new shelves without closing the library." The client immediately understood. Clear communication saved the project from a three-week delay in approval.',
    'EASY',
    'MANUAL',
    true
  )
ON CONFLICT DO NOTHING;

-- knowledge.knowledge_documents + chunks
INSERT INTO knowledge.knowledge_documents (
  id, title, source_type, visibility_type, metadata
)
VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    'Java Interview Fundamentals',
    'MANUAL',
    'PUBLIC',
    '{"tags": ["java", "technical", "interview"]}'::jsonb
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    'System Design Interview Guide',
    'MANUAL',
    'PUBLIC',
    '{"tags": ["system-design", "technical", "scalability"]}'::jsonb
  )
ON CONFLICT DO NOTHING;

INSERT INTO knowledge.knowledge_chunks (
  document_id, chunk_index, chunk_text, source_metadata
)
VALUES
  (
    '90000000-0000-0000-0000-000000000001', 0,
    'Core Java: OOP principles (inheritance, polymorphism, encapsulation), Collections framework (ArrayList, HashMap, TreeMap), Exception handling, Generics, and Java 8+ features (Streams, Lambdas, Optional).',
    '{"section": "core"}'::jsonb
  ),
  (
    '90000000-0000-0000-0000-000000000001', 1,
    'Concurrency: Thread lifecycle, synchronized blocks, ReentrantLock, ExecutorService, CompletableFuture, and common pitfalls (deadlock, race conditions).',
    '{"section": "concurrency"}'::jsonb
  ),
  (
    '90000000-0000-0000-0000-000000000002', 0,
    'Scalability fundamentals: horizontal vs vertical scaling, load balancers (round-robin, least-connections), CDNs, database read replicas, and caching strategies (Redis, Memcached, write-through vs write-behind).',
    '{"section": "scalability"}'::jsonb
  ),
  (
    '90000000-0000-0000-0000-000000000002', 1,
    'Microservices patterns: service discovery, circuit breaker, API gateway, event-driven communication with message queues (Kafka, RabbitMQ), and saga pattern for distributed transactions.',
    '{"section": "microservices"}'::jsonb
  )
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- ── Module 2-style assessment fixtures ───────────────────────────────────────
-- These records simulate what Module 2 creates before firing ATTEMPT_COMPLETED.
-- The ATTEMPT_COMPLETED handler reads assessment_reports to populate
-- performance_snapshots and skill_performances.

-- assessment.assessments
INSERT INTO assessment.assessments (id, name, assessment_type, interview_type, version, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Technical Interview Round 1', 'INTERVIEW', 'TECHNICAL', 1, true
)
ON CONFLICT DO NOTHING;

-- assessment.assessment_attempts (Alice, COMPLETED)
INSERT INTO assessment.assessment_attempts (
  id, assessment_id, student_id, interview_type,
  program_id, batch_id, subdivision_id,
  assessment_version, scoring_version, status, started_at, completed_at
)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'TECHNICAL',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  1, 'v1.0',
  'COMPLETED',
  now() - interval '2 hours',
  now() - interval '1 hour'
)
ON CONFLICT DO NOTHING;

-- performance.assessment_reports with component_scores and skill_scores JSONB.
-- skill_scores keys are actual skill UUIDs from performance.skills, so we
-- build the JSON with a CTE rather than hardcoding UUIDs that may differ per env.
WITH seed_skills AS (
  SELECT id, row_number() OVER (ORDER BY category, name) AS rn
  FROM performance.skills
  WHERE is_active = true
  LIMIT 5
),
computed_skill_scores AS (
  SELECT jsonb_object_agg(
    id::text,
    jsonb_build_object(
      'score',
      CASE rn WHEN 1 THEN 45.0 WHEN 2 THEN 52.0 WHEN 3 THEN 38.0 WHEN 4 THEN 67.0 ELSE 55.0 END,
      'proficiency_level',
      CASE rn WHEN 4 THEN 'INTERMEDIATE' ELSE 'BEGINNER' END
    )
  ) AS scores
  FROM seed_skills
)
INSERT INTO performance.assessment_reports (
  id, attempt_id, student_id,
  assessment_version, scoring_version,
  technical_score, communication_score, listening_score, overall_score,
  component_scores, skill_scores
)
SELECT
  'a2000000-0000-0000-0000-000000000001'::uuid,
  'a1000000-0000-0000-0000-000000000001'::uuid,
  '60000000-0000-0000-0000-000000000001'::uuid,
  1, 'v1.0',
  48.0, 71.0, 65.0, 61.3,
  '{"TECHNICAL": 48.0, "COMMUNICATION": 71.0, "LISTENING": 65.0}'::jsonb,
  scores
FROM computed_skill_scores
ON CONFLICT (attempt_id) DO NOTHING;

-- performance.performance_snapshots (one for Alice from the above attempt)
INSERT INTO performance.performance_snapshots (
  student_id, attempt_id, program_id, batch_id, subdivision_id,
  technical_score, communication_score, listening_score, overall_score,
  component_scores, skill_scores
)
SELECT
  ar.student_id,
  ar.attempt_id,
  '20000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  ar.technical_score, ar.communication_score, ar.listening_score, ar.overall_score,
  ar.component_scores, ar.skill_scores
FROM performance.assessment_reports ar
WHERE ar.id = 'a2000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM performance.performance_snapshots ps
    WHERE ps.student_id = ar.student_id AND ps.attempt_id = ar.attempt_id
  );

-- performance.skill_performances (one row per skill in the report's skill_scores)
INSERT INTO performance.skill_performances (student_id, skill_id, attempt_id, score, proficiency_level, source)
SELECT
  ar.student_id,
  (kv.key)::uuid,
  ar.attempt_id,
  (kv.value->>'score')::numeric,
  kv.value->>'proficiency_level',
  'ASSESSMENT'
FROM performance.assessment_reports ar,
     jsonb_each(ar.skill_scores) AS kv
WHERE ar.id = 'a2000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM performance.skill_performances sp
    WHERE sp.student_id = ar.student_id
      AND sp.skill_id   = (kv.key)::uuid
      AND sp.attempt_id = ar.attempt_id
  );

-- Update Alice's performance profile with the aggregate from the seeded snapshot
UPDATE performance.performance_profiles
SET overall_score        = 61.3,
    technical_score      = 48.0,
    communication_score  = 71.0,
    listening_score      = 65.0,
    trend                = 'STABLE',
    updated_at           = now()
WHERE student_id = '60000000-0000-0000-0000-000000000001'
  AND overall_score IS NULL;
