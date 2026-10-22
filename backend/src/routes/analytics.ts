import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { allowRoles, auth, csrf, permit } from '../middleware/auth';
import { asyncRoute, HttpError, parse } from '../utils/http';
import * as repo from '../repositories/analytics';
import * as content from '../services/content';
import { eventSchema, normalizeEvent } from '../services/analytics';

export function analyticsRoutes(config: Config,db: Pool) {
  const router=Router();const requireAuth=auth(config,db);const requireCsrf=csrf(config);
  router.post('/analytics/events',rateLimit({windowMs:60_000,limit:60,standardHeaders:'draft-8',legacyHeaders:false}),asyncRoute(async (req,res) => {
    const input=parse(eventSchema,req.body);
    const item=normalizeEvent(input,req.ip,req.get('user-agent'),config);
    const result=await repo.insertEvent(db,item);
    res.status(result.affectedRows ? 201 : 200).json({data:{accepted:true,deduplicated:!result.affectedRows}});
  }));
  router.get('/admin/dashboard',requireAuth,permit('dashboard.view'),asyncRoute(async (_req,res)=>{res.set('Cache-Control','no-store').json({data:await repo.dashboard(db)});}));
  router.get('/admin/analytics',requireAuth,permit('analytics.view'),asyncRoute(async (_req,res)=>{res.set('Cache-Control','no-store').json({data:await repo.analyticsSummary(db)});}));
  router.get('/admin/audit',requireAuth,allowRoles('super_admin','administrator','editor','author','viewer'),asyncRoute(async (req,res)=>{
    const q=parse(z.strictObject({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}),req.query);
    const [data,total]=await Promise.all([repo.auditList(db,q.limit,(q.page-1)*q.limit),repo.auditCount(db)]);
    res.set('Cache-Control','no-store').json({data,meta:{...q,total,totalPages:Math.ceil(total/q.limit)}});
  }));
  router.get('/admin/revisions/:resource/:key',requireAuth,asyncRoute(async (req,res)=>{
    const name=String(req.params.resource);const spec=content.getResource(name);
    if (!req.actor!.permissions.has(content.permissionFor(spec,'view'))) throw new HttpError(403,'FORBIDDEN','You do not have permission for this action.');
    const key=String(req.params.key);const row=await content.get(db,name,key);
    const entityType=spec.kind==='fixed'?`${spec.table}:${key}`:spec.table;
    const entityId=spec.kind==='fixed' && !/^\d+$/.test(key)?0:Number(row.id??row.slot);
    res.set('Cache-Control','no-store').json({data:await repo.revisionList(db,entityType,entityId)});
  }));
  router.post('/admin/revisions/:resource/:key/restore/:id',requireAuth,requireCsrf,asyncRoute(async (req,res)=>{
    const name=String(req.params.resource);const spec=content.getResource(name);
    if(['hero-settings','hero-trust-signals','hero-workspaces','hero-hotspots','contact-section-settings','achievement-section-settings'].includes(name)||name==='homepage-sections'&&['products','services','news'].includes(String(req.params.key)))throw new HttpError(409,'LEGACY_ROUTE_DISABLED','Gunakan editor khusus untuk mengubah bagian Homepage.');
    if (!req.actor!.permissions.has(content.permissionFor(spec,'update'))) throw new HttpError(403,'FORBIDDEN','You do not have permission for this action.');
    const key=String(req.params.key);const row=await content.get(db,name,key);
    const entityType=spec.kind==='fixed'?`${spec.table}:${key}`:spec.table;
    const entityId=spec.kind==='fixed' && !/^\d+$/.test(key)?0:Number(row.id??row.slot);
    const record=await repo.revisionRecord(db,parse(z.coerce.number().int().positive(),req.params.id),entityType,entityId);
    if (!record) throw new HttpError(404,'NOT_FOUND','Revision not found.');
    const snapshot=typeof record.snapshot_json==='string'?JSON.parse(record.snapshot_json):record.snapshot_json;
    const editable=Object.fromEntries(Object.keys(spec.fields).filter(field=>snapshot[field]!==undefined&&!(name==='achievements'&&field==='sort_order')).map(field=>[field,typeof snapshot[field]==='number' && ['is_active','is_visible','is_enabled','is_featured','is_cover','is_primary','intro_enabled'].includes(field)?Boolean(snapshot[field]):snapshot[field]]));
    if (!Object.keys(editable).length) throw new HttpError(409,'INVALID_REVISION','This revision has no restorable fields.');
    res.json({data:await content.update(db,name,key,editable,req.actor!,req.requestId)});
  }));
  return router;
}
