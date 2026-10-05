import { db } from '../shared/db/pool';
import { env } from '../config/env';
import axios from 'axios';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ToolContext {
  studentId: string;
  agentRunId: string;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  errorCode?: string;
  errorMessage?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  authorization: {
    readOnly: boolean;
    requiresStudentScope: boolean;
  };
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

// ── Tool: GetStudentPerformance ───────────────────────────────────────────────
// READ ONLY — queries performance_profiles + performance_snapshots.

export const getStudentPerformanceTool: ToolDefinition = {
  name: 'GetStudentPerformance',
  description:
    "Retrieve the student's current performance profile (technical, communication, listening scores) " +
    'and the five most recent assessment snapshots.',
  inputSchema: {
    type: 'object',
    properties: {
      studentId: { type: 'string', description: 'UUID of the student' },
    },
    required: ['studentId'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      profile: { type: ['object', 'null'] },
      recentSnapshots: { type: 'array' },
    },
    required: ['profile', 'recentSnapshots'],
  },
  authorization: { readOnly: true, requiresStudentScope: true },

  async execute(args, ctx): Promise<ToolResult> {
    const studentId = args.studentId as string;
    if (studentId !== ctx.studentId) {
      return {
        success: false,
        data: null,
        errorCode: 'SCOPE_VIOLATION',
        errorMessage: "Cannot access another student's data",
      };
    }
    try {
      const { rows: profileRows } = await db.query(
        `SELECT technical_score, communication_score, listening_score,
                overall_score, trend, updated_at
         FROM performance.performance_profiles WHERE student_id = $1`,
        [studentId]
      );
      const { rows: snapRows } = await db.query(
        `SELECT overall_score, captured_at
         FROM performance.performance_snapshots
         WHERE student_id = $1 ORDER BY captured_at DESC LIMIT 5`,
        [studentId]
      );
      return {
        success: true,
        data: { profile: profileRows[0] ?? null, recentSnapshots: snapRows },
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        errorCode: 'DB_ERROR',
        errorMessage: e instanceof Error ? e.message : String(e),
      };
    }
  },
};

// ── Tool: GetSkillGapAnalysis ─────────────────────────────────────────────────
// READ ONLY — identifies weak skills (avg score < 70).

export const getSkillGapAnalysisTool: ToolDefinition = {
  name: 'GetSkillGapAnalysis',
  description:
    "Identify the student's weak skills (average score below 70) ranked by score ascending. " +
    'Returns skill_id, name, category, avg_score.',
  inputSchema: {
    type: 'object',
    properties: {
      studentId: { type: 'string', description: 'UUID of the student' },
    },
    required: ['studentId'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      weakSkills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skill_id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            avg_score: { type: 'number' },
          },
        },
      },
    },
    required: ['weakSkills'],
  },
  authorization: { readOnly: true, requiresStudentScope: true },

  async execute(args, ctx): Promise<ToolResult> {
    const studentId = args.studentId as string;
    if (studentId !== ctx.studentId) {
      return {
        success: false,
        data: null,
        errorCode: 'SCOPE_VIOLATION',
        errorMessage: "Cannot access another student's data",
      };
    }
    try {
      const { rows } = await db.query(
        `SELECT sp.skill_id, sk.name, sk.category,
                AVG(sp.score) AS avg_score, MAX(sp.measured_at) AS last_measured
         FROM performance.skill_performances sp
         JOIN performance.skills sk ON sk.id = sp.skill_id
         WHERE sp.student_id = $1
         GROUP BY sp.skill_id, sk.name, sk.category
         HAVING AVG(sp.score) < 70 OR AVG(sp.score) IS NULL
         ORDER BY avg_score ASC NULLS FIRST`,
        [studentId]
      );
      return { success: true, data: { weakSkills: rows } };
    } catch (e) {
      return {
        success: false,
        data: null,
        errorCode: 'DB_ERROR',
        errorMessage: e instanceof Error ? e.message : String(e),
      };
    }
  },
};

// ── Tool: RetrieveLearningKnowledge ───────────────────────────────────────────
// READ ONLY — returns public knowledge documents with their first chunk excerpt.

