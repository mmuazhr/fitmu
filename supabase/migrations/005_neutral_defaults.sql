-- ============================================================
-- fitmu: Remove personal-stat defaults from profiles
-- Applied on top of 001_init_schema.sql for already-deployed DBs.
-- ============================================================

ALTER TABLE profiles ALTER COLUMN height_cm     DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN current_weight DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN goal_weight    DROP DEFAULT;
