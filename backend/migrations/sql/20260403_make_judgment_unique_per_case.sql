BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS judgments_case_unique_idx
ON judgments(case_id)
WHERE case_id IS NOT NULL;

COMMIT;
