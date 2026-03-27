ALTER TABLE rental_machine_counts
ADD COLUMN IF NOT EXISTS entry_date DATE;

ALTER TABLE rental_machine_counts
ALTER COLUMN entry_date SET DEFAULT CURRENT_DATE;

UPDATE rental_machine_counts
SET entry_date = COALESCE(entry_date, DATE("createdAt"), CURRENT_DATE)
WHERE entry_date IS NULL;

CREATE INDEX IF NOT EXISTS rental_machine_counts_entry_date_idx
ON rental_machine_counts(entry_date);

ALTER TABLE rental_machine_consumables
ADD COLUMN IF NOT EXISTS entry_date DATE;

ALTER TABLE rental_machine_consumables
ALTER COLUMN entry_date SET DEFAULT CURRENT_DATE;

UPDATE rental_machine_consumables
SET entry_date = COALESCE(entry_date, DATE("createdAt"), CURRENT_DATE)
WHERE entry_date IS NULL;

CREATE INDEX IF NOT EXISTS rental_machine_consumables_entry_date_idx
ON rental_machine_consumables(entry_date);
