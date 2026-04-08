ALTER TABLE user_invoice_mappings
DROP COLUMN IF EXISTS quotation_enabled,
DROP COLUMN IF EXISTS quotation2_enabled,
DROP COLUMN IF EXISTS quotation3_enabled,
DROP COLUMN IF EXISTS sign_v_enabled,
DROP COLUMN IF EXISTS seal_v_enabled,
DROP COLUMN IF EXISTS sign_q2_enabled,
DROP COLUMN IF EXISTS seal_q2_enabled,
DROP COLUMN IF EXISTS sign_q3_enabled,
DROP COLUMN IF EXISTS seal_q3_enabled;
