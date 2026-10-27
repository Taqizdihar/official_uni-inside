-- READ ONLY. Execute as a DBeaver SQL script against the intended Aiven database.
-- Export the result grids for owner review. Stop before direct table queries if
-- either of the first two grids reports a missing table or required column.
-- This does not activate any feature, reconcile migration checksums, or change data.
SELECT DATABASE() AS database_name, VERSION() AS mysql_version, UTC_TIMESTAMP() AS checked_at_utc;

SELECT expected.table_name,
       EXISTS(SELECT 1 FROM information_schema.TABLES t WHERE t.TABLE_SCHEMA=DATABASE()
              AND t.TABLE_NAME=expected.table_name AND t.TABLE_TYPE='BASE TABLE') AS present
FROM JSON_TABLE('["secondary_page_content_slots","page_settings","media_assets","social_platforms","social_links","product_purchase_links","product_variants","homepage_news_settings","homepage_news_article_placements","contact_social_placements","footer_social_placements","about_settings","about_workspace_tags","about_mission_points","about_collaborator_types","hero_settings","contact_section_settings","site_settings","schema_migrations"]','$[*]'
 COLUMNS(table_name VARCHAR(80) PATH '$')) AS expected
ORDER BY expected.table_name;

SELECT expected.table_name,expected.column_name,
       c.COLUMN_NAME IS NOT NULL AS present,c.COLUMN_TYPE,c.IS_NULLABLE
FROM JSON_TABLE('[{"table":"hero_settings","column":"heading_line_3"},{"table":"about_settings","column":"intro_highlight"},{"table":"about_settings","column":"ecosystem_eyebrow"},{"table":"about_settings","column":"ecosystem_description"},{"table":"about_settings","column":"vision_mission_eyebrow"},{"table":"about_settings","column":"vision_heading"},{"table":"about_settings","column":"vision_description"},{"table":"about_settings","column":"mission_heading"},{"table":"about_settings","column":"guides_eyebrow"},{"table":"about_settings","column":"clients_eyebrow"},{"table":"about_settings","column":"clients_heading"},{"table":"about_settings","column":"clients_description"},{"table":"contact_section_settings","column":"craft_url"},{"table":"site_settings","column":"google_maps_embed_url"},{"table":"social_links","column":"platform_id"},{"table":"social_links","column":"description"},{"table":"product_purchase_links","column":"social_link_id"},{"table":"product_variants","column":"media_id"}]','$[*]'
 COLUMNS(table_name VARCHAR(80) PATH '$.table',column_name VARCHAR(80) PATH '$.column')) AS expected
LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=DATABASE()
 AND c.TABLE_NAME=expected.table_name AND c.COLUMN_NAME=expected.column_name
ORDER BY expected.table_name,expected.column_name;

-- Confirm secondary slot types, nullable media/text columns, and expected widths.
SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,CHARACTER_MAXIMUM_LENGTH,COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='secondary_page_content_slots'
ORDER BY ORDINAL_POSITION;

-- Confirm primary key, all three foreign keys, the (page_settings_id,slot_key)
-- unique key, and the text/mode/media CHECK constraint clauses.
SELECT c.CONSTRAINT_NAME,c.CONSTRAINT_TYPE,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,
       k.REFERENCED_COLUMN_NAME,ck.CHECK_CLAUSE
FROM information_schema.TABLE_CONSTRAINTS AS c
LEFT JOIN information_schema.KEY_COLUMN_USAGE AS k
 ON k.CONSTRAINT_SCHEMA=c.CONSTRAINT_SCHEMA AND k.TABLE_NAME=c.TABLE_NAME
 AND k.CONSTRAINT_NAME=c.CONSTRAINT_NAME
LEFT JOIN information_schema.CHECK_CONSTRAINTS AS ck
 ON ck.CONSTRAINT_SCHEMA=c.CONSTRAINT_SCHEMA AND ck.CONSTRAINT_NAME=c.CONSTRAINT_NAME
WHERE c.CONSTRAINT_SCHEMA=DATABASE() AND c.TABLE_NAME='secondary_page_content_slots'
ORDER BY c.CONSTRAINT_TYPE,c.CONSTRAINT_NAME,k.ORDINAL_POSITION;

SELECT INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_in_index
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='secondary_page_content_slots'
GROUP BY INDEX_NAME,NON_UNIQUE ORDER BY INDEX_NAME;

-- Exactly products, services, news, and media_kit are expected. Projects is not approved.
SELECT page_key,id FROM page_settings ORDER BY page_key;
SELECT page_key,COUNT(*) AS rows_for_key FROM page_settings GROUP BY page_key ORDER BY page_key;

-- Empty text slots are allowed before editors first save. Do not backfill example copy.
SELECT p.page_key,s.slot_key,s.value_type,COUNT(*) AS row_count,
       SUM(s.text_value IS NULL) AS null_text_count,
       SUM(s.media_id IS NULL) AS null_media_count
