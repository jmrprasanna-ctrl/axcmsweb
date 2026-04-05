CREATE INDEX IF NOT EXISTS user_profiles_user_id_updated_idx
ON user_profiles (user_id, "updatedAt" DESC, id DESC);

