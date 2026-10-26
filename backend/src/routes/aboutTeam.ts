import {Router} from 'express';
import {z} from 'zod';
import type {Pool} from 'mysql2/promise';
import type {Config} from '../config/env';
import {auth,csrf,permit,allowRoles} from '../middleware/auth';
import {asyncRoute,parse} from '../utils/http';
import {getAbout,getTeam,saveAbout,saveTeam,updateTeamTemplate} from '../services/aboutTeam';
import {listHomepageCollection,saveHomepageCollection,type HomepageCollection} from '../services/homepageCollections';
import {remove} from '../services/content';
import {getAboutEditorial,saveAboutEditorial} from '../services/aboutEditorialV2';

export function aboutTeamRoutes(config:Config,db:Pool){
  const router=Router(),signedIn=auth(config,db),mutate=csrf(config);
  router.get('/admin/homepage/about',signedIn,permit('homepage.view'),asyncRoute(async(_req,res)=>{res.set('Cache-Control','no-store').json({data:{...await getAbout(db),managedPartners:config.PARTNERS_PUBLIC_ENABLED}});}));
  router.patch('/admin/homepage/about',signedIn,mutate,permit('homepage.update'),asyncRoute(async(req,res)=>{res.set('Cache-Control','no-store').json({data:{...await saveAbout(db,req.body,req.actor!.id,req.requestId),managedPartners:config.PARTNERS_PUBLIC_ENABLED}});}));
  router.get('/admin/homepage/about/editorial',signedIn,permit('homepage.view'),asyncRoute(async(_req,res)=>{res.set('Cache-Control','no-store').json({data:await getAboutEditorial(db,config.ABOUT_EDITORIAL_V2_ENABLED)});}));
  router.patch('/admin/homepage/about/editorial',signedIn,mutate,permit('homepage.update'),asyncRoute(async(req,res)=>{res.set('Cache-Control','no-store').json({data:await saveAboutEditorial(db,req.body,req.actor!.id,req.requestId,config.ABOUT_EDITORIAL_V2_ENABLED)});}));
  router.get('/admin/homepage/team',signedIn,permit('homepage.view'),asyncRoute(async(req,res)=>{res.set('Cache-Control','no-store').json({data:await getTeam(db,req.actor!.roleCode,config.TEAM_MEMBERS_PUBLIC_ENABLED,config.TEAM_TEMPLATE_ENABLED)});}));
  router.patch('/admin/homepage/team',signedIn,mutate,permit('homepage.update'),asyncRoute(async(req,res)=>{res.set('Cache-Control','no-store').json({data:await saveTeam(db,req.body,req.actor!.id,req.actor!.roleCode,config.TEAM_MEMBERS_PUBLIC_ENABLED,req.requestId,config.TEAM_TEMPLATE_ENABLED)});}));
  router.patch('/admin/homepage/team/template',signedIn,mutate,allowRoles('super_admin','administrator'),asyncRoute(async(req,res)=>{res.set('Cache-Control','no-store').json({data:await updateTeamTemplate(db,req.body,req.actor!.id,req.actor!.roleCode,req.requestId,config.TEAM_TEMPLATE_ENABLED)});}));
  for(const [kind,path,scope] of [
    ['team-members','/admin/homepage/team/members','team'],
    ['partners','/admin/homepage/about/partners','partners'],
  ] as [HomepageCollection,string,string][]){
    router.get(path,signedIn,permit(`${scope}.view`),asyncRoute(async(req,res)=>{
      const q=parse(z.strictObject({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().min(1).max(24).default(12),search:z.string().trim().min(1).max(100).optional(),status:z.enum(['draft','published','archived']).optional()}),req.query);
      const result=await listHomepageCollection(db,kind,q);
      res.set('Cache-Control','no-store').json({data:result.items,meta:{page:q.page,limit:q.limit,total:result.total,totalPages:Math.ceil(result.total/q.limit)}});
    }));
    router.post(path,signedIn,mutate,permit(`${scope}.create`),asyncRoute(async(req,res)=>{res.status(201).json({data:await saveHomepageCollection(db,kind,null,req.body,req.actor!,req.requestId,config.CLOUDINARY_ROOT_FOLDER)});}));
    router.patch(`${path}/:id`,signedIn,mutate,permit(`${scope}.update`),asyncRoute(async(req,res)=>{res.json({data:await saveHomepageCollection(db,kind,parse(z.coerce.number().int().positive(),req.params.id),req.body,req.actor!,req.requestId,config.CLOUDINARY_ROOT_FOLDER)});}));
    router.delete(`${path}/:id`,signedIn,mutate,permit(`${scope}.archive`),asyncRoute(async(req,res)=>{res.json({data:await remove(db,kind,String(parse(z.coerce.number().int().positive(),req.params.id)),req.actor!,req.requestId)});}));
  }
  return router;
}
