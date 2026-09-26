-- Seed the learning specialist agent definition.
-- The supervisor delegates deep performance analysis to this agent.
-- Uses DBML column names: goal, tools, guardrails, prohibited_actions,
-- termination_conditions, max_steps, max_tool_calls, max_retries, timeout_seconds.
INSERT INTO agent.agent_definitions
  (name, version, goal, tools, guardrails, prohibited_actions, termination_conditions,
   max_steps, max_tool_calls, max_retries, timeout_seconds)
VALUES (
  'learning_specialist_agent',
  1,
  'Analyze student performance in detail, identify skill gaps, retrieve learning resources, and draft a personalized learning plan.',
  '["GetStudentPerformance","GetSkillGapAnalysis","RetrieveLearningKnowledge","DraftLearningPlan"]',
  '{"max_consecutive_tool_calls":4,"require_output_validation":true,"student_scope_enforced":true}',
  '["ModifyScores","ModifyCredits","GrantPermissions","AccessOtherStudentData","ExecuteArbitrarySQL"]',
  '["DraftPlanCompleted","MaxStepsReached","ToolFailure","Timeout","ScopeViolation"]',
  12,
  8,
  3,
  45
)
ON CONFLICT (name, version) DO NOTHING;
