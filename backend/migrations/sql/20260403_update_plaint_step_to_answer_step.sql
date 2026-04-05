UPDATE plaints
SET plaint_step = CASE
  WHEN UPPER(REPLACE(TRIM(COALESCE(plaint_step, '')), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP', 'NEXT_STEP', 'NEXTSTEP') THEN 'ANSWER_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(plaint_step, '')), ' ', '_')) = 'STEP' THEN 'STEP'
  ELSE 'STEP'
END;

ALTER TABLE plaints
ALTER COLUMN plaint_step SET DEFAULT 'STEP';

ALTER TABLE plaints
ALTER COLUMN plaint_step SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plaints_plaint_step_check'
      AND conrelid = 'plaints'::regclass
  ) THEN
    ALTER TABLE plaints DROP CONSTRAINT plaints_plaint_step_check;
  END IF;
END $$;

ALTER TABLE plaints
ADD CONSTRAINT plaints_plaint_step_check
CHECK (plaint_step IN ('STEP', 'ANSWER_STEP'));
