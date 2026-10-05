-- Increase learning_specialist_agent timeout from 45 s to 150 s.
--
-- Root cause: under concurrent load the specialist must make 5-6 Groq LLM calls
-- (one per tool decision) each taking 8-15 s, totalling 50-80 s before
-- DraftLearningPlan is even reached.  The 45 s budget was too tight and caused
-- Charlie's run to TIMEOUT before the workflow could complete.
UPDATE agent.agent_definitions
SET timeout_seconds = 150
WHERE name = 'learning_specialist_agent';
