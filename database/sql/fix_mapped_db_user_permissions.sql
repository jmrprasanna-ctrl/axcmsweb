-- Run this in each mapped business database (example: mblegaldb)
-- using the database owner or a superuser.
-- Replace <app_db_user> with the runtime DB user from backend/.env (DB_USER).

GRANT USAGE ON SCHEMA public TO <app_db_user>;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO <app_db_user>;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO <app_db_user>;

-- Optional broader grants if your app needs full access to all business tables:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <app_db_user>;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <app_db_user>;

