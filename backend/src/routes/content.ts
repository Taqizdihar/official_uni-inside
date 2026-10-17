import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { auth, csrf, permit } from '../middleware/auth';
import * as repo from '../repositories/content';
import { audit, revision } from '../repositories/audit';
import { transaction } from '../database/pool';
import * as content from '../services/content';
import { resources } from '../schemas/resources';
import { asyncRoute, HttpError, parse } from '../utils/http';

const pagination = z.strictObject({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), categoryId: z.coerce.number().int().positive().optional() });
const publicNames = ['team-members','partners','products','services','projects','news','achievements'] as const;
const coreDetails = new Set(['products','services','projects','news']);
export function publicContentRoutes(db: Pool) {
  const router = Router();
  router.get('/site', asyncRoute(async (_req,res) => { res.set('Cache-Control','public, max-age=60').json({ data: await repo.publicSite(db) }); }));
  router.get('/homepage', asyncRoute(async (_req,res) => {
    const settings = await repo.publicHomepageSettings(db);
    const featured = Object.fromEntries(await Promise.all(publicNames.map(async name => [name, await repo.publicList(db,resources[name]!,name === 'products' || name === 'news' ? 6 : 12,0)])));
    res.set('Cache-Control','public, max-age=60').json({ data: { ...settings, featured } });
  }));
  for (const name of publicNames) {
    router.get(`/${name}`, asyncRoute(async (req,res) => {
      const q = parse(pagination, req.query);
      res.set('Cache-Control','public, max-age=60').json({ data: await repo.publicList(db,resources[name]!,q.limit,(q.page-1)*q.limit,q.categoryId), meta: { page:q.page,limit:q.limit } });
    }));
    if (coreDetails.has(name)) router.get(`/${name}/:slug`, asyncRoute(async (req,res) => {
      const slug = parse(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(190),req.params.slug);
      const data = await repo.publicDetail(db,resources[name]!,slug);
      if (!data) throw new HttpError(404,'NOT_FOUND','Content not found.');
      res.set('Cache-Control','public, max-age=60').json({ data });
    }));
  }
  return router;
}
export function adminContentRoutes(config: Config, db: Pool) {
  const router = Router();
  const requireAuth = auth(config,db); const requireCsrf = csrf(config);
  router.put('/admin/projects/:key/services', requireAuth, requireCsrf, permit('projects.update'), asyncRoute(async (req,res) => {
    const id = parse(z.coerce.number().int().positive(),req.params.key);
    const input = parse(z.strictObject({ ids:z.array(z.number().int().positive()).max(100) }),req.body);
    await transaction(db, async conn => {
      const project = await repo.record(conn,resources.projects!,id,true);
      if (!project) throw new HttpError(404,'NOT_FOUND','Project not found.');
      await repo.replaceProjectRelations(conn,id,'project_services','service_id',[...new Set(input.ids)]);
      await revision(conn,{entityType:'projects',entityId:id,snapshot:{...project,serviceIds:input.ids},actorId:req.actor!.id,summary:'Updated services'});
      await audit(conn,{actorId:req.actor!.id,action:'projects.services.update',entityType:'projects',entityId:id,requestId:req.requestId,after:{serviceIds:input.ids}});
    });
    res.json({data:{serviceIds:input.ids}});
  }));
  router.put('/admin/projects/:key/team-members', requireAuth, requireCsrf, permit('projects.update'), asyncRoute(async (req,res) => {
    const id = parse(z.coerce.number().int().positive(),req.params.key);
    const input = parse(z.strictObject({ ids:z.array(z.number().int().positive()).max(100) }),req.body);
    await transaction(db, async conn => {
      const project = await repo.record(conn,resources.projects!,id,true);
      if (!project) throw new HttpError(404,'NOT_FOUND','Project not found.');
      await repo.replaceProjectRelations(conn,id,'project_team_members','team_member_id',[...new Set(input.ids)]);
      await revision(conn,{entityType:'projects',entityId:id,snapshot:{...project,teamMemberIds:input.ids},actorId:req.actor!.id,summary:'Updated team members'});
      await audit(conn,{actorId:req.actor!.id,action:'projects.team.update',entityType:'projects',entityId:id,requestId:req.requestId,after:{teamMemberIds:input.ids}});
    });
    res.json({data:{teamMemberIds:input.ids}});
  }));
  router.get('/admin/:resource', requireAuth, asyncRoute(async (req,res) => {
    const spec = content.getResource(String(req.params.resource));
    if (!req.actor!.permissions.has(content.permissionFor(spec,'view'))) throw new HttpError(403,'FORBIDDEN','You do not have permission for this action.');
    const q = parse(z.strictObject({ page:z.coerce.number().int().positive().default(1), limit:z.coerce.number().int().min(1).max(100).default(20), sort:z.string().optional(), direction:z.enum(['asc','desc']).default('asc') }),req.query);
    const sort = q.sort ?? (spec.fields.sort_order ? 'sort_order' : spec.key);
    if (sort !== spec.key && !Object.hasOwn(spec.fields,sort)) throw new HttpError(400,'VALIDATION_ERROR','This sort field is not supported.');
    res.set('Cache-Control','no-store').json({ data:await repo.listRecords(db,spec,q.limit,(q.page-1)*q.limit,sort,q.direction.toUpperCase() as 'ASC'|'DESC'),meta:{page:q.page,limit:q.limit,total:await repo.countRecords(db,spec)} });
  }));
  router.get('/admin/:resource/:key', requireAuth, asyncRoute(async (req,res) => {
    const spec = content.getResource(String(req.params.resource));
    if (!req.actor!.permissions.has(content.permissionFor(spec,'view'))) throw new HttpError(403,'FORBIDDEN','You do not have permission for this action.');
    res.set('Cache-Control','no-store').json({ data:await content.get(db,String(req.params.resource),String(req.params.key)) });
  }));
  router.post('/admin/:resource', requireAuth, requireCsrf, asyncRoute(async (req,res) => {
    res.status(201).json({ data:await content.create(db,String(req.params.resource),req.body,req.actor!,req.requestId) });
  }));
  router.patch('/admin/:resource/:key', requireAuth, requireCsrf, asyncRoute(async (req,res) => {
    res.json({ data:await content.update(db,String(req.params.resource),String(req.params.key),req.body,req.actor!,req.requestId) });
  }));
  router.delete('/admin/:resource/:key', requireAuth, requireCsrf, asyncRoute(async (req,res) => {
    res.json({ data:await content.remove(db,String(req.params.resource),String(req.params.key),req.actor!,req.requestId) });
  }));
  return router;
}
