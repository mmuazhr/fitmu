-- ============================================================
-- fitmu: User-scoped AI workout templates
-- Adds nullable user_id so:
--   user_id IS NULL  → global / curated template (visible to all)
--   user_id = <uid>  → user's own AI-generated template (private)
-- ============================================================

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workout_templates_user
  ON workout_templates (user_id);

-- ============================================================
-- Row-Level Security
-- Previously workout_templates had no RLS.
-- After this migration:
--   SELECT  — global (user_id IS NULL) OR own rows
--   INSERT  — own rows only (edge functions use service role, bypass RLS)
--   UPDATE  — own rows only
--   DELETE  — own rows only
-- ============================================================
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_templates_select" ON workout_templates
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "workout_templates_insert_own" ON workout_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "workout_templates_update_own" ON workout_templates
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "workout_templates_delete_own" ON workout_templates
  FOR DELETE USING (user_id = auth.uid());
