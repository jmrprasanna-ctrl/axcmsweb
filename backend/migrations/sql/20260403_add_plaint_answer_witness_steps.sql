ALTER TABLE plaints
ADD COLUMN IF NOT EXISTS plaint_step VARCHAR(20);

UPDATE plaints
SET plaint_step = 'STEP'
WHERE plaint_step IS NULL OR TRIM(plaint_step) = '';

UPDATE plaints
SET plaint_step = CASE
  WHEN UPPER(REPLACE(TRIM(plaint_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE plaints
ALTER COLUMN plaint_step SET DEFAULT 'STEP';

ALTER TABLE plaints
ALTER COLUMN plaint_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plaints_plaint_step_check'
      AND conrelid = 'public.plaints'::regclass
  ) THEN
    ALTER TABLE plaints
    ADD CONSTRAINT plaints_plaint_step_check
    CHECK (plaint_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plaints_plaint_step_idx ON plaints(plaint_step);

ALTER TABLE answers
ADD COLUMN IF NOT EXISTS answer_step VARCHAR(20);

UPDATE answers
SET answer_step = 'STEP'
WHERE answer_step IS NULL OR TRIM(answer_step) = '';

UPDATE answers
SET answer_step = CASE
  WHEN UPPER(REPLACE(TRIM(answer_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE answers
ALTER COLUMN answer_step SET DEFAULT 'STEP';

ALTER TABLE answers
ALTER COLUMN answer_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'answers_answer_step_check'
      AND conrelid = 'public.answers'::regclass
  ) THEN
    ALTER TABLE answers
    ADD CONSTRAINT answers_answer_step_check
    CHECK (answer_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS answers_answer_step_idx ON answers(answer_step);

ALTER TABLE witnesses
ADD COLUMN IF NOT EXISTS witness_step VARCHAR(20);

UPDATE witnesses
SET witness_step = 'STEP'
WHERE witness_step IS NULL OR TRIM(witness_step) = '';

UPDATE witnesses
SET witness_step = CASE
  WHEN UPPER(REPLACE(TRIM(witness_step), ' ', '_')) IN ('NEXT_STEP', 'NEXTSTEP') THEN 'NEXT_STEP'
  ELSE 'STEP'
END;

ALTER TABLE witnesses
ALTER COLUMN witness_step SET DEFAULT 'STEP';

ALTER TABLE witnesses
ALTER COLUMN witness_step SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'witnesses_witness_step_check'
      AND conrelid = 'public.witnesses'::regclass
  ) THEN
    ALTER TABLE witnesses
    ADD CONSTRAINT witnesses_witness_step_check
    CHECK (witness_step IN ('STEP', 'NEXT_STEP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS witnesses_witness_step_idx ON witnesses(witness_step);
