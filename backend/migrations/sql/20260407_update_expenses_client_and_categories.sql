ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS customer VARCHAR(255);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS client VARCHAR(255);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category VARCHAR(80);

UPDATE expenses
SET customer = COALESCE(NULLIF(TRIM(customer), ''), NULLIF(TRIM(client), ''))
WHERE customer IS NULL OR TRIM(customer) = '';

UPDATE expenses
SET client = COALESCE(NULLIF(TRIM(client), ''), NULLIF(TRIM(customer), ''))
WHERE client IS NULL OR TRIM(client) = '';

UPDATE expenses
SET category = CASE
    WHEN category IS NULL OR TRIM(category) = '' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'repair' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'customer visit' THEN 'Colombo Court Visit'
    WHEN LOWER(TRIM(category)) = 'brekdown' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'breakdown' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'miscellaneous' THEN 'Other'
    WHEN LOWER(TRIM(category)) = 'salary pay' THEN 'Sallary Pay'
    ELSE category
END;

UPDATE expenses
SET category = 'Other'
WHERE category NOT IN (
    'Lawyer Payment',
    'Colombo Court Visit',
    'Outsttion Court Visit',
    'Document Charges',
    'Failing Charges',
    'Personal',
    'Other',
    'Sallary Pay'
);

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_category_allowed_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_category_allowed_check CHECK (
    category IN (
        'Lawyer Payment',
        'Colombo Court Visit',
        'Outsttion Court Visit',
        'Document Charges',
        'Failing Charges',
        'Personal',
        'Other',
        'Sallary Pay'
    )
);
