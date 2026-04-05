BEGIN;

UPDATE judgments
SET finished = CASE
  WHEN TRIM(COALESCE(judgment_text, '')) = '' THEN FALSE
  ELSE TRUE
END;

COMMIT;
