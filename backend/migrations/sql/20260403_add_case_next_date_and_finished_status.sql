ALTER TABLE cases
ADD COLUMN IF NOT EXISTS next_date DATE;

UPDATE cases
SET case_step = CASE
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('FINISHED', 'FINISHED_STEP', 'FINISHEDSTEP') THEN 'FINISHED'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('STEP') THEN 'STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP', 'PLAINT_STEP', 'PLAINTSTEP') THEN 'PLAINT_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP') THEN 'ANSWER_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('LW_STEP', 'LWSTEP', 'L_W_STEP', 'L/W_STEP') THEN 'LW_STEP'
  WHEN UPPER(REPLACE(TRIM(COALESCE(case_step, '')), ' ', '_')) IN ('DUDGMENT_STEP', 'DUDGMENTSTEP', 'JUDGMENT_STEP', 'JUDGMENTSTEP') THEN 'DUDGMENT_STEP'
  ELSE 'STEP'
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_case_step_check'
      AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT cases_case_step_check;
  END IF;
END $$;

ALTER TABLE cases
ADD CONSTRAINT cases_case_step_check
CHECK (case_step IN ('STEP', 'PLAINT_STEP', 'ANSWER_STEP', 'LW_STEP', 'DUDGMENT_STEP', 'FINISHED'));
