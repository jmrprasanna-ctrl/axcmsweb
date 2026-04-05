BEGIN;

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS upload_method VARCHAR(40);

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS uploads_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS finished BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE judgments
SET uploads_json = '[]'::jsonb
WHERE uploads_json IS NULL;

UPDATE judgments
SET finished = FALSE
WHERE finished IS NULL;

COMMIT;
