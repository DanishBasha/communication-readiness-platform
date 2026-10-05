-- Development seed: Charlie — second student for multi-user acceptance testing.
-- Charlie has the OPPOSITE profile to Alice:
--   Alice:   technical=48 (weak), communication=71, listening=65  → weak in technical
--   Charlie: technical=72,         communication=43 (weak), listening=50 (weak) → weak in soft skills
-- This produces clearly different roadmaps when both run through Module 3.
-- All INSERTs are idempotent (ON CONFLICT DO NOTHING / WHERE NOT EXISTS).

-- identity.users (Charlie — password = 'Password123!' bcrypt hash)
INSERT INTO identity.users (
  id, name, email, password_hash, role,
  institution_id, first_name, last_name, is_active
)
VALUES (
  '50000000-0000-0000-0000-000000000004',
  'Charlie Test',
  'charlie@demo.local',
  '$2a$10$NTJ3Lr0qVi3vv6uvleNXTOkWNaXPopvkrgMd8vDLZCVmCoZceC8Aq',
  'STUDENT',
  '10000000-0000-0000-0000-000000000001',
  'Charlie', 'Test', true
)
ON CONFLICT (email) DO NOTHING;

-- org.students (Charlie)
INSERT INTO org.students (
  id, user_id, program_id, batch_id, subdivision_id
)
VALUES (
  '60000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002'    -- DevOps subdivision (different from Alice's FS)
)
ON CONFLICT (user_id) DO NOTHING;

-- performance.performance_profiles (Charlie)
INSERT INTO performance.performance_profiles (student_id)
VALUES ('60000000-0000-0000-0000-000000000002')
ON CONFLICT (student_id) DO NOTHING;

-- performance.student_skills — assign COMMUNICATION skills to Charlie
-- (Alice has TECHNICAL skills; Charlie has COMMUNICATION → different gaps, different roadmaps)
INSERT INTO performance.student_skills (student_id, skill_id, source, updated_at)
SELECT
  '60000000-0000-0000-0000-000000000002',
  id,
  'SEED',
  now()
FROM performance.skills
WHERE category = 'COMMUNICATION'
LIMIT 5
ON CONFLICT (student_id, skill_id) DO NOTHING;

-- ── Module 2-style fixtures for Charlie ───────────────────────────────────────

-- assessment.assessment_attempts (Charlie, COMPLETED) — reuses same assessment as Alice
INSERT INTO assessment.assessment_attempts (
  id, assessment_id, student_id, interview_type,
  program_id, batch_id, subdivision_id,
  assessment_version, scoring_version, status, started_at, completed_at
)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  'TECHNICAL',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  1, 'v1.0',
  'COMPLETED',
  now() - interval '3 hours',
  now() - interval '2 hours'
)
ON CONFLICT DO NOTHING;

-- performance.assessment_reports for Charlie
-- Scores: technical=72 (strong), communication=43 (weak), listening=50 (weak)
-- skill_scores: use COMMUNICATION skills with low scores (mostly below 70)
WITH charlie_skills AS (
  SELECT id, row_number() OVER (ORDER BY name) AS rn
  FROM performance.skills
  WHERE category = 'COMMUNICATION' AND is_active = true
  LIMIT 5
),
charlie_skill_scores AS (
  SELECT jsonb_object_agg(
    id::text,
    jsonb_build_object(
      'score',
      CASE rn WHEN 1 THEN 40.0 WHEN 2 THEN 35.0 WHEN 3 THEN 48.0 WHEN 4 THEN 60.0 ELSE 42.0 END,
      'proficiency_level',
      'BEGINNER'
    )
  ) AS scores
  FROM charlie_skills
)
INSERT INTO performance.assessment_reports (
  id, attempt_id, student_id,
  assessment_version, scoring_version,
  technical_score, communication_score, listening_score, overall_score,
  component_scores, skill_scores
)
SELECT
  'a2000000-0000-0000-0000-000000000002'::uuid,
  'a1000000-0000-0000-0000-000000000002'::uuid,
  '60000000-0000-0000-0000-000000000002'::uuid,
  1, 'v1.0',
  72.0, 43.0, 50.0, 55.0,
  '{"TECHNICAL": 72.0, "COMMUNICATION": 43.0, "LISTENING": 50.0}'::jsonb,
  scores
FROM charlie_skill_scores
ON CONFLICT (attempt_id) DO NOTHING;

-- performance.performance_snapshots (Charlie)
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
  '40000000-0000-0000-0000-000000000002'::uuid,
  ar.technical_score, ar.communication_score, ar.listening_score, ar.overall_score,
  ar.component_scores, ar.skill_scores
FROM performance.assessment_reports ar
WHERE ar.id = 'a2000000-0000-0000-0000-000000000002'
  AND NOT EXISTS (
    SELECT 1 FROM performance.performance_snapshots ps
    WHERE ps.student_id = ar.student_id AND ps.attempt_id = ar.attempt_id
  );

-- performance.skill_performances (Charlie — one per COMMUNICATION skill)
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
WHERE ar.id = 'a2000000-0000-0000-0000-000000000002'
  AND NOT EXISTS (
    SELECT 1 FROM performance.skill_performances sp
    WHERE sp.student_id = ar.student_id
      AND sp.skill_id   = (kv.key)::uuid
      AND sp.attempt_id = ar.attempt_id
  );

-- Update Charlie's performance profile with the aggregate from the seeded snapshot
UPDATE performance.performance_profiles
SET overall_score        = 55.0,
    technical_score      = 72.0,
    communication_score  = 43.0,
    listening_score      = 50.0,
    trend                = 'STABLE',
    updated_at           = now()
WHERE student_id = '60000000-0000-0000-0000-000000000002'
  AND overall_score IS NULL;
