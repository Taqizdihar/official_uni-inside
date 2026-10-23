import type {Executor} from '../database/pool';
import {rows} from '../database/pool';
import type {RowDataPacket} from 'mysql2/promise';
import {HttpError} from '../utils/http';
import {sectionFolders,type MediaSection} from './mediaSections';

export function mediaSectionForPermission(permission:string):MediaSection|null {
  if(['products','services','news'].includes(permission))return 'postingan';
  if(['team','partners','achievements','homepage'].includes(permission))return 'utama';
  if(permission==='projects')return 'lanjutan';
  if(permission==='settings')return 'pengaturan';
  if(permission==='users')return 'administrasi';
  return null;
}
export async function validateMediaIds(db:Executor,ids:number[],section:MediaSection,root:string){
  const unique=[...new Set(ids.filter(Boolean))];
  if(!unique.length)return [];
  const folders=sectionFolders(section,root);
  const conditions=folders.map(()=>'(folder_path=? OR folder_path LIKE ?)').join(' OR ');
  const found=await rows<RowDataPacket>(db,`SELECT id,alt_text,caption,format,width_px,height_px FROM media_assets WHERE id IN (${unique.map(()=>'?').join(',')}) AND deleted_at IS NULL AND resource_type='image' AND (${conditions})`,[...unique,...folders.flatMap(folder=>[folder,`${folder}/%`])]);
  if(found.length!==unique.length)throw new HttpError(400,'INVALID_MEDIA','Pilih gambar yang tersedia di Bagian yang sesuai.');
  return found;
}
