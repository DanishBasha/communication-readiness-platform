-- Seed the learning readiness agent using DBML column names:
-- goal (not goal_template), tools (not allowed_tools), timeout_seconds (not timeout_ms).
INSERT INTO agent.agent_definitions
  (name, version, goal, tools, guardrails, prohibited_actions, termination_conditions,
   max_steps, max_tool_calls, max_retries, timeout_seconds)
VALUES (
  'learning_readiness_agent',
  1,
  'Analyze student performance, identify skill gaps, retrieve learning knowledge, and generate a personalized learning plan.',
  '["GetStudentPerformance","GetSkillGapAnalysis","RetrieveLearningKnowledge","DraftLearningPlan"]',
  '{"max_consecutive_tool_calls":4,"require_output_validation":true}',
  '["ModifyScores","ModifyCredits","GrantPermissions","AccessOtherStudentData","ExecuteArbitrarySQL"]',
  '["LearningPlanPersisted","MaxStepsReached","ToolFailure","Timeout"]',
  10,
  20,
  3,
  60
)
ON CONFLICT (name, version) DO NOTHING;