FROM secondary_page_content_slots s JOIN page_settings p ON p.id=s.page_settings_id
GROUP BY p.page_key,s.slot_key,s.value_type ORDER BY p.page_key,s.slot_key;

-- Any result row needs review before SECONDARY_CONTENT_SLOTS_ENABLED=true.
SELECT p.page_key,s.slot_key,s.value_type,s.id
FROM secondary_page_content_slots s JOIN page_settings p ON p.id=s.page_settings_id
WHERE (s.value_type='media' AND (s.media_id IS NULL OR s.text_value IS NOT NULL))
   OR (s.value_type IN ('text','mode') AND (s.text_value IS NULL OR s.media_id IS NOT NULL))
   OR (s.slot_key='banner_mode' AND (p.page_key<>'products' OR s.value_type<>'mode' OR s.text_value NOT IN ('automatic','manual')))
   OR (s.slot_key='banner_media_id' AND (p.page_key<>'products' OR s.value_type<>'media'));

-- A manual banner must point to an existing non-deleted image in the configured
-- Cloudinary root's lanjutan or projects folder (including descendants).
-- Compare folder_path to Render's
-- CLOUDINARY_ROOT_FOLDER; the default root is uni-inside.
SELECT p.page_key,mode.text_value AS banner_mode,media.media_id,
       asset.resource_type,asset.format,asset.folder_path,
       asset.deleted_at IS NOT NULL AS asset_deleted
FROM page_settings p
LEFT JOIN secondary_page_content_slots mode ON mode.page_settings_id=p.id AND mode.slot_key='banner_mode'
LEFT JOIN secondary_page_content_slots media ON media.page_settings_id=p.id AND media.slot_key='banner_media_id'
LEFT JOIN media_assets asset ON asset.id=media.media_id
WHERE p.page_key='products';

-- Read-only V2 reference and seed summary. Zero About mission points is a
-- backfill blocker; zero slot text rows is not.
SELECT
 (SELECT COUNT(*) FROM social_platforms) AS social_platform_count,
 (SELECT COUNT(DISTINCT platform_code) FROM social_platforms WHERE platform_code IN
  ('instagram','whatsapp','youtube','linkedin','tiktok','facebook','x','github','pinterest','threads','discord','telegram')) AS supported_platform_count,
 (SELECT COUNT(*) FROM social_links WHERE platform_id IS NULL) AS unmapped_social_links,
 (SELECT COUNT(*) FROM about_mission_points WHERE about_settings_id=1) AS about_mission_points,
 (SELECT COUNT(*) FROM about_workspace_tags) AS about_workspace_tags,
 (SELECT COUNT(*) FROM about_collaborator_types WHERE about_settings_id=1) AS about_collaborator_types,
 (SELECT COUNT(*) FROM homepage_news_settings WHERE id=1) AS homepage_news_singleton,
 (SELECT COUNT(*) FROM homepage_news_article_placements) AS homepage_news_placements,
 (SELECT COUNT(*) FROM contact_social_placements) AS contact_placements,
 (SELECT COUNT(*) FROM footer_social_placements) AS footer_placements;

-- Booleans only: do not export approved editorial text in this evidence grid.
SELECT id,heading_line_3 IS NOT NULL AND TRIM(heading_line_3)<>'' AS third_line_seeded,
       COALESCE(LEFT(heading_line_1,5)='Ideas' AND CHAR_LENGTH(SUBSTRING(heading_line_1,6))<=9,0) AS first_line_contract_valid
FROM hero_settings WHERE id=1;

SELECT id,
 NULLIF(TRIM(intro_highlight),'') IS NOT NULL AS intro_highlight_ready,
 NULLIF(TRIM(ecosystem_eyebrow),'') IS NOT NULL AS ecosystem_eyebrow_ready,
 NULLIF(TRIM(ecosystem_description),'') IS NOT NULL AS ecosystem_description_ready,
 NULLIF(TRIM(vision_mission_eyebrow),'') IS NOT NULL AS vision_mission_eyebrow_ready,
 NULLIF(TRIM(vision_heading),'') IS NOT NULL AS vision_heading_ready,
 NULLIF(TRIM(vision_description),'') IS NOT NULL AS vision_description_ready,
 NULLIF(TRIM(mission_heading),'') IS NOT NULL AS mission_heading_ready,
 NULLIF(TRIM(guides_eyebrow),'') IS NOT NULL AS guides_eyebrow_ready,
 NULLIF(TRIM(clients_eyebrow),'') IS NOT NULL AS clients_eyebrow_ready,
 NULLIF(TRIM(clients_heading),'') IS NOT NULL AS clients_heading_ready,
 NULLIF(TRIM(clients_description),'') IS NOT NULL AS clients_description_ready
FROM about_settings WHERE id=1;

-- Ledger evidence is separate from schema evidence; do not insert rows here.
SELECT version,name,checksum,applied_at FROM schema_migrations
WHERE version IN ('001','002','003','004') ORDER BY version;