export const retrieveLearningKnowledgeTool: ToolDefinition = {
  name: 'RetrieveLearningKnowledge',
  description:
    'Retrieve public knowledge documents with their first chunk as an excerpt. ' +
    'Pass categories from the skill gap analysis to contextualise the retrieval.',
  inputSchema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Skill categories (e.g. ["TECHNICAL", "COMMUNICATION"])',
      },
    },
    required: ['categories'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      documents: { type: 'array' },
    },
    required: ['documents'],
  },
  authorization: { readOnly: true, requiresStudentScope: false },

  async execute(args, _ctx): Promise<ToolResult> {
    const categories = args.categories as string[];
    try {
      if (!categories || categories.length === 0) {
        return { success: true, data: { documents: [] } };
      }
      // knowledge_documents has no category column — return public docs ordered by date.
      const { rows } = await db.query(
        `SELECT kd.id, kd.title, kd.source_type, kd.visibility_type,
                kc.chunk_text AS excerpt
         FROM knowledge.knowledge_documents kd
         LEFT JOIN knowledge.knowledge_chunks kc
               ON kc.document_id = kd.id AND kc.chunk_index = 0
         WHERE kd.visibility_type = 'PUBLIC'
         ORDER BY kd.created_at DESC LIMIT 10`
      );
      return { success: true, data: { documents: rows } };
    } catch (e) {
      return {
        success: false,
        data: null,
        errorCode: 'DB_ERROR',
        errorMessage: e instanceof Error ? e.message : String(e),
      };
    }
  },
};

// ── Tool: DraftLearningPlan ───────────────────────────────────────────────────
// Controlled — calls the AI service; does NOT persist the plan.
// Persistence is the supervisor's responsibility after validation.

export const draftLearningPlanTool: ToolDefinition = {
  name: 'DraftLearningPlan',
  description:
    'Call the AI service to generate a personalized learning plan draft. ' +
    'Does NOT persist the plan — the supervisor validates and persists it.',
  inputSchema: {
    type: 'object',
    properties: {
      goal:            { type: 'string', description: "The student's learning goal" },
      weakSkills:      { type: 'array', items: { type: 'string' }, description: 'Weak skill names' },
      performanceData: { type: ['object', 'null'], description: 'Performance profile data' },
      knowledgeDocs:   { type: 'array', description: 'Relevant knowledge documents' },
      durationWeeks:   { type: 'number', description: 'Plan duration in weeks (default 4)' },
    },
    required: ['goal'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      goal:          { type: 'string' },
      durationWeeks: { type: 'number' },
      focusSkills:   { type: 'array' },
      weeklyPlan:    { type: 'array' },
    },
    required: ['goal', 'durationWeeks', 'focusSkills', 'weeklyPlan'],
  },
  authorization: { readOnly: false, requiresStudentScope: false },

  async execute(args, _ctx): Promise<ToolResult> {
    const goal            = args.goal as string;
    const weakSkills      = (args.weakSkills as string[] | undefined) ?? [];
    const performanceData = (args.performanceData as Record<string, unknown> | null) ?? null;
    const knowledgeDocs   = (args.knowledgeDocs as unknown[] | undefined) ?? [];
    const durationWeeks   = (args.durationWeeks as number | undefined) ?? 4;

    try {
      const resp = await axios.post(
        `${env.AI_SERVICE_URL}/learning/draft-plan`,
        {
          goal,
          duration_weeks:    durationWeeks,
          focus_skills:      weakSkills,
          performance_data:  performanceData ?? {},
          knowledge_context: knowledgeDocs,
        },
        { timeout: 30_000 }
      );
      return { success: true, data: resp.data };
    } catch {
      // Deterministic fallback — never fabricate scores
      const fallback = {
        goal,
        durationWeeks,
        focusSkills: weakSkills.slice(0, 3),
        weeklyPlan: weakSkills.slice(0, 4).map((skill, i) => ({
          week:       i + 1,
          focus:      skill,
          activities: [`Study ${skill} fundamentals`, `Practice ${skill} exercises`],
        })),
      };
      return { success: true, data: fallback };
    }
  },
};

// ── Tool registries ───────────────────────────────────────────────────────────

/** The four tools available exclusively to the Learning Specialist. */
export const SPECIALIST_TOOLS: ToolDefinition[] = [
  getStudentPerformanceTool,
  getSkillGapAnalysisTool,
  retrieveLearningKnowledgeTool,
  draftLearningPlanTool,
];

// ── Utility helpers ───────────────────────────────────────────────────────────

export function findTool(
  tools: ToolDefinition[],
  name: string
): ToolDefinition | undefined {
  return tools.find(t => t.name === name);
}

/** Convert a ToolDefinition to the OpenAI function-calling format for LLM consumption. */
export function toLLMToolSpec(tool: ToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name:        tool.name,
      description: tool.description,
      parameters:  tool.inputSchema,
    },
  };
}
