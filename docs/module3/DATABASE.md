# Module 3 — Database Schema

All Module 3 tables live in the `performance` schema. Migrations run in order.

## Migration list

| Migration | Tables created |
|---|---|
| 016_performance_skills.sql | `performance.skills`, `performance.student_skills` |
| 017_performance_profiles_snapshots.sql | `performance.performance_profiles`, `performance.performance_snapshots` |
| 018_skill_performances.sql | `performance.skill_performances` |
| 019_knowledge_tables.sql | `performance.listening_stories`, `performance.knowledge_documents`, `performance.knowledge_chunks` |
| 020_learning_tables.sql | `performance.learning_plans`, `performance.learning_recommendations` |
| 021_agent_tables.sql | `performance.agent_definitions`, `performance.agent_runs`, `performance.agent_steps` |

## Key tables

### performance_profiles
One row per student. Updated by ATTEMPT_COMPLETED running-average calculation.

| Column | Type | Notes |
|---|---|---|
| student_id | UUID PK | FK → users |
| overall_score | NUMERIC | running average |
| technical_score | NUMERIC | running average |
| communication_score | NUMERIC | running average |
| listening_score | NUMERIC | running average |
| previous_overall_score | NUMERIC | snapshot before last update |
| trend | TEXT | STABLE / IMPROVING / DECLINING |
| updated_at | TIMESTAMPTZ | |

### performance_snapshots
Immutable record of each completed attempt. Never updated after INSERT.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| student_id | UUID | FK → users |
| attempt_id | UUID | UNIQUE per student |
| program_id | UUID | |
| batch_id | UUID | |
| subdivision_id | UUID | nullable |
| overall_score | NUMERIC | |
| technical_score | NUMERIC | nullable |
| communication_score | NUMERIC | nullable |
| listening_score | NUMERIC | nullable |
| component_scores | JSONB | from assessment_report |
| skill_scores | JSONB | from assessment_report |
| captured_at | TIMESTAMPTZ | default now() |

### skill_performances
Per-skill score per attempt.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| student_id | UUID | |
| skill_id | UUID | FK → performance.skills |
| attempt_id | UUID | |
| score | NUMERIC | |
| proficiency_level | TEXT | nullable |
| source | TEXT | 'ASSESSMENT' |

### agent_runs
Tracks each agent execution.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| definition_id | UUID | FK → agent_definitions |
| student_id | UUID | scope |
| status | TEXT | QUEUED/RUNNING/SUCCEEDED/FAILED/DEAD |
| metadata | JSONB | goal, programId, etc. |
| result | JSONB | plan output on SUCCEEDED |
| error | TEXT | error message on FAILED |
| created_at / updated_at | TIMESTAMPTZ | |

### learning_plans
One row per successful agent run.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| student_id | UUID | |
| agent_run_id | UUID | FK → agent_runs, UNIQUE |
| goal | TEXT | |
| plan | JSONB | full plan object |
| created_at | TIMESTAMPTZ | |

## Trend calculation

`computeTrend` requires at least 6 snapshots (newest-first):
- `recent3 = avg(scores[0..2])`
- `prev3 = avg(scores[3..5])`
- if `recent3 - prev3 > 5` → IMPROVING
- if `recent3 - prev3 < -5` → DECLINING
- else → STABLE
