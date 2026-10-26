-- READ ONLY. Run against the selected `uni-inside` Aiven database in DBeaver.
-- Save all result grids before any ledger change. This audit cannot establish
-- byte-for-byte equivalence to the unavailable consolidated V2 SQL.
SELECT DATABASE() AS database_name, VERSION() AS mysql_version,
       @@sql_require_primary_key AS require_primary_key;

SELECT COUNT(*) AS base_tables,
       SUM(pk.TABLE_NAME IS NOT NULL) AS tables_with_primary_key
FROM information_schema.TABLES AS t
LEFT JOIN (SELECT DISTINCT TABLE_NAME FROM information_schema.TABLE_CONSTRAINTS
           WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='PRIMARY KEY') AS pk
  ON pk.TABLE_NAME=t.TABLE_NAME
WHERE t.TABLE_SCHEMA=DATABASE() AND t.TABLE_TYPE='BASE TABLE';
-- Expected: 63 base tables and 63 primary keys. Stop if either differs.

SELECT CONSTRAINT_TYPE,COUNT(*) AS constraint_count
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA=DATABASE()
GROUP BY CONSTRAINT_TYPE ORDER BY CONSTRAINT_TYPE;
-- Historical minima: 71 FOREIGN KEY, 29 UNIQUE, 53 original CHECK.
-- V2 report: 71 CHECK total. New foreign/unique objects may raise totals.

SELECT v.table_name, t.TABLE_NAME IS NOT NULL AS exists_with_primary_key
FROM JSON_TABLE('["social_platforms","contact_social_placements","footer_social_placements","homepage_news_settings","homepage_news_article_placements","about_workspace_tags","about_mission_points","about_collaborator_types","secondary_page_content_slots","content_translations","team_member_social_links"]', '$[*]'
  COLUMNS(table_name VARCHAR(80) PATH '$')) AS v
LEFT JOIN information_schema.TABLE_CONSTRAINTS AS t
  ON t.CONSTRAINT_SCHEMA=DATABASE() AND t.CONSTRAINT_TYPE='PRIMARY KEY'
 AND t.TABLE_NAME=v.table_name
ORDER BY v.table_name;
-- Expected: eleven rows, all exists_with_primary_key=1.

SELECT SUBSTRING_INDEX(refs.reference,'.',1) AS table_name,
       SUBSTRING_INDEX(refs.reference,'.',-1) AS column_name,
       c.COLUMN_TYPE,c.IS_NULLABLE,c.COLUMN_DEFAULT,
       c.COLUMN_NAME IS NOT NULL AS present
FROM JSON_TABLE('["social_links.platform_id","social_links.description","product_purchase_links.social_link_id","product_variants.media_id","hero_settings.heading_line_3","contact_section_settings.craft_url","site_settings.google_maps_embed_url","team_section_settings.card_template_url"]','$[*]'
  COLUMNS(reference VARCHAR(120) PATH '$')) AS refs
LEFT JOIN information_schema.COLUMNS AS c ON c.TABLE_SCHEMA=DATABASE()
 AND c.TABLE_NAME=SUBSTRING_INDEX(refs.reference,'.',1)
 AND c.COLUMN_NAME=SUBSTRING_INDEX(refs.reference,'.',-1)
ORDER BY table_name,column_name;
-- Expected: all present=1. Compare type/nullability with the V2 SQL or export.

SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
 ('social_platforms','contact_social_placements','footer_social_placements',
  'homepage_news_settings','homepage_news_article_placements',
  'about_workspace_tags','about_mission_points','about_collaborator_types',
  'secondary_page_content_slots','content_translations','team_member_social_links',
  'about_settings','social_links','product_purchase_links','product_variants',
  'hero_settings','contact_section_settings','site_settings','team_section_settings')
ORDER BY TABLE_NAME,ORDINAL_POSITION;

SELECT TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN
 ('social_platforms','contact_social_placements','footer_social_placements',
  'homepage_news_settings','homepage_news_article_placements',
  'about_workspace_tags','about_mission_points','about_collaborator_types',
  'secondary_page_content_slots','content_translations','team_member_social_links',
  'social_links','product_purchase_links','product_variants')
ORDER BY TABLE_NAME,CONSTRAINT_TYPE,CONSTRAINT_NAME;

SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,
       k.REFERENCED_COLUMN_NAME,r.UPDATE_RULE,r.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE AS k
JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
 ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
 AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME IN
 ('social_links','product_purchase_links','product_variants',
  'contact_social_placements','footer_social_placements',
  'homepage_news_article_placements','about_workspace_tags',
  'about_mission_points','about_collaborator_types',
  'secondary_page_content_slots','team_member_social_links')
ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION;

SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
 ('social_platforms','social_links','product_purchase_links','product_variants',
  'contact_social_placements','footer_social_placements',
  'homepage_news_settings','homepage_news_article_placements',
  'about_workspace_tags','about_mission_points','about_collaborator_types',
  'secondary_page_content_slots','team_member_social_links')
ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX;

SELECT version,name,checksum,applied_at FROM schema_migrations ORDER BY version;
-- 001 historical checksum must remain:
-- 1af04aa15d82825ff80c3ecc5ba619e1e9f2956e7fa68fb30fedcbcee1119ea2
-- No ledger row can prove which exact statements in consolidated V2 ran.

SELECT p.platform_code,COUNT(a.id) AS accounts,
       SUM(CASE WHEN a.is_active=1 THEN 1 ELSE 0 END) AS active_accounts
FROM social_platforms AS p LEFT JOIN social_links AS a ON a.platform_id=p.id
GROUP BY p.id,p.platform_code ORDER BY p.platform_code;
-- Expected: all twelve curated platform codes, no more than five per code.

SELECT COUNT(*) AS unmapped_social_accounts FROM social_links WHERE platform_id IS NULL;
SELECT COUNT(*) AS duplicate_platform_codes FROM
 (SELECT platform_code FROM social_platforms GROUP BY platform_code HAVING COUNT(*)>1) AS duplicates;
SELECT COUNT(*) AS invalid_contact_references
FROM contact_social_placements AS p LEFT JOIN social_links AS a ON a.id=p.social_link_id
WHERE a.id IS NULL OR a.is_active<>1;
SELECT COUNT(*) AS invalid_footer_references
FROM footer_social_placements AS p LEFT JOIN social_links AS a ON a.id=p.social_link_id
WHERE a.id IS NULL OR a.is_active<>1;
