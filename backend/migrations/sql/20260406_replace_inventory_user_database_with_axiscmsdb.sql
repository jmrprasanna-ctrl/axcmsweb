UPDATE user_accesses
SET user_database = 'axiscmsdb',
    "updatedAt" = NOW()
WHERE LOWER(COALESCE(user_database, '')) = 'inventory';

