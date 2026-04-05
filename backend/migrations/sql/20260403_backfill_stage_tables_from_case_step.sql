-- Backfill stage tables from existing case_step values so list pages reflect case progression.

INSERT INTO plaints (
  plaint_date,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  plaint_step,
  comment,
  upload_method,
  uploads_json,
  answer,
  witness_list,
  dudgement,
  finished,
  edit_enabled,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS plaint_date,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  'STEP' AS plaint_step,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  NULL AS answer,
  NULL AS witness_list,
  NULL AS dudgement,
  FALSE AS finished,
  FALSE AS edit_enabled,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('PLAINT_STEP', 'PLAINTSTEP', 'NEXT_STEP', 'NEXTSTEP')
  AND NOT EXISTS (
    SELECT 1
    FROM plaints p
    WHERE p.case_id = c.id
  );

INSERT INTO answers (
  answer_date,
  plaint_id,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  answer_step,
  comment,
  upload_method,
  uploads_json,
  edit_enabled,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS answer_date,
  NULL AS plaint_id,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  'STEP' AS answer_step,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  FALSE AS edit_enabled,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('ANSWER_STEP', 'ANSWERSTEP')
  AND NOT EXISTS (
    SELECT 1
    FROM answers a
    WHERE a.case_id = c.id
  );

INSERT INTO witnesses (
  witness_date,
  answer_id,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  witness_step,
  witness_list,
  comment,
  upload_method,
  uploads_json,
  edit_enabled,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS witness_date,
  (
    SELECT a.id
    FROM answers a
    WHERE a.case_id = c.id
    ORDER BY a.answer_date DESC, a.id DESC
    LIMIT 1
  ) AS answer_id,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  'STEP' AS witness_step,
  NULL AS witness_list,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  FALSE AS edit_enabled,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('LW_STEP', 'LWSTEP', 'L_W_STEP')
  AND NOT EXISTS (
    SELECT 1
    FROM witnesses w
    WHERE w.case_id = c.id
  );

INSERT INTO judgments (
  judgment_date,
  case_id,
  customer_id,
  customer_name,
  case_no,
  court,
  attend_lawyer,
  judgment_text,
  comment,
  upload_method,
  uploads_json,
  edit_enabled,
  finished,
  "createdAt",
  "updatedAt"
)
SELECT
  COALESCE(c.case_date, CURRENT_DATE) AS judgment_date,
  c.id AS case_id,
  c.customer_id,
  c.customer_name,
  c.case_no,
  c.court,
  c.attend_lawyer,
  NULL AS judgment_text,
  c.comment,
  c.upload_method,
  COALESCE(c.uploads_json, '[]'::jsonb) AS uploads_json,
  FALSE AS edit_enabled,
  FALSE AS finished,
  NOW(),
  NOW()
FROM cases c
WHERE UPPER(REPLACE(TRIM(COALESCE(c.case_step, '')), ' ', '_')) IN ('DUDGMENT_STEP', 'DUDGMENTSTEP', 'JUDGMENT_STEP', 'JUDGMENTSTEP')
  AND NOT EXISTS (
    SELECT 1
    FROM judgments j
    WHERE j.case_id = c.id
  );
