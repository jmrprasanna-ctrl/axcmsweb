DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'cases'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(case_no)%'
  LOOP
    EXECUTE format('ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END$$;
