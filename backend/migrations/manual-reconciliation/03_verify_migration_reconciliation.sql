-- READ ONLY. Run after a separately reviewed ledger registration, if one is
-- eventually approved. No registration has been performed by this delivery.
SELECT DATABASE() AS database_name,version,name,checksum,applied_at
FROM schema_migrations ORDER BY version;
SELECT version,COUNT(*) AS rows_for_version FROM schema_migrations
GROUP BY version HAVING COUNT(*)<>1;
SELECT COUNT(*) AS base_tables FROM information_schema.TABLES
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE';
SELECT CONSTRAINT_TYPE,COUNT(*) AS total
FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
GROUP BY CONSTRAINT_TYPE ORDER BY CONSTRAINT_TYPE;
SELECT COUNT(*) AS unmapped_accounts FROM social_links WHERE platform_id IS NULL;
