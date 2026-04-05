ALTER TABLE cases
ADD COLUMN IF NOT EXISTS case_step VARCHAR(20);

UPDATE cases
SET case_step = 'STEP'
WHERE case_step IS NULL OR TRIM(case_step) = '';

UPDATE cases
SET case_step = CASE
  WHEN UPPER(REPLACE(TRIM(case_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE cases
ALTER COLUMN case_step SET DEFAULT 'STEP';

ALTER TABLE cases
ALTER COLUMN case_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cases_case_step_check'
      AND conrelid = 'public.cases'::regclass
  ) THEN
    ALTER TABLE cases
    ADD CONSTRAINT cases_case_step_check
    CHECK (case_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cases_case_step_idx ON cases(case_step);
