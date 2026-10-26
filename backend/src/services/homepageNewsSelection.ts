import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,write,transaction,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {HttpError,parse} from '../utils/http';
import {v2TableReady} from './v2Schema';

type Shape={modeColumn:'selection_mode'|'mode';articleColumn:'news_article_id'|'article_id'};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const request=z.strictObject({mode:z.enum(['latest','manual']),articleIds:z.array(z.number().int().positive()).max(4),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)});
export async function homepageNewsSchema(db:Executor):Promise<Shape|null>{
 const settings=await rows<RowDataPacket>(db,"SELECT COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='homepage_news_settings'");
 const mode=settings.find(row=>['selection_mode','mode'].includes(String(row.COLUMN_NAME))&&["'latest'","'manual'"].every(value=>String(row.COLUMN_TYPE).includes(value)));
 const modeColumn=mode?.COLUMN_NAME as Shape['modeColumn']|undefined;
 const placement=await rows<RowDataPacket>(db,"SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='homepage_news_article_placements' AND REFERENCED_TABLE_NAME='news_articles'");
 const articleColumn=placement.find(row=>['news_article_id','article_id'].includes(String(row.COLUMN_NAME)))?.COLUMN_NAME as Shape['articleColumn']|undefined;
 if(!modeColumn||!articleColumn)return null;
 if(!await v2TableReady(db,'homepage_news_settings',['id',modeColumn])||!await v2TableReady(db,'homepage_news_article_placements',['id',articleColumn,'position'],{[articleColumn]:'news_articles'},[[articleColumn],['position']]))return null;
 return {modeColumn,articleColumn};
}
async function read(db:Executor,shape:Shape,lock=false){
 const row=(await rows<RowDataPacket>(db,`SELECT ${shape.modeColumn} AS mode FROM homepage_news_settings WHERE id=1${lock?' FOR UPDATE':''}`))[0];
 if(!row||!['latest','manual'].includes(String(row.mode)))throw new HttpError(503,'NEWS_SELECTION_INCOMPLETE','Pengaturan artikel Homepage belum siap.');
 const placements=await rows<RowDataPacket>(db,`SELECT ${shape.articleColumn} AS article_id FROM homepage_news_article_placements ORDER BY position,id${lock?' FOR UPDATE':''}`);
 return {mode:String(row.mode) as 'latest'|'manual',articleIds:placements.map(item=>Number(item.article_id))};
}
export async function getHomepageNewsSelection(db:Executor,enabled=false){
 const shape=enabled?await homepageNewsSchema(db):null;
 if(!shape)return {enabled:false,reason:'DATABASE_MIGRATION_PENDING',mode:'latest',articleIds:[],version:null,popularEnabled:false};
 let value:Awaited<ReturnType<typeof read>>;
 try{value=await read(db,shape);}catch(error){if(error instanceof HttpError&&error.code==='NEWS_SELECTION_INCOMPLETE')return {enabled:false,reason:'REFERENCE_DATA_PENDING',mode:'latest',articleIds:[],version:null,popularEnabled:false};throw error;}
 const selectedArticles=value.articleIds.length?await rows<RowDataPacket>(db,`SELECT id,title,status,published_at FROM news_articles WHERE id IN (${value.articleIds.map(()=>'?').join(',')}) AND status='published' AND deleted_at IS NULL AND (published_at IS NULL OR published_at<=UTC_TIMESTAMP(3))`,value.articleIds):[];
 if(value.mode==='manual'&&(!selectedArticles.length||selectedArticles.length!==value.articleIds.length))return {enabled:false,reason:'REFERENCE_DATA_PENDING',...value,version:null,popularEnabled:false,selectedArticles:[]};
 selectedArticles.sort((a,b)=>value.articleIds.indexOf(Number(a.id))-value.articleIds.indexOf(Number(b.id)));
 return {...value,version:hash(value),enabled:true,popularEnabled:false,selectedArticles};
}
export async function saveHomepageNewsSelection(db:Pool,raw:unknown,actorId:number,requestId:string,enabled=false){
 const shape=enabled?await homepageNewsSchema(db):null;
 if(!shape)throw new HttpError(503,'FEATURE_UNAVAILABLE','Penyimpanan pilihan Artikel belum tersedia.');
 const input=parse(request,raw);
 if(new Set(input.articleIds).size!==input.articleIds.length)throw new HttpError(400,'VALIDATION_ERROR','Artikel tidak boleh dipilih dua kali.');
 if(input.mode==='manual'&&!input.articleIds.length)throw new HttpError(400,'VALIDATION_ERROR','Pilih setidaknya satu Artikel terbit untuk mode manual.');
 return transaction(db,async conn=>{
  const before=await read(conn,shape,true);
  if(hash(before)!==input.expectedVersion)throw new HttpError(409,'CONTENT_CHANGED','Pengaturan Artikel telah diubah anggota lain. Muat ulang.');
  if(input.articleIds.length){
   const found=await rows<RowDataPacket>(conn,`SELECT id FROM news_articles WHERE id IN (${input.articleIds.map(()=>'?').join(',')}) AND status='published' AND deleted_at IS NULL AND (published_at IS NULL OR published_at<=UTC_TIMESTAMP(3)) FOR UPDATE`,input.articleIds);
   if(found.length!==input.articleIds.length)throw new HttpError(400,'INVALID_REFERENCE','Pilih hanya Artikel yang sudah diterbitkan.');
  }
  const changed=input.mode!==before.mode||JSON.stringify(input.articleIds)!==JSON.stringify(before.articleIds);
  if(changed){
   await write(conn,`UPDATE homepage_news_settings SET ${shape.modeColumn}=?,updated_by=? WHERE id=1`,[input.mode,actorId]);
   await write(conn,'DELETE FROM homepage_news_article_placements');
   for(const [index,id] of input.articleIds.entries())await write(conn,`INSERT INTO homepage_news_article_placements (${shape.articleColumn},position) VALUES (?,?)`,[id,index+1]);
   const after={mode:input.mode,articleIds:input.articleIds};
   await revision(conn,{entityType:'homepage_news_settings:1',entityId:1,snapshot:after,actorId,summary:'Updated Homepage News selection'});
   await audit(conn,{actorId,action:'homepage.news.selection.update',entityType:'homepage_news_settings',entityId:1,requestId,before,after});
  }
  const value=await read(conn,shape);return {...value,version:hash(value),enabled:true,popularEnabled:false};
 });
}
export async function publicHomepageNews(db:Executor,enabled=false){
 const shape=enabled?await homepageNewsSchema(db):null;
 if(!shape)return null;
 let value:Awaited<ReturnType<typeof read>>;
 try{value=await read(db,shape);}catch(error){if(error instanceof HttpError&&error.code==='NEWS_SELECTION_INCOMPLETE')return null;throw error;}
 let selected:RowDataPacket[];
 if(value.mode==='manual'){
  if(!value.articleIds.length)return null;
  selected=await rows<RowDataPacket>(db,`SELECT id,title,slug,excerpt,category_id,cover_media_id,published_at FROM news_articles WHERE id IN (${value.articleIds.map(()=>'?').join(',')}) AND status='published' AND deleted_at IS NULL AND (published_at IS NULL OR published_at<=UTC_TIMESTAMP(3))`,value.articleIds);
  selected.sort((a,b)=>value.articleIds.indexOf(Number(a.id))-value.articleIds.indexOf(Number(b.id)));
 }else selected=await rows<RowDataPacket>(db,"SELECT id,title,slug,excerpt,category_id,cover_media_id,published_at FROM news_articles WHERE status='published' AND deleted_at IS NULL AND (published_at IS NULL OR published_at<=UTC_TIMESTAMP(3)) ORDER BY published_at DESC,id DESC LIMIT 4");
 if(value.mode==='manual'&&selected.length!==value.articleIds.length)return null;
 const ids=[...new Set(selected.map(item=>Number(item.cover_media_id)).filter(Boolean))];
 const media=ids.length?await rows<RowDataPacket>(db,`SELECT id,secure_url,alt_text,width_px,height_px FROM media_assets WHERE id IN (${ids.map(()=>'?').join(',')}) AND deleted_at IS NULL`,ids):[];
 return selected.slice(0,4).map(item=>({...item,image:media.find(asset=>Number(asset.id)===Number(item.cover_media_id))??null}));
}
