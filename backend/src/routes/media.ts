import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { auth, csrf, permit } from '../middleware/auth';
import { asyncRoute, HttpError, parse } from '../utils/http';
import * as repo from '../repositories/media';
import { audit } from '../repositories/audit';
import { transaction } from '../database/pool';
import { signedUpload, verifyUpload } from '../services/media';

const id = z.coerce.number().int().positive();
const destination = { scope:z.enum(['site','users','team','partners','products','services','projects','news','achievements']), entity:z.string().max(190).optional() };
export function mediaRoutes(config: Config,db: Pool) {
  const router = Router(); const requireAuth=auth(config,db); const requireCsrf=csrf(config);
  router.get('/admin/media',requireAuth,permit('media.view'),asyncRoute(async (req,res) => {
    const q=parse(z.strictObject({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}),req.query);
    res.set('Cache-Control','no-store').json({data:await repo.listMedia(db,q.limit,(q.page-1)*q.limit),meta:q});
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
  router.delete('/admin/media/:id',requireAuth,requireCsrf,permit('media.delete'),asyncRoute(async (req,res) => {
    const mediaId=parse(id,req.params.id);
    await transaction(db,async conn => {
      const before=await repo.mediaRecord(conn,mediaId); if (!before || before.deleted_at) throw new HttpError(404,'NOT_FOUND','Image not found.');
      if (await repo.mediaReferenceCount(conn,mediaId)) throw new HttpError(409,'MEDIA_REFERENCED','Replace references before deleting this image.');
      await repo.softDeleteMedia(conn,mediaId);
      await audit(conn,{actorId:req.actor!.id,action:'media.delete',entityType:'media_assets',entityId:mediaId,requestId:req.requestId,before});
    });
    res.json({data:{deleted:true}});
  }));
  return router;
}
