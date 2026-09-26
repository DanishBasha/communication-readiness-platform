CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON performance.skills
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_perf_profiles_updated_at
  BEFORE UPDATE ON performance.performance_profiles
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_listening_stories_updated_at
  BEFORE UPDATE ON knowledge.listening_stories
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_learning_plans_updated_at
  BEFORE UPDATE ON performance.learning_plans
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_learning_recs_updated_at
  BEFORE UPDATE ON performance.learning_recommendations
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();

CREATE TRIGGER trg_agent_definitions_updated_at
  BEFORE UPDATE ON agent.agent_definitions
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at();
