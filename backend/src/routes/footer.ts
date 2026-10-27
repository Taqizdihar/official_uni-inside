import {Router} from 'express';
import {z} from 'zod';
import type {Pool} from 'mysql2/promise';
import type {Config} from '../config/env';
import {auth,csrf,permit} from '../middleware/auth';
import * as content from '../services/content';
import {getFooterV2,saveFooterV2} from '../services/footerV2';
import {asyncRoute,parse} from '../utils/http';

export const footerSettingsSchema=z.strictObject({
  footer_description:z.string().trim().max(1000).nullable(),
  public_email:z.union([z.email().max(254),z.null()]),
  public_phone:z.union([z.string().trim().min(5).max(50).regex(/^[+0-9().\s-]+$/).refine(value=>value.replace(/\D/g,'').length>=5),z.null()]),
  address_text:z.string().trim().max(500).nullable(),
});
const fields=['footer_description','public_email','public_phone','address_text'] as const;
const present=(record:Record<string,unknown>)=>Object.fromEntries(fields.map(key=>[key,record[key]??null]));
const pendingCapabilities=(enabled:boolean)=>({footerBaseSettings:{enabled:true},footerSocialPlacements:{enabled:false,reason:enabled?'DATABASE_MIGRATION_PENDING':'FEATURE_DISABLED'},footerMapsEmbed:{enabled:false,reason:enabled?'DATABASE_MIGRATION_PENDING':'FEATURE_DISABLED'}}) as const;

export function footerRoutes(config:Config,db:Pool){
  const router=Router(),signedIn=auth(config,db);
  router.get('/admin/footer',signedIn,permit('settings.view'),asyncRoute(async(_req,res)=>{
    const v2=await getFooterV2(db,config.FOOTER_V2_ENABLED);
    if(v2){res.set('Cache-Control','no-store').json({data:v2});return;}
    const record=await content.get(db,'site-settings','1');
    res.set('Cache-Control','no-store').json({data:{settings:present(record),capabilities:pendingCapabilities(config.FOOTER_V2_ENABLED)}});
  }));
  router.patch('/admin/footer',signedIn,csrf(config),permit('settings.update'),asyncRoute(async(req,res)=>{
    const v2=await getFooterV2(db,config.FOOTER_V2_ENABLED);
    if(v2){res.set('Cache-Control','no-store').json({data:await saveFooterV2(db,req.body,req.actor!.id,req.requestId)});return;}
    const input=parse(footerSettingsSchema,req.body);
    const record=await content.update(db,'site-settings','1',input,req.actor!,req.requestId);
    res.set('Cache-Control','no-store').json({data:{settings:present(record),capabilities:pendingCapabilities(config.FOOTER_V2_ENABLED)}});
  }));
  return router;
}
