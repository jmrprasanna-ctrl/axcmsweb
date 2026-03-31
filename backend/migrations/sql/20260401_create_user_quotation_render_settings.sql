CREATE TABLE IF NOT EXISTS user_quotation_render_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    database_name VARCHAR(120) NOT NULL,
    quotation_type VARCHAR(32) NOT NULL,
    render_visibility_json TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, database_name, quotation_type)
);
