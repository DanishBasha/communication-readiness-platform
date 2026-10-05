import { db } from '../shared/db/pool';
import { SPECIALIST_TOOLS } from './tools';
import { runAgentLoop, AgentLoopResult } from './agentLoop';

// ── Public types ──────────────────────────────────────────────────────────────

export interface SpecialistTask {
  studentId: string;
  goal: string;
  supervisorRunId: string;
  triggeredByUserId: string | null;
}

export interface WeakSkill {
  skill_id: string;
  name: string;
  category: string;
  avg_score: number | null;
}

export interface SpecialistResult {
  specialistRunId: string;
  performanceProfile: Record<string, unknown> | null;
  recentSnapshots: unknown[];
  weakSkills: WeakSkill[];
  knowledgeDocs: unknown[];
  draftPlan: Record<string, unknown> | null;
  loopResult: AgentLoopResult;
}

// ── Specialist agent ──────────────────────────────────────────────────────────

export async function runSpecialistAgent(
  task: SpecialistTask,
  specDef: { id: string; max_steps: number; max_tool_calls: number; timeout_seconds: number }
): Promise<SpecialistResult> {
  // Create the specialist's own agent_run (linked to supervisor via correlation_id)
  const { rows: runRows } = await db.query(
    `INSERT INTO agent.agent_runs
       (agent_definition_id, student_id, triggered_by_user_id, status,
        goal_snapshot, correlation_id, started_at)
     VALUES ($1,$2,$3,'RUNNING',$4,$5,now())
     RETURNING id`,
    [
      specDef.id,
      task.studentId,
      task.triggeredByUserId,
      task.goal,
      task.supervisorRunId,
    ]
  );
  const specialistRunId: string = runRows[0].id;

  // Specialist receives only its task — not the full request context
  const systemPrompt = [
    'You are a Learning Readiness Specialist Agent.',
    `Goal: ${task.goal}`,
    `Student ID: ${task.studentId}`,
    '',
    'Analyze this student\'s performance and create a personalized learning plan.',
    'Call tools in this order:',
    `1. GetStudentPerformance (studentId: "${task.studentId}")`,
    `2. GetSkillGapAnalysis (studentId: "${task.studentId}")`,
    '3. RetrieveLearningKnowledge (categories from weak skills)',
    '4. DraftLearningPlan (goal, weakSkills, performanceData, knowledgeDocs)',
    'Then respond with a final summary confirming the plan is complete.',
    '',
    `IMPORTANT: Only use studentId "${task.studentId}". Never access other students' data.`,
  ].join('\n');

  const userMessage =
    `Create a learning plan for student ${task.studentId}. Goal: ${task.goal}`;

  const loopResult = await runAgentLoop({
    agentRunId:   specialistRunId,
    studentId:    task.studentId,
    systemPrompt,
    userMessage,
    tools:        SPECIALIST_TOOLS,
    maxSteps:     specDef.max_steps    || 12,
    maxToolCalls: specDef.max_tool_calls || 8,
    timeoutMs:    (specDef.timeout_seconds || 45) * 1000,
  });

  // Compile structured result from tool outputs
  const perfData = loopResult.toolResults['GetStudentPerformance'] as
    | { profile: Record<string, unknown> | null; recentSnapshots: unknown[] }
    | undefined;

  const gapData = loopResult.toolResults['GetSkillGapAnalysis'] as
    | { weakSkills: WeakSkill[] }
    | undefined;

  const knowledgeData = loopResult.toolResults['RetrieveLearningKnowledge'] as
    | { documents: unknown[] }
    | undefined;

  const planData = loopResult.toolResults['DraftLearningPlan'] as
    | Record<string, unknown>
    | undefined;

  const succeeded =
    loopResult.terminationReason === 'NATURAL' && !!planData;

  await db.query(
    `UPDATE agent.agent_runs
     SET status=$2, termination_reason=$3, completed_at=now()
     WHERE id=$1`,
    [
      specialistRunId,
      succeeded ? 'SUCCEEDED' : 'FAILED',
      succeeded ? 'DraftPlanCompleted' : loopResult.terminationReason,
    ]
  );

  return {
    specialistRunId,
    performanceProfile: perfData?.profile          ?? null,
    recentSnapshots:    perfData?.recentSnapshots  ?? [],
    weakSkills:         gapData?.weakSkills        ?? [],
    knowledgeDocs:      knowledgeData?.documents   ?? [],
    draftPlan:          planData                   ?? null,
    loopResult,
  };
}
