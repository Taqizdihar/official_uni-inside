import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { Config } from '../config/env';
import { auth,csrf,permit } from '../middleware/auth';
import { cmsCapabilities,requireCapability } from '../services/capabilities';
import * as social from '../services/socialMedia';
import { whatsappOptions } from '../repositories/socialMedia';
import { asyncRoute,HttpError,parse } from '../utils/http';

const idParam=z.coerce.number().int().positive();
export function socialMediaRoutes(config:Config,db:Pool){
  const router=Router(),signedIn=auth(config,db),mutate=csrf(config);
  const ready=async()=>{const capability=(await cmsCapabilities(db,config)).socialMediaV2;requireCapability(capability);};
  router.get('/admin/social-media/capabilities',signedIn,asyncRoute(async(_req,res)=>{res.set('Cache-Control','no-store').json({data:await cmsCapabilities(db,config)});}));
  router.get('/admin/social-media/platforms',signedIn,permit('settings.view'),asyncRoute(async(req,res)=>{await ready();res.set('Cache-Control','no-store').json({data:await social.listPlatforms(db,req.actor!)});}));
  router.get('/admin/social-media/accounts',signedIn,permit('settings.view'),asyncRoute(async(req,res)=>{await ready();res.set('Cache-Control','no-store').json({data:await social.listAccounts(db,req.actor!)});}));
  router.get('/admin/social-media/accounts/:id',signedIn,permit('settings.view'),asyncRoute(async(req,res)=>{await ready();res.set('Cache-Control','no-store').json({data:await social.getAccount(db,parse(idParam,req.params.id),req.actor!)});}));
  router.get('/admin/social-media/whatsapp-options',signedIn,asyncRoute(async(req,res)=>{
    if(!req.actor?.permissions.has('products.create')&&!req.actor?.permissions.has('settings.view'))throw new HttpError(403,'FORBIDDEN','Anda tidak memiliki izin melihat pilihan WhatsApp.');
    await ready();res.set('Cache-Control','no-store').json({data:await whatsappOptions(db)});
  }));
  router.post('/admin/social-media/accounts',signedIn,mutate,permit('settings.update'),asyncRoute(async(req,res)=>{await ready();res.status(201).json({data:await social.createAccount(db,req.body,req.actor!,req.requestId)});}));
  router.patch('/admin/social-media/accounts/:id',signedIn,mutate,permit('settings.update'),asyncRoute(async(req,res)=>{await ready();res.json({data:await social.updateAccount(db,parse(idParam,req.params.id),req.body,req.actor!,req.requestId)});}));
  router.delete('/admin/social-media/accounts/:id',signedIn,mutate,permit('settings.update'),asyncRoute(async(req,res)=>{await ready();res.json({data:await social.deleteAccount(db,parse(idParam,req.params.id),req.actor!,req.requestId)});}));
  return router;
}
