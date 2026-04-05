CREATE INDEX IF NOT EXISTS user_accesses_user_lookup_idx
ON user_accesses (user_id, LOWER(COALESCE(user_database, 'axiscmsdb')), "updatedAt" DESC, "createdAt" DESC, id DESC);

