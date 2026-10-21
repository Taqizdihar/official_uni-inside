-- Read-only stable keys and access rules only. No credentials or editable CMS copy.
-- Export this single result grid as UTF-8 CSV without filtering.
SELECT category, object_key, attributes FROM (
  SELECT 'MANIFEST' AS category, 'ROLE' AS object_key, '{}' AS attributes
  UNION ALL SELECT 'MANIFEST','PERMISSION','{}'
  UNION ALL SELECT 'MANIFEST','ROLE_PERMISSION','{}'
  UNION ALL SELECT 'MANIFEST','CONFIG_KEY','{}'
  UNION ALL
  SELECT 'ROLE',code,JSON_OBJECT('is_system',is_system) FROM roles
  UNION ALL SELECT 'PERMISSION',code,'{}' FROM permissions
  UNION ALL SELECT 'ROLE_PERMISSION',CONCAT(r.code,'/',p.code),'{}'
    FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('site_settings/',id),'{}' FROM site_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('page_settings/',page_key),'{}' FROM page_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('homepage_section_settings/',section_key),'{}' FROM homepage_section_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('hero_settings/',id),'{}' FROM hero_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('hero_trust_signals/',slot),'{}' FROM hero_trust_signals
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('hero_workspace_content/',workspace_key),'{}' FROM hero_workspace_content
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('hero_hotspot_content/',hotspot_key),'{}' FROM hero_hotspot_content
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('about_settings/',id),'{}' FROM about_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('about_workspaces/',workspace_key),'{}' FROM about_workspaces
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('about_principles/',slot),'{}' FROM about_principles
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('team_section_settings/',id),'{}' FROM team_section_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('achievement_section_settings/',id),'{}' FROM achievement_section_settings
  UNION ALL SELECT 'CONFIG_KEY',CONCAT('contact_section_settings/',id),'{}' FROM contact_section_settings
) audit ORDER BY category, object_key;
