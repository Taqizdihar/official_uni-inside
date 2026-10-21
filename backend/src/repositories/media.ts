import type { Executor } from '../database/pool';
import { rows, write } from '../database/pool';
import type { RowDataPacket } from 'mysql2/promise';

export type MediaFilters = { search?: string; folders?: string[]; otherFolders?: string[]; sort?: 'created_at'|'bytes_size'|'original_filename'; direction?: 'ASC'|'DESC' };
const mediaWhere = (filters: MediaFilters) => ({
  sql: `WHERE deleted_at IS NULL${filters.search ? ' AND (original_filename LIKE ? OR public_id LIKE ?)' : ''}${filters.folders?.length ? ` AND (${filters.folders.map(()=>'(folder_path=? OR folder_path LIKE ?)').join(' OR ')})` : ''}${filters.otherFolders?.length ? ` AND (folder_path IS NULL OR (${filters.otherFolders.map(()=>'(folder_path<>? AND folder_path NOT LIKE ?)').join(' AND ')}))` : ''}`,
  values: [...(filters.search ? [`%${filters.search}%`,`%${filters.search}%`] : []),...(filters.folders ?? []).flatMap(folder=>[folder,`${folder}/%`]),...(filters.otherFolders ?? []).flatMap(folder=>[folder,`${folder}/%`])],
});
export const listMedia = (db: Executor, limit: number, offset: number, filters: MediaFilters = {}) => {
  const where=mediaWhere(filters);
  const sort=filters.sort??'created_at'; const direction=filters.direction??'DESC';
  return rows<RowDataPacket>(db, `SELECT id,public_id,format,secure_url,original_filename,alt_text,caption,width_px,height_px,bytes_size,folder_path,created_at FROM media_assets ${where.sql} ORDER BY ${sort} ${direction},id ${direction} LIMIT ? OFFSET ?`, [...where.values,limit,offset]);
};
export async function countMedia(db: Executor, filters: MediaFilters = {}) {
  const where=mediaWhere(filters);
  return Number((await rows<RowDataPacket>(db,`SELECT COUNT(*) AS total FROM media_assets ${where.sql}`,where.values))[0]?.total ?? 0);
}
export const mediaRecord = async (db: Executor, id: number, lock=false) => (await rows<RowDataPacket>(db, `SELECT id,provider,resource_type,public_id,format,secure_url,original_filename,alt_text,caption,width_px,height_px,bytes_size,folder_path,created_at,deleted_at FROM media_assets WHERE id=? LIMIT 1${lock?' FOR UPDATE':''}`, [id]))[0];
export const insertMedia = (db: Executor, data: { publicId:string; format:string; secureUrl:string; filename:string | null; alt:string | null; caption:string | null; width:number; height:number; bytes:number; folder:string; actorId:number }) => write(db, 'INSERT INTO media_assets (provider,public_id,resource_type,format,secure_url,original_filename,alt_text,caption,width_px,height_px,bytes_size,folder_path,uploaded_by) VALUES (\'cloudinary\',?,\'image\',?,?,?,?,?,?,?,?,?,?)', [data.publicId,data.format,data.secureUrl,data.filename,data.alt,data.caption,data.width,data.height,data.bytes,data.folder,data.actorId]);
export const updateMedia = (db: Executor, id: number, alt: string | null, caption: string | null) => write(db, 'UPDATE media_assets SET alt_text=?,caption=? WHERE id=? AND deleted_at IS NULL', [alt,caption,id]);
export const softDeleteMedia = (db: Executor, id: number) => write(db, 'UPDATE media_assets SET deleted_at=UTC_TIMESTAMP(3) WHERE id=? AND deleted_at IS NULL', [id]);
export const updateLocation = (db: Executor,id:number,publicId:string,url:string,filename:string,folder:string) => write(db,'UPDATE media_assets SET public_id=?,secure_url=?,original_filename=?,folder_path=? WHERE id=? AND deleted_at IS NULL',[publicId,url,filename,folder,id]);
export const publicIdExists = async (db: Executor,publicId:string,id:number) => Boolean((await rows<RowDataPacket>(db,'SELECT id FROM media_assets WHERE provider=\'cloudinary\' AND public_id=? AND id<>? LIMIT 1',[publicId,id]))[0]);
export const mediaFolders = async (db: Executor) => rows<RowDataPacket>(db,'SELECT DISTINCT folder_path FROM media_assets WHERE deleted_at IS NULL AND folder_path IS NOT NULL ORDER BY folder_path');
export async function mediaReferenceCount(db: Executor, id: number, variantMedia=false) {
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
  const legacy=Number(result[0]?.count ?? 0);
  if(!variantMedia)return legacy;
  const variants=await rows<RowDataPacket>(db,'SELECT COUNT(*) AS count FROM product_variants WHERE media_id=?',[id]);
  return legacy+Number(variants[0]?.count??0);
}
