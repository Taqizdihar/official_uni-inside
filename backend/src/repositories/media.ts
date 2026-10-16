import type { Executor } from '../database/pool';
import { rows, write } from '../database/pool';
import type { RowDataPacket } from 'mysql2/promise';

export const listMedia = (db: Executor, limit: number, offset: number) => rows<RowDataPacket>(db, 'SELECT id,public_id,format,secure_url,original_filename,alt_text,caption,width_px,height_px,bytes_size,folder_path,created_at FROM media_assets WHERE deleted_at IS NULL ORDER BY id DESC LIMIT ? OFFSET ?', [limit,offset]);
export const mediaRecord = async (db: Executor, id: number) => (await rows<RowDataPacket>(db, 'SELECT id,public_id,format,secure_url,original_filename,alt_text,caption,width_px,height_px,bytes_size,folder_path,deleted_at FROM media_assets WHERE id=? LIMIT 1', [id]))[0];
export const insertMedia = (db: Executor, data: { publicId:string; format:string; secureUrl:string; filename:string | null; alt:string | null; caption:string | null; width:number; height:number; bytes:number; folder:string; actorId:number }) => write(db, 'INSERT INTO media_assets (provider,public_id,resource_type,format,secure_url,original_filename,alt_text,caption,width_px,height_px,bytes_size,folder_path,uploaded_by) VALUES (\'cloudinary\',?,\'image\',?,?,?,?,?,?,?,?,?,?)', [data.publicId,data.format,data.secureUrl,data.filename,data.alt,data.caption,data.width,data.height,data.bytes,data.folder,data.actorId]);
export const updateMedia = (db: Executor, id: number, alt: string | null, caption: string | null) => write(db, 'UPDATE media_assets SET alt_text=?,caption=? WHERE id=? AND deleted_at IS NULL', [alt,caption,id]);
export const softDeleteMedia = (db: Executor, id: number) => write(db, 'UPDATE media_assets SET deleted_at=UTC_TIMESTAMP(3) WHERE id=? AND deleted_at IS NULL', [id]);
export async function mediaReferenceCount(db: Executor, id: number) {
  const result = await rows<RowDataPacket>(db, `SELECT SUM(count) AS count FROM (
    SELECT COUNT(*) count FROM user_profiles WHERE avatar_media_id=? UNION ALL
    SELECT COUNT(*) count FROM site_settings WHERE default_og_media_id=? UNION ALL
    SELECT COUNT(*) count FROM page_settings WHERE og_media_id=? UNION ALL
    SELECT COUNT(*) count FROM partners WHERE logo_media_id=? AND deleted_at IS NULL UNION ALL
    SELECT COUNT(*) count FROM team_members WHERE photo_media_id=? AND deleted_at IS NULL UNION ALL
    SELECT COUNT(*) count FROM products WHERE cover_media_id=? AND deleted_at IS NULL UNION ALL
    SELECT COUNT(*) count FROM product_images WHERE media_id=? UNION ALL
    SELECT COUNT(*) count FROM product_color_options WHERE media_id=? UNION ALL
    SELECT COUNT(*) count FROM services WHERE cover_media_id=? AND deleted_at IS NULL UNION ALL
    SELECT COUNT(*) count FROM service_images WHERE media_id=? UNION ALL
    SELECT COUNT(*) count FROM projects WHERE cover_media_id=? AND deleted_at IS NULL UNION ALL
    SELECT COUNT(*) count FROM project_images WHERE media_id=? UNION ALL
    SELECT COUNT(*) count FROM news_articles WHERE cover_media_id=? AND deleted_at IS NULL UNION ALL
    SELECT COUNT(*) count FROM news_images WHERE media_id=? UNION ALL
    SELECT COUNT(*) count FROM achievements WHERE media_id=? AND deleted_at IS NULL
  ) refs`, Array(15).fill(id));
  return Number(result[0]?.count ?? 0);
}
