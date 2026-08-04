-- ============================================================
-- fitmu: meal suggestions cache
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_suggestions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL CHECK (mode IN ('cook', 'nearby', 'takeaway')),
  context      TEXT NOT NULL DEFAULT 'any',
  suggestion   JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_suggestions_user ON meal_suggestions (user_id, generated_at DESC);

ALTER TABLE meal_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_suggestions_own" ON meal_suggestions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
