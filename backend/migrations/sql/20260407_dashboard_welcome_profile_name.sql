DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_name VARCHAR(200);

  UPDATE user_profiles
  SET profile_name = UPPER(TRIM(COALESCE(profile_name, '')))
  WHERE profile_name IS NOT NULL;

  UPDATE user_profiles
  SET profile_name = COALESCE(NULLIF(TRIM(profile_name), ''), 'USER')
  WHERE profile_name IS NULL OR TRIM(profile_name) = '';

  CREATE INDEX IF NOT EXISTS user_profiles_user_id_updated_idx
  ON user_profiles (user_id, "updatedAt" DESC, id DESC);
END $$;
