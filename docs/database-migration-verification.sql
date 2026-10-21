-- READ ONLY. Run in DBeaver after reviewed migrations 002-004. Compare
-- account, purchase-link, and variant counts with the preflight results.

SELECT DATABASE() AS database_name, VERSION() AS mysql_version;

SELECT version, name, checksum, applied_at
FROM schema_migrations ORDER BY version;

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'social_platforms' AND COLUMN_NAME IN
          ('id', 'platform_code', 'name', 'icon_key', 'sort_order'))
    OR (TABLE_NAME = 'social_links' AND COLUMN_NAME IN
          ('id', 'platform_code', 'platform_id', 'description', 'url'))
    OR (TABLE_NAME = 'product_purchase_links' AND COLUMN_NAME IN
          ('id', 'url', 'social_link_id'))
    OR (TABLE_NAME = 'product_variants' AND COLUMN_NAME IN ('id', 'media_id')))
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('social_platforms', 'social_links',
                     'product_purchase_links', 'product_variants')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT cols.TABLE_NAME, cols.CONSTRAINT_NAME, cols.COLUMN_NAME,
       cols.REFERENCED_TABLE_NAME, cols.REFERENCED_COLUMN_NAME,
       rules.UPDATE_RULE, rules.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE AS cols
JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rules
  ON rules.CONSTRAINT_SCHEMA = cols.CONSTRAINT_SCHEMA
 AND rules.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
 AND rules.TABLE_NAME = cols.TABLE_NAME
WHERE cols.TABLE_SCHEMA = DATABASE()
  AND cols.CONSTRAINT_NAME IN
      ('fk_social_links_platform', 'fk_product_purchase_links_social_link',
       'fk_product_variants_media')
ORDER BY cols.TABLE_NAME;

SELECT platform.id, platform.platform_code, platform.name, platform.icon_key,
       platform.sort_order, COUNT(account.id) AS account_count
FROM social_platforms AS platform
LEFT JOIN social_links AS account ON account.platform_id = platform.id
GROUP BY platform.id, platform.platform_code, platform.name,
         platform.icon_key, platform.sort_order
ORDER BY platform.sort_order, platform.id;

-- Each result should be zero. A null platform_id in an account imported after
-- migration may indicate a later application write; investigate, do not guess.
SELECT COUNT(*) AS unmapped_account_count
FROM social_links WHERE platform_id IS NULL;

SELECT COUNT(*) AS orphaned_platform_reference_count
FROM social_links AS account
LEFT JOIN social_platforms AS platform ON platform.id = account.platform_id
WHERE account.platform_id IS NOT NULL AND platform.id IS NULL;

SELECT account.id, account.platform_code, platform.platform_code AS mapped_platform
FROM social_links AS account
JOIN social_platforms AS platform ON platform.id = account.platform_id
WHERE NOT (
  (LOWER(account.platform_code) IN ('instagram_studio', 'instagram_craft')
    AND platform.platform_code = 'instagram')
  OR (LOWER(account.platform_code) IN ('tiktok_studio', 'tiktok_craft')
    AND platform.platform_code = 'tiktok')
  OR (LOWER(account.platform_code) = 'linkedin' AND platform.platform_code = 'linkedin')
  OR (LOWER(account.platform_code) = 'whatsapp' AND platform.platform_code = 'whatsapp')
)
ORDER BY account.id;

SELECT platform.platform_code, COUNT(*) AS account_count
FROM social_links AS account
JOIN social_platforms AS platform ON platform.id = account.platform_id
GROUP BY platform.platform_code HAVING COUNT(*) > 5;

SELECT 'social_links' AS table_name, COUNT(*) AS row_count FROM social_links
UNION ALL SELECT 'product_purchase_links', COUNT(*) FROM product_purchase_links
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants;

-- Compare every ID/hash pair to the saved preflight output. These columns
-- should be identical; the new references are intentionally excluded.
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

SELECT COUNT(*) AS orphaned_purchase_account_reference_count
FROM product_purchase_links AS link
LEFT JOIN social_links AS account ON account.id = link.social_link_id
WHERE link.social_link_id IS NOT NULL AND account.id IS NULL;

SELECT COUNT(*) AS orphaned_variant_media_reference_count
FROM product_variants AS variant
LEFT JOIN media_assets AS media ON media.id = variant.media_id
WHERE variant.media_id IS NOT NULL AND media.id IS NULL;

-- Legacy URLs must remain populated, including unmatched WhatsApp links.
SELECT COUNT(*) AS purchase_links_without_url
FROM product_purchase_links WHERE url IS NULL OR TRIM(url) = '';

-- Optional references stay null until Phase 2 explicitly validates and sets
-- them. These counts are informational, not a migration failure.
SELECT COUNT(*) AS unlinked_purchase_links
FROM product_purchase_links WHERE social_link_id IS NULL;
SELECT COUNT(*) AS variants_without_specific_media
FROM product_variants WHERE media_id IS NULL;
