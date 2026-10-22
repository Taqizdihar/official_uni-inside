import type {Pool,RowDataPacket} from 'mysql2/promise';
import {rows,transaction,write} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {HttpError} from '../utils/http';

export async function reorderAchievements(db:Pool,ids:number[],expectedIds:number[],actorId:number,requestId:string,canPublish:boolean){
  if(new Set(ids).size!==ids.length)throw new HttpError(400,'VALIDATION_ERROR','Achievement tidak boleh berulang.');
  if(new Set(expectedIds).size!==expectedIds.length)throw new HttpError(400,'VALIDATION_ERROR','Urutan sebelumnya tidak valid.');
  return transaction(db,async conn=>{
    const current=await rows<RowDataPacket>(conn,'SELECT id,sort_order,status FROM achievements WHERE deleted_at IS NULL ORDER BY sort_order ASC,id ASC FOR UPDATE');
    if(current.some(row=>row.status==='published')&&!canPublish)throw new HttpError(403,'FORBIDDEN','Hanya penerbit yang dapat mengurutkan Achievement yang sudah terbit.');
    const currentIds=current.map(row=>Number(row.id));
    if(ids.length!==current.length||ids.length>65536||ids.some(id=>!currentIds.includes(id))||expectedIds.join(',')!==currentIds.join(','))throw new HttpError(409,'ORDER_CHANGED','Daftar Achievement telah berubah. Muat ulang sebelum menyimpan urutan.');
    for(const [index,id] of ids.entries())await write(conn,'UPDATE achievements SET sort_order=?,updated_by=? WHERE id=?',[index,actorId,id]);
    await revision(conn,{entityType:'achievements-order',entityId:0,snapshot:{ids},actorId,summary:'Reordered Achievements'});
    await audit(conn,{actorId,action:'achievements.reorder',entityType:'achievements-order',entityId:0,requestId,before:currentIds,after:ids});
    return {ids};
  });
}
