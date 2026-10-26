import {Router} from 'express';
import type {Pool} from 'mysql2/promise';
import type {Config} from '../config/env';
import {auth,csrf,permit} from '../middleware/auth';
import {asyncRoute} from '../utils/http';
import {getHomepageNewsSelection,saveHomepageNewsSelection} from '../services/homepageNewsSelection';

export function homepageNewsSelectionRoutes(config:Config,db:Pool){
 const router=Router(),signedIn=auth(config,db);
 router.get('/admin/homepage/news/selection',signedIn,permit('homepage.view'),asyncRoute(async(_req,res)=>{
  res.set('Cache-Control','no-store').json({data:await getHomepageNewsSelection(db,config.HOMEPAGE_NEWS_SELECTION_ENABLED)});
 }));
 router.patch('/admin/homepage/news/selection',signedIn,csrf(config),permit('homepage.update'),asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store').json({data:await saveHomepageNewsSelection(db,req.body,req.actor!.id,req.requestId,config.HOMEPAGE_NEWS_SELECTION_ENABLED)});
 }));
 return router;
}
