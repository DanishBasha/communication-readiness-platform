-- Supplementary M3 indexes (table-level indexes already in 016–021)
CREATE INDEX idx_perf_profiles_student   ON performance.performance_profiles (student_id);
CREATE INDEX idx_skill_perf_student      ON performance.skill_performances (student_id);
CREATE INDEX idx_listening_active        ON knowledge.listening_stories (is_active);
