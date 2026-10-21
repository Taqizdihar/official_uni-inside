-- Read-only DBeaver evidence. Export each result grid separately and retain securely.
SELECT DATABASE() AS database_name, VERSION() AS mysql_version, CURRENT_TIMESTAMP(3) AS observed_at;
SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version, id;
SELECT version, COUNT(*) AS row_count FROM schema_migrations GROUP BY version ORDER BY version;
