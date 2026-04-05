-- Check DB create privilege status for common roles.
SELECT rolname, rolcreatedb
FROM pg_roles
WHERE rolname IN ('postgres', 'ec2-user', 'axcms-api', 'axcmsapp')
ORDER BY rolname;

-- Example (run manually with the actual API role):
-- ALTER ROLE <api_db_role> CREATEDB;

