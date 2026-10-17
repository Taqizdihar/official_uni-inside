-- Uni-Inside Studio CMS
-- Migration: 001_initial_schema
-- Target: MySQL 8.0+
--
-- Run this script from phpMyAdmin after selecting the existing database
-- named `uni-inside`. This migration intentionally does not create, drop,
-- or select a database.

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    version VARCHAR(50) NOT NULL,
    name VARCHAR(190) NOT NULL,
    checksum CHAR(64) NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_schema_migrations_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code),
    CONSTRAINT chk_roles_is_system CHECK (is_system IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NULL,
    display_name VARCHAR(150) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'invited',
    email_verified_at DATETIME(3) NULL,
    last_login_at DATETIME(3) NULL,
    password_changed_at DATETIME(3) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role_status (role_id, status),
    KEY idx_users_created_by (created_by),
    CONSTRAINT chk_users_status CHECK (status IN ('invited', 'active', 'suspended', 'disabled')),
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS invitations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    invited_by BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    accepted_at DATETIME(3) NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_invitations_token_hash (token_hash),
    KEY idx_invitations_email_status (email, accepted_at, revoked_at),
    KEY idx_invitations_role (role_id),
    KEY idx_invitations_invited_by (invited_by),
    CONSTRAINT fk_invitations_role
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_invitations_invited_by
        FOREIGN KEY (invited_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    ip_hash CHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    last_activity_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
    KEY idx_auth_sessions_user_expiry (user_id, expires_at),
    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
    KEY idx_password_reset_tokens_user (user_id, expires_at),
    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS media_assets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider VARCHAR(32) NOT NULL DEFAULT 'cloudinary',
    public_id VARCHAR(255) NOT NULL,
    resource_type VARCHAR(32) NOT NULL DEFAULT 'image',
    format VARCHAR(32) NULL,
    secure_url VARCHAR(1000) NOT NULL,
    original_filename VARCHAR(255) NULL,
    alt_text VARCHAR(255) NULL,
    caption VARCHAR(500) NULL,
    width_px INT UNSIGNED NULL,
    height_px INT UNSIGNED NULL,
    bytes_size BIGINT UNSIGNED NULL,
    folder_path VARCHAR(255) NULL,
    uploaded_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_media_assets_provider_public_id (provider, public_id),
    KEY idx_media_assets_folder (folder_path),
    KEY idx_media_assets_uploaded_by (uploaded_by),
    CONSTRAINT chk_media_assets_resource_type CHECK (resource_type IN ('image')),
    CONSTRAINT fk_media_assets_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id BIGINT UNSIGNED NOT NULL,
    avatar_media_id BIGINT UNSIGNED NULL,
    job_title VARCHAR(150) NULL,
    bio VARCHAR(1000) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id),
    KEY idx_user_profiles_avatar (avatar_media_id),
    CONSTRAINT fk_user_profiles_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_user_profiles_avatar_media
        FOREIGN KEY (avatar_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS site_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    site_name VARCHAR(150) NOT NULL,
    tagline VARCHAR(255) NULL,
    public_email VARCHAR(254) NULL,
    public_phone VARCHAR(50) NULL,
    whatsapp_number VARCHAR(50) NULL,
    address_text VARCHAR(500) NULL,
    footer_description VARCHAR(1000) NULL,
    default_meta_title VARCHAR(255) NULL,
    default_meta_description VARCHAR(500) NULL,
    default_og_media_id BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_site_settings_og_media (default_og_media_id),
    KEY idx_site_settings_updated_by (updated_by),
    CONSTRAINT chk_site_settings_singleton CHECK (id = 1),
    CONSTRAINT fk_site_settings_og_media
        FOREIGN KEY (default_og_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_site_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS social_links (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    platform_code VARCHAR(64) NOT NULL,
    label VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    icon_key VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_social_links_platform_code (platform_code),
    KEY idx_social_links_active_order (is_active, sort_order),
    CONSTRAINT chk_social_links_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS page_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    page_key VARCHAR(64) NOT NULL,
    eyebrow VARCHAR(150) NULL,
    heading VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    primary_cta_label VARCHAR(100) NULL,
    primary_cta_url VARCHAR(1000) NULL,
    default_sort_key VARCHAR(64) NULL,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    og_media_id BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_page_settings_page_key (page_key),
    KEY idx_page_settings_og_media (og_media_id),
    KEY idx_page_settings_updated_by (updated_by),
    CONSTRAINT fk_page_settings_og_media
        FOREIGN KEY (og_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_page_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS homepage_section_settings (
    section_key VARCHAR(64) NOT NULL,
    eyebrow VARCHAR(150) NULL,
    heading VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    primary_cta_label VARCHAR(100) NULL,
    primary_cta_url VARCHAR(1000) NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (section_key),
    KEY idx_homepage_section_updated_by (updated_by),
    CONSTRAINT chk_homepage_section_visible CHECK (is_visible IN (0, 1)),
    CONSTRAINT fk_homepage_section_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hero_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    eyebrow VARCHAR(150) NULL,
    heading_line_1 VARCHAR(255) NOT NULL,
    heading_line_2 VARCHAR(255) NOT NULL,
    description_line_1 VARCHAR(500) NOT NULL,
    description_line_2 VARCHAR(500) NULL,
    intro_enabled TINYINT(1) NOT NULL DEFAULT 1,
    default_workspace VARCHAR(32) NOT NULL DEFAULT 'studio',
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_hero_settings_updated_by (updated_by),
    CONSTRAINT chk_hero_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_hero_intro_enabled CHECK (intro_enabled IN (0, 1)),
    CONSTRAINT chk_hero_default_workspace CHECK (default_workspace IN ('studio', 'craft')),
    CONSTRAINT fk_hero_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hero_trust_signals (
    slot TINYINT UNSIGNED NOT NULL,
    numeric_value INT UNSIGNED NOT NULL,
    suffix VARCHAR(16) NULL,
    label VARCHAR(100) NOT NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (slot),
    KEY idx_hero_trust_signals_updated_by (updated_by),
    CONSTRAINT chk_hero_trust_slot CHECK (slot BETWEEN 1 AND 3),
    CONSTRAINT chk_hero_trust_visible CHECK (is_visible IN (0, 1)),
    CONSTRAINT fk_hero_trust_signals_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hero_workspace_content (
    workspace_key VARCHAR(32) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    primary_cta_label VARCHAR(100) NOT NULL,
    primary_cta_url VARCHAR(1000) NOT NULL,
    secondary_cta_label VARCHAR(100) NULL,
    secondary_cta_url VARCHAR(1000) NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (workspace_key),
    KEY idx_hero_workspace_updated_by (updated_by),
    CONSTRAINT chk_hero_workspace_key CHECK (workspace_key IN ('studio', 'craft')),
    CONSTRAINT chk_hero_workspace_enabled CHECK (is_enabled IN (0, 1)),
    CONSTRAINT fk_hero_workspace_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hero_hotspot_content (
    hotspot_key VARCHAR(64) NOT NULL,
    workspace_key VARCHAR(32) NOT NULL,
    label VARCHAR(150) NOT NULL,
    numeric_value INT UNSIGNED NULL,
    numeric_suffix VARCHAR(16) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (hotspot_key),
    KEY idx_hero_hotspot_workspace_order (workspace_key, sort_order),
    KEY idx_hero_hotspot_updated_by (updated_by),
    CONSTRAINT chk_hero_hotspot_workspace CHECK (workspace_key IN ('studio', 'craft')),
    CONSTRAINT chk_hero_hotspot_enabled CHECK (is_enabled IN (0, 1)),
    CONSTRAINT fk_hero_hotspot_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS about_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    eyebrow VARCHAR(150) NULL,
    heading VARCHAR(255) NOT NULL,
    lead_text VARCHAR(1000) NOT NULL,
    body_text TEXT NULL,
    workspaces_heading VARCHAR(255) NULL,
    principles_heading VARCHAR(255) NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_about_settings_updated_by (updated_by),
    CONSTRAINT chk_about_settings_singleton CHECK (id = 1),
    CONSTRAINT fk_about_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS about_workspaces (
    workspace_key VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    short_label VARCHAR(100) NULL,
    description VARCHAR(1000) NOT NULL,
    cta_label VARCHAR(100) NULL,
    cta_url VARCHAR(1000) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (workspace_key),
    KEY idx_about_workspaces_order (sort_order),
    KEY idx_about_workspaces_updated_by (updated_by),
    CONSTRAINT chk_about_workspace_key CHECK (workspace_key IN ('studio', 'craft')),
    CONSTRAINT chk_about_workspace_visible CHECK (is_visible IN (0, 1)),
    CONSTRAINT fk_about_workspaces_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS about_principles (
    slot TINYINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    icon_key VARCHAR(100) NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (slot),
    KEY idx_about_principles_updated_by (updated_by),
    CONSTRAINT chk_about_principles_slot CHECK (slot BETWEEN 1 AND 3),
    CONSTRAINT chk_about_principles_visible CHECK (is_visible IN (0, 1)),
    CONSTRAINT fk_about_principles_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS partners (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    logo_media_id BIGINT UNSIGNED NULL,
    website_url VARCHAR(1000) NULL,
    description VARCHAR(1000) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_partners_slug (slug),
    KEY idx_partners_status_order (status, sort_order),
    KEY idx_partners_logo_media (logo_media_id),
    KEY idx_partners_created_by (created_by),
    KEY idx_partners_updated_by (updated_by),
    CONSTRAINT chk_partners_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT fk_partners_logo_media
        FOREIGN KEY (logo_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_partners_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_partners_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS team_section_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    eyebrow VARCHAR(150) NULL,
    heading VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    normal_mode_instruction VARCHAR(500) NULL,
    ring_mode_instruction VARCHAR(500) NULL,
    default_display_mode VARCHAR(32) NOT NULL DEFAULT 'normal',
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_team_section_updated_by (updated_by),
    CONSTRAINT chk_team_section_singleton CHECK (id = 1),
    CONSTRAINT chk_team_default_mode CHECK (default_display_mode IN ('normal', 'ring')),
    CONSTRAINT fk_team_section_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS team_members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    role_title VARCHAR(190) NOT NULL,
    short_bio VARCHAR(1000) NULL,
    photo_media_id BIGINT UNSIGNED NULL,
    linkedin_url VARCHAR(1000) NULL,
    instagram_url VARCHAR(1000) NULL,
    x_url VARCHAR(1000) NULL,
    github_url VARCHAR(1000) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    joined_at DATE NULL,
    departed_at DATE NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_team_members_slug (slug),
    KEY idx_team_members_status_order (status, sort_order),
    KEY idx_team_members_photo_media (photo_media_id),
    KEY idx_team_members_created_by (created_by),
    KEY idx_team_members_updated_by (updated_by),
    CONSTRAINT chk_team_members_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_team_members_dates CHECK (departed_at IS NULL OR joined_at IS NULL OR departed_at >= joined_at),
    CONSTRAINT fk_team_members_photo_media
        FOREIGN KEY (photo_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_team_members_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_team_members_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    description VARCHAR(1000) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_categories_slug (slug),
    KEY idx_product_categories_active_order (is_active, sort_order),
    CONSTRAINT chk_product_categories_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    product_type VARCHAR(32) NOT NULL DEFAULT 'ready_made',
    short_description VARCHAR(500) NOT NULL,
    description LONGTEXT NULL,
    base_price DECIMAL(15,2) NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'IDR',
    price_note VARCHAR(255) NULL,
    availability_label VARCHAR(100) NULL,
    lead_time_text VARCHAR(255) NULL,
    minimum_order_quantity INT UNSIGNED NULL,
    cover_media_id BIGINT UNSIGNED NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    published_at DATETIME(3) NULL,
    scheduled_at DATETIME(3) NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_slug (slug),
    KEY idx_products_listing (status, is_featured, sort_order),
    KEY idx_products_category (category_id),
    KEY idx_products_cover_media (cover_media_id),
    KEY idx_products_created_by (created_by),
    KEY idx_products_updated_by (updated_by),
    CONSTRAINT chk_products_type CHECK (product_type IN ('ready_made', 'custom', 'both')),
    CONSTRAINT chk_products_status CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    CONSTRAINT chk_products_featured CHECK (is_featured IN (0, 1)),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES product_categories (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_products_cover_media
        FOREIGN KEY (cover_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_products_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_products_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    alt_text VARCHAR(255) NULL,
    is_cover TINYINT(1) NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_images_product_media (product_id, media_id),
    KEY idx_product_images_order (product_id, sort_order),
    KEY idx_product_images_media (media_id),
    CONSTRAINT chk_product_images_cover CHECK (is_cover IN (0, 1)),
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_product_images_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_features (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(150) NOT NULL,
    value_text VARCHAR(500) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_product_features_order (product_id, sort_order),
    CONSTRAINT fk_product_features_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_color_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    hex_color CHAR(7) NULL,
    media_id BIGINT UNSIGNED NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_product_colors_order (product_id, sort_order),
    KEY idx_product_colors_media (media_id),
    CONSTRAINT chk_product_colors_active CHECK (is_active IN (0, 1)),
    CONSTRAINT chk_product_colors_hex CHECK (hex_color IS NULL OR hex_color REGEXP '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT fk_product_colors_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_product_colors_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(100) NULL,
    price_adjustment DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_variants_sku (sku),
    KEY idx_product_variants_order (product_id, sort_order),
    CONSTRAINT chk_product_variants_active CHECK (is_active IN (0, 1)),
    CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_purchase_links (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    button_label VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_product_purchase_links_order (product_id, is_active, sort_order),
    CONSTRAINT chk_product_purchase_primary CHECK (is_primary IN (0, 1)),
    CONSTRAINT chk_product_purchase_active CHECK (is_active IN (0, 1)),
    CONSTRAINT fk_product_purchase_links_product
        FOREIGN KEY (product_id) REFERENCES products (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    description VARCHAR(1000) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_service_categories_slug (slug),
    KEY idx_service_categories_active_order (is_active, sort_order),
    CONSTRAINT chk_service_categories_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    short_description VARCHAR(500) NOT NULL,
    description LONGTEXT NULL,
    pricing_type VARCHAR(32) NOT NULL DEFAULT 'contact',
    starting_price DECIMAL(15,2) NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'IDR',
    price_note VARCHAR(255) NULL,
    estimated_duration VARCHAR(255) NULL,
    cover_media_id BIGINT UNSIGNED NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    featured_slot TINYINT UNSIGNED NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    primary_cta_label VARCHAR(100) NULL,
    primary_cta_url VARCHAR(1000) NULL,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    published_at DATETIME(3) NULL,
    scheduled_at DATETIME(3) NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_services_slug (slug),
    UNIQUE KEY uq_services_featured_slot (featured_slot),
    KEY idx_services_listing (status, sort_order),
    KEY idx_services_category (category_id),
    KEY idx_services_cover_media (cover_media_id),
    KEY idx_services_created_by (created_by),
    KEY idx_services_updated_by (updated_by),
    CONSTRAINT chk_services_pricing_type CHECK (pricing_type IN ('fixed', 'starting_from', 'range', 'contact')),
    CONSTRAINT chk_services_status CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    CONSTRAINT chk_services_featured_slot CHECK (featured_slot IS NULL OR featured_slot BETWEEN 1 AND 3),
    CONSTRAINT fk_services_category
        FOREIGN KEY (category_id) REFERENCES service_categories (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_services_cover_media
        FOREIGN KEY (cover_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_services_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_services_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_list_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    service_id BIGINT UNSIGNED NOT NULL,
    item_type VARCHAR(32) NOT NULL,
    label VARCHAR(500) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_service_list_items_order (service_id, item_type, sort_order),
    CONSTRAINT chk_service_list_item_type CHECK (item_type IN ('deliverable', 'included', 'requirement', 'not_included')),
    CONSTRAINT fk_service_list_items_service
        FOREIGN KEY (service_id) REFERENCES services (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_process_steps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    service_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_service_process_steps_order (service_id, sort_order),
    CONSTRAINT fk_service_process_steps_service
        FOREIGN KEY (service_id) REFERENCES services (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS service_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    service_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    alt_text VARCHAR(255) NULL,
    is_cover TINYINT(1) NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_service_images_service_media (service_id, media_id),
    KEY idx_service_images_order (service_id, sort_order),
    KEY idx_service_images_media (media_id),
    CONSTRAINT chk_service_images_cover CHECK (is_cover IN (0, 1)),
    CONSTRAINT fk_service_images_service
        FOREIGN KEY (service_id) REFERENCES services (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_service_images_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS projects (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(190) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    client_name VARCHAR(190) NULL,
    project_date DATE NULL,
    short_description VARCHAR(500) NOT NULL,
    challenge_text TEXT NULL,
    solution_text TEXT NULL,
    outcome_text TEXT NULL,
    cover_media_id BIGINT UNSIGNED NULL,
    external_url VARCHAR(1000) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    published_at DATETIME(3) NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_projects_slug (slug),
    KEY idx_projects_listing (status, is_featured, sort_order),
    KEY idx_projects_cover_media (cover_media_id),
    KEY idx_projects_created_by (created_by),
    KEY idx_projects_updated_by (updated_by),
    CONSTRAINT chk_projects_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_projects_featured CHECK (is_featured IN (0, 1)),
    CONSTRAINT fk_projects_cover_media
        FOREIGN KEY (cover_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_projects_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_projects_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project_services (
    project_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (project_id, service_id),
    CONSTRAINT fk_project_services_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_project_services_service
        FOREIGN KEY (service_id) REFERENCES services (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    project_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_project_images_project_media (project_id, media_id),
    KEY idx_project_images_order (project_id, sort_order),
    KEY idx_project_images_media (media_id),
    CONSTRAINT fk_project_images_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_project_images_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS project_team_members (
    project_id BIGINT UNSIGNED NOT NULL,
    team_member_id BIGINT UNSIGNED NOT NULL,
    contribution_label VARCHAR(190) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (project_id, team_member_id),
    CONSTRAINT fk_project_team_members_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_project_team_members_member
        FOREIGN KEY (team_member_id) REFERENCES team_members (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS news_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    description VARCHAR(1000) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_news_categories_slug (slug),
    KEY idx_news_categories_active_order (is_active, sort_order),
    CONSTRAINT chk_news_categories_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS news_articles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NULL,
    author_user_id BIGINT UNSIGNED NULL,
    author_team_member_id BIGINT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    content_type VARCHAR(32) NOT NULL DEFAULT 'news',
    excerpt VARCHAR(1000) NOT NULL,
    body LONGTEXT NULL,
    cover_media_id BIGINT UNSIGNED NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    reading_time_minutes SMALLINT UNSIGNED NULL,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    published_at DATETIME(3) NULL,
    scheduled_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_news_articles_slug (slug),
    KEY idx_news_articles_listing (status, is_featured, published_at),
    KEY idx_news_articles_category (category_id),
    KEY idx_news_articles_author_user (author_user_id),
    KEY idx_news_articles_author_member (author_team_member_id),
    KEY idx_news_articles_cover_media (cover_media_id),
    CONSTRAINT chk_news_articles_type CHECK (content_type IN ('news', 'article', 'update', 'event')),
    CONSTRAINT chk_news_articles_status CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    CONSTRAINT chk_news_articles_featured CHECK (is_featured IN (0, 1)),
    CONSTRAINT fk_news_articles_category
        FOREIGN KEY (category_id) REFERENCES news_categories (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_news_articles_author_user
        FOREIGN KEY (author_user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_news_articles_author_member
        FOREIGN KEY (author_team_member_id) REFERENCES team_members (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_news_articles_cover_media
        FOREIGN KEY (cover_media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS news_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    article_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    alt_text VARCHAR(255) NULL,
    caption VARCHAR(500) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_news_images_article_media (article_id, media_id),
    KEY idx_news_images_order (article_id, sort_order),
    KEY idx_news_images_media (media_id),
    CONSTRAINT fk_news_images_article
        FOREIGN KEY (article_id) REFERENCES news_articles (id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_news_images_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS achievement_section_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    eyebrow VARCHAR(150) NULL,
    heading VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_achievement_section_updated_by (updated_by),
    CONSTRAINT chk_achievement_section_singleton CHECK (id = 1),
    CONSTRAINT fk_achievement_section_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS achievements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(190) NOT NULL,
    description VARCHAR(1000) NULL,
    year_label VARCHAR(20) NULL,
    achievement_date DATE NULL,
    issuer_name VARCHAR(190) NULL,
    external_url VARCHAR(1000) NULL,
    icon_key VARCHAR(100) NULL,
    media_id BIGINT UNSIGNED NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    KEY idx_achievements_listing (status, sort_order),
    KEY idx_achievements_media (media_id),
    KEY idx_achievements_created_by (created_by),
    KEY idx_achievements_updated_by (updated_by),
    CONSTRAINT chk_achievements_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT fk_achievements_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_achievements_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_achievements_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS contact_section_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    eyebrow VARCHAR(150) NULL,
    heading VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NULL,
    email_label VARCHAR(100) NULL,
    phone_label VARCHAR(100) NULL,
    whatsapp_cta_label VARCHAR(100) NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_contact_section_updated_by (updated_by),
    CONSTRAINT chk_contact_section_singleton CHECK (id = 1),
    CONSTRAINT fk_contact_section_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS contact_chat_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    message_text VARCHAR(500) NOT NULL,
    speaker VARCHAR(32) NOT NULL DEFAULT 'studio',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_contact_chat_active_order (is_active, sort_order),
    CONSTRAINT chk_contact_chat_speaker CHECK (speaker IN ('studio', 'visitor')),
    CONSTRAINT chk_contact_chat_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS content_revisions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    revision_number INT UNSIGNED NOT NULL,
    snapshot_json JSON NOT NULL,
    change_summary VARCHAR(500) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_content_revisions_entity_revision (entity_type, entity_id, revision_number),
    KEY idx_content_revisions_created_by (created_by),
    CONSTRAINT fk_content_revisions_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT UNSIGNED NULL,
    action_code VARCHAR(100) NOT NULL,
    entity_type VARCHAR(64) NULL,
    entity_id BIGINT UNSIGNED NULL,
    before_json JSON NULL,
    after_json JSON NULL,
    request_id VARCHAR(100) NULL,
    ip_hash CHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_audit_logs_actor_date (actor_user_id, created_at),
    KEY idx_audit_logs_entity (entity_type, entity_id, created_at),
    CONSTRAINT fk_audit_logs_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_uuid CHAR(36) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    occurred_at DATETIME(3) NOT NULL,
    page_path VARCHAR(500) NULL,
    entity_type VARCHAR(64) NULL,
    entity_id BIGINT UNSIGNED NULL,
    link_destination VARCHAR(1000) NULL,
    referrer_host VARCHAR(255) NULL,
    session_hash CHAR(64) NULL,
    visitor_hash CHAR(64) NULL,
    device_type VARCHAR(32) NULL,
    country_code CHAR(2) NULL,
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_analytics_events_uuid (event_uuid),
    KEY idx_analytics_events_name_date (event_name, occurred_at),
    KEY idx_analytics_events_entity_date (entity_type, entity_id, occurred_at),
    KEY idx_analytics_events_page_date (page_path(190), occurred_at),
    CONSTRAINT chk_analytics_device_type CHECK (device_type IS NULL OR device_type IN ('desktop', 'tablet', 'mobile', 'other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    metric_date DATE NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL DEFAULT '',
    entity_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    dimension_key VARCHAR(64) NOT NULL DEFAULT '',
    dimension_value VARCHAR(190) NOT NULL DEFAULT '',
    metric_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_analytics_daily_metric (
        metric_date,
        metric_name,
        entity_type,
        entity_id,
        dimension_key,
        dimension_value
    ),
    KEY idx_analytics_daily_metric_lookup (metric_name, metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS external_analytics_cache (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider VARCHAR(64) NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metric_data JSON NOT NULL,
    fetched_at DATETIME(3) NOT NULL,
    expires_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_external_analytics_cache_period (provider, metric_key, period_start, period_end),
    KEY idx_external_analytics_cache_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

START TRANSACTION;

INSERT IGNORE INTO roles (code, name, description, is_system) VALUES
    ('super_admin', 'Super Administrator', 'Full access, including roles, permissions, and user administration.', 1),
    ('administrator', 'Administrator', 'Manages users, settings, and published content.', 1),
    ('editor', 'Editor', 'Manages and publishes website content.', 1),
    ('author', 'Author', 'Creates and edits draft content.', 1),
    ('viewer', 'Viewer', 'Read-only access to the CMS.', 1);

INSERT IGNORE INTO permissions (code, name, description) VALUES
    ('dashboard.view', 'View dashboard', 'View the CMS dashboard and summaries.'),
    ('analytics.view', 'View analytics', 'View visitor and engagement analytics.'),
    ('media.view', 'View media', 'Browse the media library.'),
    ('media.upload', 'Upload media', 'Upload images to the configured media provider.'),
    ('media.update', 'Update media', 'Edit image metadata such as alt text and captions.'),
    ('media.delete', 'Delete media', 'Soft-delete media library records.'),
    ('homepage.view', 'View homepage content', 'View fixed-structure homepage content.'),
    ('homepage.update', 'Update homepage content', 'Update permitted fixed-structure homepage fields.'),
    ('partners.view', 'View partners', 'View partner records.'),
    ('partners.create', 'Create partners', 'Create partner records.'),
    ('partners.update', 'Update partners', 'Update partner records.'),
    ('partners.publish', 'Publish partners', 'Publish partner records.'),
    ('partners.archive', 'Archive partners', 'Archive partner records.'),
    ('team.view', 'View team members', 'View team member records.'),
    ('team.create', 'Create team members', 'Create team member records.'),
    ('team.update', 'Update team members', 'Update team member records.'),
    ('team.publish', 'Publish team members', 'Publish team member records.'),
    ('team.archive', 'Archive team members', 'Archive team member records.'),
    ('products.view', 'View products', 'View product records.'),
    ('products.create', 'Create products', 'Create product records.'),
    ('products.update', 'Update products', 'Update product records.'),
    ('products.publish', 'Publish products', 'Publish product records.'),
    ('products.archive', 'Archive products', 'Archive product records.'),
    ('services.view', 'View services', 'View service records.'),
    ('services.create', 'Create services', 'Create service records.'),
    ('services.update', 'Update services', 'Update service records.'),
    ('services.publish', 'Publish services', 'Publish service records.'),
    ('services.archive', 'Archive services', 'Archive service records.'),
    ('projects.view', 'View projects', 'View portfolio project records.'),
    ('projects.create', 'Create projects', 'Create portfolio project records.'),
    ('projects.update', 'Update projects', 'Update portfolio project records.'),
    ('projects.publish', 'Publish projects', 'Publish portfolio project records.'),
    ('projects.archive', 'Archive projects', 'Archive portfolio project records.'),
    ('news.view', 'View news', 'View news and article records.'),
    ('news.create', 'Create news', 'Create news and article records.'),
    ('news.update', 'Update news', 'Update news and article records.'),
    ('news.publish', 'Publish news', 'Publish news and article records.'),
    ('news.archive', 'Archive news', 'Archive news and article records.'),
    ('achievements.view', 'View achievements', 'View achievement records.'),
    ('achievements.create', 'Create achievements', 'Create achievement records.'),
    ('achievements.update', 'Update achievements', 'Update achievement records.'),
    ('achievements.publish', 'Publish achievements', 'Publish achievement records.'),
    ('achievements.archive', 'Archive achievements', 'Archive achievement records.'),
    ('settings.view', 'View settings', 'View global site and page settings.'),
    ('settings.update', 'Update settings', 'Update global site and page settings.'),
    ('users.view', 'View users', 'View CMS users and invitations.'),
    ('users.invite', 'Invite users', 'Invite a new CMS user.'),
    ('users.update', 'Update users', 'Update user roles and status.'),
    ('roles.view', 'View roles', 'View roles and permissions.'),
    ('roles.manage', 'Manage roles', 'Manage role-permission assignments.'),
    ('audit.view', 'View audit log', 'View the CMS audit log.');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.code = 'super_admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.code = 'administrator'
  AND p.code <> 'roles.manage';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.code = 'editor'
  AND (
      p.code IN (
          'dashboard.view', 'analytics.view',
          'media.view', 'media.upload', 'media.update',
          'homepage.view', 'homepage.update',
          'settings.view'
      )
      OR p.code LIKE 'partners.%'
      OR p.code LIKE 'team.%'
      OR p.code LIKE 'products.%'
      OR p.code LIKE 'services.%'
      OR p.code LIKE 'projects.%'
      OR p.code LIKE 'news.%'
      OR p.code LIKE 'achievements.%'
  );

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.code = 'author'
  AND p.code IN (
      'dashboard.view',
      'media.view', 'media.upload', 'media.update',
      'partners.view', 'partners.create', 'partners.update',
      'team.view',
      'products.view', 'products.create', 'products.update',
      'services.view', 'services.create', 'services.update',
      'projects.view', 'projects.create', 'projects.update',
      'news.view', 'news.create', 'news.update',
      'achievements.view', 'achievements.create', 'achievements.update'
  );

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.code = 'viewer'
  AND (
      p.code IN ('dashboard.view', 'analytics.view', 'media.view', 'homepage.view', 'settings.view', 'audit.view')
      OR p.code LIKE '%.view'
  );

INSERT IGNORE INTO site_settings (
    id,
    site_name,
    tagline,
    public_email,
    public_phone,
    whatsapp_number,
    address_text,
    footer_description,
    default_meta_title,
    default_meta_description
) VALUES (
    1,
    'Uni-Inside Studio',
    'Creative Inside, Impact Outside.',
    'uninsidemed@gmail.com',
    '+62 813-1655-6908',
    '+62 813-1655-6908',
    'Telkom University, Gedung Selaru 4th floor',
    'A creative technology studio for multimedia production, digital experiences, and thoughtfully crafted 3D-printed products.',
    'Uni-Inside Studio',
    'Explore multimedia services, creative technology, and 3D-printed products from Uni-Inside Studio and Uni-Inside Craft.'
);

INSERT IGNORE INTO social_links (platform_code, label, url, icon_key, is_active, sort_order) VALUES
    ('instagram_studio', 'Instagram — Uni-Inside Studio', 'https://www.instagram.com/uniinside.id/', 'instagram', 1, 10),
    ('instagram_craft', 'Instagram — Uni-Inside Craft', 'https://www.instagram.com/uniinside.craft/', 'instagram', 1, 20),
    ('tiktok_studio', 'TikTok — Uni-Inside Studio', 'https://www.tiktok.com/@uniinside.id', 'tiktok', 1, 30),
    ('tiktok_craft', 'TikTok — Uni-Inside Craft', 'https://www.tiktok.com/@uniinside.craft', 'tiktok', 1, 40),
    ('linkedin', 'LinkedIn', 'https://www.linkedin.com/company/uni-inside/', 'linkedin', 1, 50);

INSERT IGNORE INTO page_settings (
    page_key, eyebrow, heading, description, primary_cta_label, primary_cta_url, default_sort_key, meta_title, meta_description
) VALUES
    ('products', 'UNI-INSIDE CRAFT', 'PRODUCTS', 'Discover ready-made and custom 3D-printed products shaped for everyday use, gifts, and meaningful moments.', 'Explore Products', '/products', 'sort_order', 'Products — Uni-Inside Craft', 'Browse ready-made and custom 3D-printed products from Uni-Inside Craft.'),
    ('services', 'WHAT WE DO', 'SERVICES', 'Explore multimedia production, creative technology, and supporting services built around each project.', 'Explore Services', '/services', 'sort_order', 'Services — Uni-Inside Studio', 'Explore multimedia and creative technology services from Uni-Inside Studio.'),
    ('news', 'FROM INSIDE', 'NEWS & STORIES', 'Read project updates, creative insights, announcements, and stories from across our workspaces.', 'Read the Latest', '/news', 'published_at', 'News — Uni-Inside Studio', 'Read news, insights, and project stories from Uni-Inside Studio.'),
    ('media_kit', 'BRAND RESOURCES', 'MEDIA KIT', 'Access approved brand information, logos, and public resources for collaboration and publication.', 'Open Media Kit', '/media-kit', NULL, 'Media Kit — Uni-Inside Studio', 'Official brand information and media resources for Uni-Inside Studio.');

INSERT IGNORE INTO homepage_section_settings (
    section_key, eyebrow, heading, description, primary_cta_label, primary_cta_url, is_visible
) VALUES
    ('partners', 'COLLABORATION', 'OUR PARTNERS', 'People and organizations that have shared ideas, projects, and progress with us.', NULL, NULL, 1),
    ('products', 'FROM UNI-INSIDE CRAFT', 'OUR PRODUCTS', 'Small objects, custom models, and practical pieces brought from digital ideas into physical form.', 'View All Products', '/products', 1),
    ('services', 'WHAT WE DO', 'OUR SERVICES', 'Creative production and technology services shaped around the needs of each project.', 'View All Services', '/services', 1),
    ('news', 'FROM INSIDE', 'NEWS & STORIES', 'Updates, ideas, and stories from our projects, people, and creative process.', 'View All News', '/news', 1);

INSERT IGNORE INTO hero_settings (
    id, eyebrow, heading_line_1, heading_line_2, description_line_1, description_line_2, intro_enabled, default_workspace
) VALUES (
    1,
    'MULTIMEDIA · CREATIVE TECHNOLOGY · 3D PRINTING',
    'Ideas Captured.',
    'Stories Crafted.',
    'From visual storytelling to physical creation,',
    'every idea is shaped with purpose.',
    1,
    'studio'
);

INSERT IGNORE INTO hero_trust_signals (slot, numeric_value, suffix, label, is_visible) VALUES
    (1, 10, '+', 'PROJECTS', 1),
    (2, 250, '+', 'PRODUCTS', 1),
    (3, 12, '', 'COLLABORATORS', 1);

INSERT IGNORE INTO hero_workspace_content (
    workspace_key, display_name, primary_cta_label, primary_cta_url, secondary_cta_label, secondary_cta_url, is_enabled
) VALUES
    ('studio', 'Uni-Inside Studio', 'Explore Our Services', '/services', 'See Our Work', '/projects', 1),
    ('craft', 'Uni-Inside Craft', 'Explore Our Products', '/products', 'Shop Uni-Inside Craft', 'https://linktr.ee/uniinside', 1);

INSERT IGNORE INTO hero_hotspot_content (
    hotspot_key, workspace_key, label, numeric_value, numeric_suffix, sort_order, is_enabled
) VALUES
    ('studio_camera', 'studio', 'SHOOTING HOURS', 50, '+', 10, 1),
    ('studio_drone', 'studio', 'FLIGHT HOURS', 15, '+', 20, 1),
    ('studio_monitor', 'studio', 'HOURS OF FOOTAGE EDITED', 8, '+', 30, 1),
    ('studio_lighting', 'studio', 'CONTROLLED STUDIO LIGHTING', NULL, NULL, 40, 1),
    ('studio_microphone', 'studio', 'CLEAN AUDIO CAPTURE', NULL, NULL, 50, 1),
    ('craft_printer', 'craft', 'PRINT HOURS', 2000, '+', 10, 1),
    ('craft_filament', 'craft', 'FILAMENT SPOOLS USED', 15, '+', 20, 1),
    ('craft_monitor', 'craft', 'MODELS DESIGNED', 50, '+', 30, 1),
    ('craft_painting', 'craft', 'QUALITY HAND-PAINTED FINISH', NULL, NULL, 40, 1),
    ('craft_products', 'craft', 'READY-MADE & CUSTOM PRODUCTS', NULL, NULL, 50, 1);

INSERT IGNORE INTO about_settings (
    id, eyebrow, heading, lead_text, body_text, workspaces_heading, principles_heading
) VALUES (
    1,
    'WHO WE ARE',
    'CREATIVE INSIDE. IMPACT OUTSIDE.',
    'A multidisciplinary creative studio where visual storytelling, technology, and physical making meet.',
    'We collaborate across multimedia production, creative technology, and 3D printing to turn ideas into purposeful experiences and tangible work.',
    'TWO WORKSPACES, ONE CREATIVE ECOSYSTEM',
    'HOW WE WORK'
);

INSERT IGNORE INTO about_workspaces (
    workspace_key, name, short_label, description, cta_label, cta_url, sort_order, is_visible
) VALUES
    ('studio', 'Uni-Inside Studio', 'Services & Collaboration', 'Our service workspace focuses on multimedia production and creative technology, from photography and videography to digital experiences built for real project needs.', 'Explore Services', '/services', 10, 1),
    ('craft', 'Uni-Inside Craft', 'Products & 3D Printing', 'Our product workspace turns digital models into ready-made and custom 3D-printed objects, supported by hands-on finishing and careful production.', 'Explore Products', '/products', 20, 1);

INSERT IGNORE INTO about_principles (slot, title, description, icon_key, is_visible) VALUES
    (1, 'Collaborative by Nature', 'We shape better outcomes by listening closely, sharing perspectives, and building alongside our collaborators.', 'collaboration', 1),
    (2, 'Purpose in Every Detail', 'Creative decisions are guided by function, clarity, and the experience each work is meant to create.', 'purpose', 1),
    (3, 'Ideas Made Tangible', 'We connect storytelling, technology, and physical making so ideas can be seen, used, and remembered.', 'tangible', 1);

INSERT IGNORE INTO team_section_settings (
    id, eyebrow, heading, description, normal_mode_instruction, ring_mode_instruction, default_display_mode
) VALUES (
    1,
    'THE PEOPLE INSIDE',
    'MEET OUR TEAM',
    'A multidisciplinary team bringing together creative production, technology, operations, and hands-on craft.',
    'Select a card to meet a member.',
    'Drag the ring to explore, then select any card for details.',
    'normal'
);

INSERT IGNORE INTO achievement_section_settings (id, eyebrow, heading, description) VALUES
    (1, 'MILESTONES', 'ACHIEVEMENTS', 'Selected milestones that reflect our progress, collaboration, and growing creative practice.');

INSERT IGNORE INTO contact_section_settings (
    id, eyebrow, heading, description, email_label, phone_label, whatsapp_cta_label
) VALUES (
    1,
    'START A CONVERSATION',
    'CONTACT US',
    'Have a project, product idea, or collaboration in mind? Tell us what you are building.',
    'Email Us',
    'Call Us',
    'Chat on WhatsApp'
);

INSERT IGNORE INTO contact_chat_messages (message_text, speaker, is_active, sort_order) VALUES
    ('Hello! What can we help you create today?', 'studio', 1, 10),
    ('I have an idea for a multimedia project.', 'visitor', 1, 20),
    ('Great. Tell us about the story, audience, and outcome you have in mind.', 'studio', 1, 30),
    ('I need a custom 3D-printed product.', 'visitor', 1, 40),
    ('We can help from model preparation through printing and finishing.', 'studio', 1, 50);

INSERT IGNORE INTO schema_migrations (version, name, checksum) VALUES
    ('001', 'initial_schema', NULL);

COMMIT;

