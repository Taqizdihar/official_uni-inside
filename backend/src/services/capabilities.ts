import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { Config } from '../config/env';
import { rows } from '../database/pool';
import { HttpError } from '../utils/http';

export type FeatureCapability = { enabled: boolean; reason: 'FEATURE_DISABLED' | 'DATABASE_MIGRATION_PENDING' | null };
export type CmsCapabilities = { socialMediaV2: FeatureCapability; productVariantMedia: FeatureCapability };
const disabled = (): FeatureCapability => ({ enabled: false, reason: 'FEATURE_DISABLED' });
const pending = (): FeatureCapability => ({ enabled: false, reason: 'DATABASE_MIGRATION_PENDING' });

export async function cmsCapabilities(db: Pool, config: Config): Promise<CmsCapabilities> {
  if (!config.SOCIAL_MEDIA_V2_ENABLED && !config.PRODUCT_VARIANT_MEDIA_ENABLED) return { socialMediaV2: disabled(), productVariantMedia: disabled() };
  const columns = await rows<RowDataPacket>(db, `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND (
      (TABLE_NAME='social_platforms' AND COLUMN_NAME IN ('id','platform_code','name','icon_key','sort_order')) OR
      (TABLE_NAME='social_links' AND COLUMN_NAME IN ('platform_id','description')) OR
      (TABLE_NAME='product_purchase_links' AND COLUMN_NAME='social_link_id') OR
      (TABLE_NAME='product_variants' AND COLUMN_NAME='media_id'))`);
  const available = new Set(columns.map(row => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  const socialFields = ['social_platforms.id','social_platforms.platform_code','social_platforms.name','social_platforms.icon_key','social_platforms.sort_order','social_links.platform_id','social_links.description','product_purchase_links.social_link_id'];
  const constraints = await rows<RowDataPacket>(db, `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='FOREIGN KEY' AND
    CONSTRAINT_NAME IN ('fk_social_links_platform','fk_product_purchase_links_social_link','fk_product_variants_media')`);
  const foreignKeys = new Set(constraints.map(row => String(row.CONSTRAINT_NAME)));
  let socialReady = socialFields.every(field => available.has(field)) && foreignKeys.has('fk_social_links_platform') && foreignKeys.has('fk_product_purchase_links_social_link');
  if (config.SOCIAL_MEDIA_V2_ENABLED && socialReady) {
    const state=(await rows<RowDataPacket>(db,`SELECT
      (SELECT COUNT(*) FROM social_links WHERE platform_id IS NULL) AS unmapped,
      (SELECT COUNT(*) FROM social_platforms WHERE platform_code IN
      ('instagram','whatsapp','youtube','linkedin','tiktok','facebook','x','github','pinterest','threads','discord','telegram')) AS supported_platforms`))[0];
    socialReady=Number(state?.unmapped)===0 && Number(state?.supported_platforms)===12;
  }
  const variantReady = available.has('product_variants.media_id') && foreignKeys.has('fk_product_variants_media');
  return {
    socialMediaV2: !config.SOCIAL_MEDIA_V2_ENABLED ? disabled() : socialReady ? { enabled: true, reason: null } : pending(),
    productVariantMedia: !config.PRODUCT_VARIANT_MEDIA_ENABLED ? disabled() : variantReady ? { enabled: true, reason: null } : pending(),
  };
}
export function requireCapability(value: FeatureCapability): void {
  if (!value.enabled) throw new HttpError(503, 'FEATURE_UNAVAILABLE', 'Fitur penyimpanan ini belum tersedia.');
}
