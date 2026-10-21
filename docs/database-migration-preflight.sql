-- READ ONLY. Run in DBeaver against the intended Aiven database before any
-- schema changes. Keep raw output with the administrator; share only redacted
-- metadata. No credentials, tokens, or private customer records are selected.

SELECT DATABASE() AS database_name, VERSION() AS mysql_version, @@version_comment AS distribution;

SELECT version, name, checksum, applied_at
FROM schema_migrations ORDER BY version;

SELECT TABLE_NAME, TABLE_TYPE, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE,
       IS_NULLABLE, COLUMN_DEFAULT, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('schema_migrations', 'social_platforms', 'social_links',
                     'product_purchase_links', 'product_variants', 'media_assets')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('social_platforms', 'social_links',
                     'product_purchase_links', 'product_variants', 'media_assets')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT cols.TABLE_NAME, cols.CONSTRAINT_NAME, cols.COLUMN_NAME,
       cols.REFERENCED_TABLE_NAME, cols.REFERENCED_COLUMN_NAME,
       rules.UPDATE_RULE, rules.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE AS cols
LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rules
  ON rules.CONSTRAINT_SCHEMA = cols.CONSTRAINT_SCHEMA
 AND rules.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
 AND rules.TABLE_NAME = cols.TABLE_NAME
WHERE cols.TABLE_SCHEMA = DATABASE()
  AND cols.TABLE_NAME IN ('social_links', 'product_purchase_links', 'product_variants')
  AND cols.REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY cols.TABLE_NAME, cols.CONSTRAINT_NAME;

-- Record these counts in the change ticket to compare after migration.
SELECT 'social_links' AS table_name, COUNT(*) AS row_count FROM social_links
UNION ALL SELECT 'product_purchase_links', COUNT(*) FROM product_purchase_links
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants;

-- Account metadata only. Inspect URLs inside DBeaver if a mapping requires it.
SELECT id, platform_code, label, icon_key, is_active, sort_order
FROM social_links ORDER BY id;

-- Save these fingerprints locally and compare by ID after migration. The URL
-- participates in each hash but is not exposed in this result.
SELECT id, SHA2(CAST(JSON_OBJECT(
  'platform_code', platform_code, 'label', label, 'url', url,
  'icon_key', icon_key, 'is_active', is_active, 'sort_order', sort_order,
  'created_at', created_at, 'updated_at', updated_at) AS CHAR), 256) AS legacy_row_hash
FROM social_links ORDER BY id;

SELECT id, SHA2(CAST(JSON_OBJECT(
  'product_id', product_id, 'store_name', store_name, 'button_label', button_label,
  'url', url, 'is_primary', is_primary, 'is_active', is_active,
  'sort_order', sort_order, 'created_at', created_at, 'updated_at', updated_at
) AS CHAR), 256) AS legacy_row_hash
FROM product_purchase_links ORDER BY id;

SELECT id, SHA2(CAST(JSON_OBJECT(
  'product_id', product_id, 'name', name, 'sku', sku,
  'price_adjustment', price_adjustment, 'stock_quantity', stock_quantity,
  'is_active', is_active, 'sort_order', sort_order,
  'created_at', created_at, 'updated_at', updated_at
) AS CHAR), 256) AS legacy_row_hash
FROM product_variants ORDER BY id;

-- Any row here blocks migration 002 until its code is explicitly mapped.
SELECT id, platform_code
FROM social_links
WHERE LOWER(platform_code) NOT IN
  ('instagram_studio', 'instagram_craft', 'tiktok_studio', 'tiktok_craft',
   'linkedin', 'whatsapp')
ORDER BY id;

-- Existing unique platform_code prevents duplicate codes, but repeated URLs
-- may represent duplicate accounts. Review hashes locally, not raw URLs.
SELECT SHA2(LOWER(TRIM(url)), 256) AS url_hash, COUNT(*) AS account_count,
       GROUP_CONCAT(id ORDER BY id) AS account_ids
FROM social_links
GROUP BY SHA2(LOWER(TRIM(url)), 256)
HAVING COUNT(*) > 1;

SELECT id, platform_code
FROM social_links
WHERE url IS NULL OR TRIM(url) = '' OR LOWER(url) NOT REGEXP '^https?://'
ORDER BY id;

-- Future five-account cap; excess accounts are reported, never removed.
SELECT CASE
         WHEN LOWER(platform_code) IN ('instagram_studio', 'instagram_craft') THEN 'instagram'
         WHEN LOWER(platform_code) IN ('tiktok_studio', 'tiktok_craft') THEN 'tiktok'
         WHEN LOWER(platform_code) = 'linkedin' THEN 'linkedin'
         WHEN LOWER(platform_code) = 'whatsapp' THEN 'whatsapp'
         ELSE 'UNMAPPED'
       END AS proposed_platform, COUNT(*) AS account_count
FROM social_links
GROUP BY proposed_platform
HAVING COUNT(*) > 5 OR proposed_platform = 'UNMAPPED';

-- Legacy WhatsApp purchase links: IDs and URL hashes only. Exact URL matches
-- are candidates for review, not authorization for an automatic backfill.
SELECT link.id AS purchase_link_id, link.product_id, link.store_name,
       SHA2(LOWER(TRIM(link.url)), 256) AS purchase_url_hash,
       COUNT(account.id) AS exact_active_whatsapp_matches,
       GROUP_CONCAT(account.id ORDER BY account.id) AS candidate_account_ids
FROM product_purchase_links AS link
LEFT JOIN social_links AS account
  ON LOWER(account.platform_code) = 'whatsapp'
 AND account.is_active = 1
 AND LOWER(TRIM(account.url)) = LOWER(TRIM(link.url))
WHERE LOWER(link.store_name) LIKE '%whatsapp%'
   OR LOWER(link.url) REGEXP '^https?://(www\\.)?(wa\\.me|api\\.whatsapp\\.com|web\\.whatsapp\\.com)/'
GROUP BY link.id, link.product_id, link.store_name, link.url
ORDER BY link.id;

SELECT COUNT(*) AS variant_count FROM product_variants;

-- Check this result before interpreting any matching checksum as authoritative.
SELECT COUNT(*) AS migration_001_row_count
FROM schema_migrations WHERE version = '001';
