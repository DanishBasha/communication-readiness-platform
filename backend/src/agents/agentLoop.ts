import axios from 'axios';
import { db } from '../shared/db/pool';
import { ToolDefinition, ToolContext, findTool, toLLMToolSpec } from './tools';
import { env } from '../config/env';

// ── Public types ──────────────────────────────────────────────────────────────

export interface AgentLoopConfig {
  agentRunId: string;
  studentId: string;
  systemPrompt: string;
  userMessage: string;
  tools: ToolDefinition[];
  maxSteps: number;
  maxToolCalls: number;
  timeoutMs: number;
}

export type TerminationReason =
  | 'NATURAL'
  | 'MAX_STEPS'
  | 'MAX_TOOL_CALLS'
  | 'TIMEOUT'
  | 'LLM_ERROR'
  | 'SCOPE_VIOLATION';

export interface AgentLoopResult {
  toolResults: Record<string, unknown>;
  stepCount: number;
  toolCallCount: number;
  terminationReason: TerminationReason;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

interface LLMAction {
  type: 'tool_call' | 'final_answer';
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  content?: string;
}

// ── Agent loop ────────────────────────────────────────────────────────────────

export async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult> {
  const { agentRunId, studentId, maxSteps, maxToolCalls, timeoutMs } = config;
  const deadline  = Date.now() + timeoutMs;
  const toolSpecs = config.tools.map(toLLMToolSpec);

  const messages: LLMMessage[] = [
    { role: 'system', content: config.systemPrompt },
    { role: 'user',   content: config.userMessage },
  ];

  const toolResults: Record<string, unknown> = {};
  let seq          = 0;
  let toolCallCount = 0;

  while (true) {
    // ── Hard limits — checked at the top of every iteration ──────────────────
    if (Date.now() > deadline) {
      return { toolResults, stepCount: seq, toolCallCount, terminationReason: 'TIMEOUT' };
    }
    if (seq >= maxSteps) {
      return { toolResults, stepCount: seq, toolCallCount, terminationReason: 'MAX_STEPS' };
    }
    if (toolCallCount >= maxToolCalls) {
      return { toolResults, stepCount: seq, toolCallCount, terminationReason: 'MAX_TOOL_CALLS' };
    }

    // ── Ask the LLM what to do next ───────────────────────────────────────────
    const llmSeq   = ++seq;
    const llmStart = Date.now();
    let action: LLMAction;

    try {
      const resp = await axios.post<LLMAction>(
        `${env.AI_SERVICE_URL}/learning/chat-complete`,
        { messages, tools: toolSpecs },
        { timeout: 30_000 }
      );
      action = resp.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'LLM call failed';
      await insertCompletedStep(
        agentRunId, llmSeq, 'LLM', null,
        { msgCount: messages.length }, null,
        'FAILED', 'LLM_ERROR', msg, Date.now() - llmStart
      );
      return { toolResults, stepCount: seq, toolCallCount, terminationReason: 'LLM_ERROR' };
    }

    const llmMs = Date.now() - llmStart;

    // ── Final answer — natural termination ────────────────────────────────────
    if (action.type === 'final_answer') {
      await insertCompletedStep(
        agentRunId, llmSeq, 'LLM', null,
        { msgCount: messages.length }, { content: action.content ?? '' },
        'COMPLETED', null, null, llmMs
      );
      break;
    }

    // ── Unexpected response ───────────────────────────────────────────────────
    if (action.type !== 'tool_call' || !action.tool_name) {
      await insertCompletedStep(
        agentRunId, llmSeq, 'LLM', null,
        { msgCount: messages.length }, { raw: action },
        'FAILED', 'INVALID_ACTION', 'LLM returned unexpected action type', llmMs
      );
      break;
    }

    // ── LLM decided to call a tool ────────────────────────────────────────────
    await insertCompletedStep(
      agentRunId, llmSeq, 'LLM', action.tool_name,
      { msgCount: messages.length, args: action.tool_args ?? {} },
      { decided: action.tool_name },
      'COMPLETED', null, null, llmMs
    );

    const tool = findTool(config.tools, action.tool_name);
    if (!tool) {
      messages.push({ role: 'assistant', content: `[unknown tool: ${action.tool_name}]` });
      messages.push({ role: 'tool', name: action.tool_name, content: JSON.stringify({ error: 'Tool not found' }) });
      continue;
    }

    // ── Authorization check — in code, never trust the LLM ───────────────────
    if (tool.authorization.requiresStudentScope) {
      const reqId = (action.tool_args as Record<string, unknown> | undefined)?.studentId as string | undefined;
      if (reqId && reqId !== studentId) {
        const toolSeq = ++seq;
        await insertCompletedStep(
          agentRunId, toolSeq, 'TOOL', tool.name,
          action.tool_args ?? {}, null,
          'FAILED', 'SCOPE_VIOLATION', "Cannot access another student's data", 0
        );
        return { toolResults, stepCount: seq, toolCallCount, terminationReason: 'SCOPE_VIOLATION' };
      }
    }

    // ── Execute the tool ──────────────────────────────────────────────────────
    const toolSeq = ++seq;
    toolCallCount++;

    await db.query(
      `INSERT INTO agent.agent_steps
         (agent_run_id, sequence_no, step_type, tool_name, input, status)
       VALUES ($1,$2,'TOOL',$3,$4,'RUNNING')`,
      [agentRunId, toolSeq, tool.name, JSON.stringify(action.tool_args ?? {})]
    );

    const toolStart = Date.now();
    const ctx: ToolContext = { studentId, agentRunId };
    const result = await tool.execute(action.tool_args ?? {}, ctx);
    const toolMs = Date.now() - toolStart;

    if (result.success) {
      await db.query(
        `UPDATE agent.agent_steps
         SET output=$3, status='COMPLETED', duration_ms=$4
         WHERE agent_run_id=$1 AND sequence_no=$2`,
        [agentRunId, toolSeq, JSON.stringify(result.data), toolMs]
      );
      toolResults[tool.name] = result.data;
      messages.push({ role: 'assistant', content: `[called: ${tool.name}]` });
      messages.push({ role: 'tool', name: tool.name, content: JSON.stringify(result.data) });
    } else {
      await db.query(
        `UPDATE agent.agent_steps
         SET status='FAILED', error_code=$3, error_message=$4, duration_ms=$5
         WHERE agent_run_id=$1 AND sequence_no=$2`,
        [
          agentRunId, toolSeq,
          result.errorCode  ?? 'TOOL_ERROR',
          result.errorMessage ?? 'Unknown tool error',
          toolMs,
        ]
      );
      messages.push({ role: 'assistant', content: `[called: ${tool.name}]` });
      messages.push({ role: 'tool', name: tool.name, content: JSON.stringify({ error: result.errorMessage }) });
    }
  }

  return { toolResults, stepCount: seq, toolCallCount, terminationReason: 'NATURAL' };
}

// ── Step persistence helper ───────────────────────────────────────────────────

async function insertCompletedStep(
  runId: string,
  seqNo: number,
  stepType: string,
  toolName: string | null,
  input: unknown,
  output: unknown,
  status: string,
  errorCode: string | null,
  errorMessage: string | null,
  durationMs: number
): Promise<void> {
  await db.query(
    `INSERT INTO agent.agent_steps
       (agent_run_id, sequence_no, step_type, tool_name, input, output,
        status, error_code, error_message, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (agent_run_id, sequence_no) DO NOTHING`,
    [
      runId, seqNo, stepType, toolName,
      JSON.stringify(input ?? null),
      output !== null ? JSON.stringify(output) : null,
      status, errorCode, errorMessage, durationMs,
    ]
  );
}
