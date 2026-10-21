import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { auth, csrf, permit } from '../middleware/auth';
import { asyncRoute, HttpError, parse } from '../utils/http';
import * as repo from '../repositories/media';
import { audit } from '../repositories/audit';
import { transaction } from '../database/pool';
import { signedUpload, verifyUpload,safeMediaName,renameCloudinary,moveCloudinary,deleteCloudinary,type StoredMedia } from '../services/media';
import { cmsCapabilities } from '../services/capabilities';

const id = z.coerce.number().int().positive();
const destination = { scope:z.enum(['site','users','team','partners','products','services','projects','news','achievements']), entity:z.string().max(190).optional() };
const groups:Record<string,string[]>={postingan:['products','services','news'],utama:['team','partners','achievements'],lanjutan:['projects'],pengaturan:['site'],administrasi:['users']};
const knownScopes=[...new Set(Object.values(groups).flat())];
const auditMedia=(item:unknown)=>{const value=item as {public_id?:string;original_filename?:string;folder_path?:string}|undefined;return {publicId:value?.public_id,name:value?.original_filename,folder:value?.folder_path};};
export function mediaRoutes(config: Config,db: Pool) {
  const router = Router(); const requireAuth=auth(config,db); const requireCsrf=csrf(config);
  router.get('/admin/media',requireAuth,permit('media.view'),asyncRoute(async (req,res) => {
    const q=parse(z.strictObject({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().min(1).max(100).default(20),search:z.string().max(100).optional(),folder:z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/).optional(),scope:z.enum(['site','users','team','partners','products','services','projects','news','achievements']).optional(),group:z.enum(['postingan','utama','lanjutan','pengaturan','administrasi','lainnya']).optional(),sort:z.enum(['created_at','bytes_size','original_filename']).default('created_at'),direction:z.enum(['asc','desc']).default('desc')}),req.query);
    if([q.scope,q.folder,q.group].filter(Boolean).length>1)throw new HttpError(400,'VALIDATION_ERROR','Choose one folder filter.');
    const root=config.CLOUDINARY_ROOT_FOLDER;
    const filters:repo.MediaFilters={search:q.search,folders:q.group&&q.group!=='lainnya'?groups[q.group]!.map(scope=>`${root}/${scope}`):q.scope?[`${root}/${q.scope}`]:q.folder?[q.folder]:undefined,otherFolders:q.group==='lainnya'?knownScopes.map(scope=>`${root}/${scope}`):undefined,sort:q.sort,direction:q.direction.toUpperCase() as 'ASC'|'DESC'};
    const [data,total]=await Promise.all([repo.listMedia(db,q.limit,(q.page-1)*q.limit,filters),repo.countMedia(db,filters)]);
    res.set('Cache-Control','no-store').json({data,meta:{page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)}});
  }));
  router.get('/admin/media/folders',requireAuth,permit('media.view'),asyncRoute(async (_req,res)=>{
    const known=await repo.mediaFolders(db);
    res.set('Cache-Control','no-store').json({data:known.map(row=>String(row.folder_path))});
  }));
  router.post('/admin/media/sign-upload',requireAuth,requireCsrf,permit('media.upload'),asyncRoute(async (req,res) => {
    const input=parse(z.strictObject(destination),req.body);
    res.json({data:signedUpload(config,input.scope,input.entity)});
  }));
  router.post('/admin/media/finalize',requireAuth,requireCsrf,permit('media.upload'),asyncRoute(async (req,res) => {
    const input=parse(z.strictObject({...destination,publicId:z.string().min(1).max(255),altText:z.string().max(255).nullable().optional(),caption:z.string().max(500).nullable().optional()}),req.body);
    const verified=await verifyUpload(config,input.publicId,input.scope,input.entity);
    const asset=await transaction(db,async conn => {
      const result=await repo.insertMedia(conn,{...verified,alt:input.altText??null,caption:input.caption??null,actorId:req.actor!.id});
      await audit(conn,{actorId:req.actor!.id,action:'media.create',entityType:'media_assets',entityId:Number(result.insertId),requestId:req.requestId,after:{publicId:verified.publicId,format:verified.format}});
      return repo.mediaRecord(conn,Number(result.insertId));
    });
    res.status(201).json({data:asset});
  }));
  router.get('/admin/media/:id',requireAuth,permit('media.view'),asyncRoute(async (req,res)=>{
    const item=await repo.mediaRecord(db,parse(id,req.params.id));
    if(!item||item.deleted_at)throw new HttpError(404,'NOT_FOUND','Image not found.');
    res.set('Cache-Control','no-store').json({data:item});
  }));
  router.patch('/admin/media/:id',requireAuth,requireCsrf,permit('media.update'),asyncRoute(async (req,res) => {
    const mediaId=parse(id,req.params.id); const input=parse(z.strictObject({altText:z.string().max(255).nullable(),caption:z.string().max(500).nullable()}).partial(),req.body);
    if(!Object.keys(input).length)throw new HttpError(400,'VALIDATION_ERROR','Provide alt text or a caption.');
    const changed=await transaction(db,async conn => {
      const before=await repo.mediaRecord(conn,mediaId); if (!before || before.deleted_at) throw new HttpError(404,'NOT_FOUND','Image not found.');
      await repo.updateMedia(conn,mediaId,input.altText===undefined?before.alt_text:input.altText,input.caption===undefined?before.caption:input.caption);
      const after=await repo.mediaRecord(conn,mediaId);
      await audit(conn,{actorId:req.actor!.id,action:'media.update',entityType:'media_assets',entityId:mediaId,requestId:req.requestId,before,after});
      return after;
    });
    res.json({data:changed});
  }));
  router.patch('/admin/media/:id/rename',requireAuth,requireCsrf,permit('media.update'),asyncRoute(async (req,res)=>{
    const mediaId=parse(id,req.params.id);const {name,slug}=safeMediaName(parse(z.strictObject({name:z.string()}),req.body).name);
    const variantMediaReady=config.PRODUCT_VARIANT_MEDIA_ENABLED&&(await cmsCapabilities(db,config)).productVariantMedia.enabled;
    const rollback:{current?:{item:StoredMedia;oldId:string}}={};
    try {
      const changed=await transaction(db,async conn=>{
        const before=await repo.mediaRecord(conn,mediaId,true);if(!before||before.deleted_at)throw new HttpError(404,'NOT_FOUND','Image not found.');
        if(await repo.mediaReferenceCount(conn,mediaId,variantMediaReady))throw new HttpError(409,'MEDIA_REFERENCED','Replace content references before renaming.');
        const targetId=`${before.public_id.slice(0,before.public_id.lastIndexOf('/'))}/${slug}`;
        if(targetId===before.public_id)throw new HttpError(400,'NO_CHANGE','Choose a different name.');
        if(await repo.publicIdExists(conn,targetId,mediaId))throw new HttpError(409,'ALREADY_EXISTS','The image name is already used.');
        const url=await renameCloudinary(config,before as StoredMedia,targetId);
        rollback.current={item:{...before,public_id:targetId,secure_url:url} as StoredMedia,oldId:before.public_id};
        await repo.updateLocation(conn,mediaId,targetId,url,name,before.folder_path);
        const after=await repo.mediaRecord(conn,mediaId);
        await audit(conn,{actorId:req.actor!.id,action:'media.rename',entityType:'media_assets',entityId:mediaId,requestId:req.requestId,before:auditMedia(before),after:auditMedia(after)});
        return after;
      });
      res.json({data:changed});
    }catch(error){if(rollback.current){try{await renameCloudinary(config,rollback.current.item,rollback.current.oldId);}catch{throw new HttpError(503,'MEDIA_SYNC_FAILED','The image changed in Cloudinary, but the CMS could not save it. Contact an administrator.');}}throw error;}
  }));
  router.patch('/admin/media/:id/move',requireAuth,requireCsrf,permit('media.update'),asyncRoute(async (req,res)=>{
    const mediaId=parse(id,req.params.id);const {folder}=parse(z.strictObject({folder:z.string().max(255)}),req.body);
    const variantMediaReady=config.PRODUCT_VARIANT_MEDIA_ENABLED&&(await cmsCapabilities(db,config)).productVariantMedia.enabled;
    const root=config.CLOUDINARY_ROOT_FOLDER;
    const base=['site','users','team','partners','achievements'].map(scope=>`${root}/${scope}`);
    const existing=(await repo.mediaFolders(db)).map(row=>String(row.folder_path));
    if(!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(folder)||![...base,...existing].includes(folder)||!folder.startsWith(`${root}/`))throw new HttpError(400,'INVALID_MEDIA_FOLDER','Choose an available destination.');
    const rollback:{current?:{item:StoredMedia;oldFolder:string}}={};
    try{
      const changed=await transaction(db,async conn=>{
        const before=await repo.mediaRecord(conn,mediaId,true);if(!before||before.deleted_at)throw new HttpError(404,'NOT_FOUND','Image not found.');
        if(!before.folder_path||!before.folder_path.startsWith(`${root}/`))throw new HttpError(400,'INVALID_MEDIA_FOLDER','The current image folder is not available.');
        if(before.folder_path===folder)throw new HttpError(400,'NO_CHANGE','Choose a different folder.');
        if(await repo.mediaReferenceCount(conn,mediaId,variantMediaReady))throw new HttpError(409,'MEDIA_REFERENCED','Replace content references before moving.');
        await moveCloudinary(config,before as StoredMedia,folder);
        rollback.current={item:before as StoredMedia,oldFolder:before.folder_path};
        await repo.updateLocation(conn,mediaId,before.public_id,before.secure_url,before.original_filename,folder);
        const after=await repo.mediaRecord(conn,mediaId);
        await audit(conn,{actorId:req.actor!.id,action:'media.move',entityType:'media_assets',entityId:mediaId,requestId:req.requestId,before:auditMedia(before),after:auditMedia(after)});
        return after;
      });
      res.json({data:changed});
    }catch(error){if(rollback.current){try{await moveCloudinary(config,rollback.current.item,rollback.current.oldFolder);}catch{throw new HttpError(503,'MEDIA_SYNC_FAILED','The image moved in Cloudinary, but the CMS could not save it. Contact an administrator.');}}throw error;}
  }));
  router.delete('/admin/media/:id',requireAuth,requireCsrf,permit('media.delete'),asyncRoute(async (req,res) => {
    const mediaId=parse(id,req.params.id);
    const variantMediaReady=config.PRODUCT_VARIANT_MEDIA_ENABLED&&(await cmsCapabilities(db,config)).productVariantMedia.enabled;
    const state:{cloudinary?:'deleted'|'not_found'}={};
    try {
      const outcome=await transaction(db,async conn => {
        const before=await repo.mediaRecord(conn,mediaId,true); if (!before || before.deleted_at) throw new HttpError(404,'NOT_FOUND','Image not found.');
        if (await repo.mediaReferenceCount(conn,mediaId,variantMediaReady)) throw new HttpError(409,'MEDIA_REFERENCED','Replace references before deleting this image.');
        state.cloudinary=await deleteCloudinary(config,before as StoredMedia);
        await repo.softDeleteMedia(conn,mediaId);
        await audit(conn,{actorId:req.actor!.id,action:'media.delete',entityType:'media_assets',entityId:mediaId,requestId:req.requestId,before:auditMedia(before)});
        return state.cloudinary;
      });
      res.json({data:{deleted:true,cloudinary:outcome}});
    } catch(error){if(state.cloudinary)throw new HttpError(503,'MEDIA_DATABASE_FAILED','Cloudinary deleted the image, but the CMS could not save the change. Retry to finish cleanup.');throw error;}
  }));
  return router;
}
