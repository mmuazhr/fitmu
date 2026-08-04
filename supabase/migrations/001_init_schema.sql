-- ============================================================
-- fitmu: core schema
-- ============================================================

-- Profiles: user stats and preferences
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT,
  height_cm        NUMERIC NOT NULL,
  current_weight   NUMERIC NOT NULL,
  goal_weight      NUMERIC NOT NULL,
  activity_level   TEXT NOT NULL DEFAULT 'sedentary'
                   CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')),
  dietary_pref     TEXT[] NOT NULL DEFAULT '{}',
  city             TEXT NOT NULL DEFAULT 'Kuala Lumpur',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weight logs: each weigh-in
CREATE TABLE IF NOT EXISTS weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg   NUMERIC NOT NULL,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'watch')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily logs: per-day activity aggregate (one row per user per day)
CREATE TABLE IF NOT EXISTS daily_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  water_ml        INTEGER NOT NULL DEFAULT 0,
  steps           INTEGER NOT NULL DEFAULT 0,
  calories_burned INTEGER NOT NULL DEFAULT 0,
  active_minutes  INTEGER NOT NULL DEFAULT 0,
  standing_hours  INTEGER NOT NULL DEFAULT 0,
  mood            SMALLINT CHECK (mood BETWEEN 1 AND 5),
  energy_level    SMALLINT CHECK (energy_level BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

-- Meal logs: free-text meal entries
CREATE TABLE IF NOT EXISTS meal_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description  TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_suggestion', 'nearby')),
  eaten_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach conversations: chat history with token tracking
CREATE TABLE IF NOT EXISTS coach_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  tokens_used INTEGER,
  model_used  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly plans: AI-generated structured plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  plan_json    JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date  ON daily_logs  (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_conv_user_date  ON coach_conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date   ON meal_logs  (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user     ON weekly_plans (user_id, week_start DESC);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_own" ON profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- weight_logs
CREATE POLICY "weight_logs_own" ON weight_logs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- daily_logs
CREATE POLICY "daily_logs_own" ON daily_logs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- meal_logs
CREATE POLICY "meal_logs_own" ON meal_logs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- coach_conversations
CREATE POLICY "coach_conv_own" ON coach_conversations
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- weekly_plans
CREATE POLICY "weekly_plans_own" ON weekly_plans
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Helper: auto-update profiles.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Helper: token usage summary view
-- ============================================================
CREATE OR REPLACE VIEW token_usage_summary AS
SELECT
  user_id,
  model_used,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                        AS message_count,
  SUM(tokens_used)                AS total_tokens
FROM coach_conversations
WHERE tokens_used IS NOT NULL
GROUP BY user_id, model_used, month
ORDER BY month DESC;
