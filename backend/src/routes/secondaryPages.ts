import {Router} from 'express';
import {z} from 'zod';
import type {Pool} from 'mysql2/promise';
import type {Config} from '../config/env';
import {auth,csrf,permit} from '../middleware/auth';
import {asyncRoute,parse} from '../utils/http';
import {secondaryNames} from '../contracts/secondaryPages';
import {getSecondaryPage,saveSecondaryPage} from '../services/secondaryPages';
export function secondaryPageRoutes(config:Config,db:Pool){
 const router=Router(),signedIn=auth(config,db);
 router.get('/admin/secondary-pages/:page',signedIn,permit('settings.view'),asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store').json({data:await getSecondaryPage(db,parse(z.enum(secondaryNames),req.params.page),config.SECONDARY_PROJECTS_ENABLED,config.SECONDARY_CONTENT_SLOTS_ENABLED)});
 }));
 router.patch('/admin/secondary-pages/:page',signedIn,csrf(config),permit('settings.update'),asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store').json({data:await saveSecondaryPage(db,parse(z.enum(secondaryNames),req.params.page),req.body,req.actor!.id,req.requestId,config.SECONDARY_PROJECTS_ENABLED,config.SECONDARY_CONTENT_SLOTS_ENABLED,config.CLOUDINARY_ROOT_FOLDER)});
 }));
 return router;
}
