import {Router} from 'express';
import type {Pool} from 'mysql2/promise';
import type {Config} from '../config/env';
import {auth,csrf,permit} from '../middleware/auth';
import {asyncRoute} from '../utils/http';
import {getContactPlacements,saveContactPlacements} from '../services/contactPlacements';

export function contactPlacementRoutes(config:Config,db:Pool){
 const router=Router(),signedIn=auth(config,db);
 router.get('/admin/homepage/contact/placements',signedIn,permit('homepage.view'),asyncRoute(async(_req,res)=>{
  res.set('Cache-Control','no-store').json({data:await getContactPlacements(db,config.CONTACT_PLACEMENTS_ENABLED)});
 }));
 router.patch('/admin/homepage/contact/placements',signedIn,csrf(config),permit('homepage.update'),asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store').json({data:await saveContactPlacements(db,req.body,req.actor!.id,req.requestId,config.CONTACT_PLACEMENTS_ENABLED)});
 }));
 return router;
}
