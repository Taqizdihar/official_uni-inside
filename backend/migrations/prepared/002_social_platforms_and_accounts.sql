-- PREPARED, INACTIVE: move into backend/migrations only after the Phase 1
-- administrator preflight, migration 001 reconciliation, and backup.
-- MySQL DDL commits independently; see docs/database-migration-phase-1.md.

-- Reject unfamiliar live codes before changing the schema. Expand this mapping
-- through a reviewed migration revision if production diagnostics find more.
CREATE TEMPORARY TABLE migration_002_code_guard (
    valid TINYINT NOT NULL,
    CONSTRAINT chk_migration_002_known_codes CHECK (valid = 1)
);
INSERT INTO migration_002_code_guard (valid)
SELECT 0 FROM social_links
WHERE LOWER(platform_code) NOT IN
    ('instagram_studio', 'instagram_craft', 'tiktok_studio', 'tiktok_craft', 'linkedin', 'whatsapp')
LIMIT 1;
DROP TEMPORARY TABLE migration_002_code_guard;

CREATE TABLE social_platforms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    platform_code VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon_key VARCHAR(100) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_social_platforms_code (platform_code),
    UNIQUE KEY uq_social_platforms_icon_key (icon_key),
    KEY idx_social_platforms_order (sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Platform types only: no account URLs or claims of official accounts.
-- Icon keys map to verified react-icons/si exports, except linkedin, whose
-- verified registry component is FaLinkedinIn from react-icons/fa6.
INSERT INTO social_platforms (platform_code, name, icon_key, sort_order) VALUES
    ('instagram', 'Instagram', 'instagram', 10),
    ('whatsapp', 'WhatsApp', 'whatsapp', 20),
    ('youtube', 'YouTube', 'youtube', 30),
    ('linkedin', 'LinkedIn', 'linkedin', 40),
    ('tiktok', 'TikTok', 'tiktok', 50),
    ('facebook', 'Facebook', 'facebook', 60),
    ('x', 'X', 'x', 70),
    ('github', 'GitHub', 'github', 80),
    ('pinterest', 'Pinterest', 'pinterest', 90),
    ('threads', 'Threads', 'threads', 100),
    ('discord', 'Discord', 'discord', 110),
    ('telegram', 'Telegram', 'telegram', 120);

-- Both fields remain optional for the deployed backend and existing accounts.
ALTER TABLE social_links
    ADD COLUMN platform_id BIGINT UNSIGNED NULL AFTER id,
    ADD COLUMN description VARCHAR(1000) NULL AFTER label,
    ADD KEY idx_social_links_platform_active_order (platform_id, is_active, sort_order),
    ADD CONSTRAINT fk_social_links_platform
        FOREIGN KEY (platform_id) REFERENCES social_platforms (id)
        ON UPDATE CASCADE ON DELETE RESTRICT;

-- Preserve every legacy code, URL, label, icon, status, order, ID, and timestamp.
UPDATE social_links AS account
JOIN social_platforms AS platform ON platform.platform_code = CASE
    WHEN LOWER(account.platform_code) IN ('instagram_studio', 'instagram_craft') THEN 'instagram'
    WHEN LOWER(account.platform_code) IN ('tiktok_studio', 'tiktok_craft') THEN 'tiktok'
    WHEN LOWER(account.platform_code) = 'linkedin' THEN 'linkedin'
    WHEN LOWER(account.platform_code) = 'whatsapp' THEN 'whatsapp'
    ELSE NULL END
SET account.platform_id = platform.id,
    account.updated_at = account.updated_at
WHERE account.platform_id IS NULL;

-- The backfill is complete only if every existing account was mapped.
CREATE TEMPORARY TABLE migration_002_mapping_guard (
    valid TINYINT NOT NULL,
    CONSTRAINT chk_migration_002_mapped CHECK (valid = 1)
);
INSERT INTO migration_002_mapping_guard (valid)
SELECT 0 FROM social_links WHERE platform_id IS NULL LIMIT 1;
DROP TEMPORARY TABLE migration_002_mapping_guard;
