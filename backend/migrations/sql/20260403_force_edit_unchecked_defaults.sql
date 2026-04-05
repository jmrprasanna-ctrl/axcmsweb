UPDATE cases SET edit_enabled = FALSE;
UPDATE plaints SET edit_enabled = FALSE;
UPDATE answers SET edit_enabled = FALSE;
UPDATE witnesses SET edit_enabled = FALSE;
UPDATE judgments SET edit_enabled = FALSE;

ALTER TABLE cases ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE plaints ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE answers ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE witnesses ALTER COLUMN edit_enabled SET DEFAULT FALSE;
ALTER TABLE judgments ALTER COLUMN edit_enabled SET DEFAULT FALSE;
