-- ============================================================
-- fitmu: AI usage tracking for per-function rate limiting
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compound index for the per-user per-function 24-hour window query
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_fn_date
  ON ai_usage (user_id, function_name, created_at DESC);

-- ============================================================
-- Row-Level Security
-- Users can only read their own rows.
-- Inserts happen inside edge functions via the service role,
-- which bypasses RLS, so no INSERT policy is needed.
-- ============================================================
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_select_own" ON ai_usage
  FOR SELECT USING (user_id = auth.uid());
