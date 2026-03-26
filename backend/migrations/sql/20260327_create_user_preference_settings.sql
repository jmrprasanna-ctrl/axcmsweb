CREATE TABLE IF NOT EXISTS user_preference_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    logo_path VARCHAR(500),
    invoice_template_pdf_path VARCHAR(500),
    quotation_template_pdf_path VARCHAR(500),
    quotation2_template_pdf_path VARCHAR(500),
    quotation3_template_pdf_path VARCHAR(500),
    sign_c_path VARCHAR(500),
    sign_v_path VARCHAR(500),
    seal_c_path VARCHAR(500),
    seal_v_path VARCHAR(500),
    primary_color VARCHAR(24),
    background_color VARCHAR(24),
    button_color VARCHAR(24),
    mode_theme VARCHAR(16),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

