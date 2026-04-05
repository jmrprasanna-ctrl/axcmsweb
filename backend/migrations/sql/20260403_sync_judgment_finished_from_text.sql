BEGIN;

UPDATE judgments
SET finished = CASE
  WHEN COALESCE(array_length(regexp_split_to_array(TRIM(COALESCE(judgment_text, '')), E'\\s+'), 1), 0) > 0 THEN TRUE
  ELSE FALSE
END;

COMMIT;
