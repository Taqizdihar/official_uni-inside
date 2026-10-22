import { z } from 'zod';
import { hashToken } from '../utils/security';
import type { Config } from '../config/env';
import { HttpError } from '../utils/http';
import {validButtonDestination} from './homepageSections';
const validLegacyHttp=(value:string)=>{try{const url=new URL(value);return /^http:\/\//i.test(value)&&url.protocol==='http:'&&!url.username&&!url.password&&!/\s|\\/u.test(value);}catch{return false;}};

export const eventSchema = z.strictObject({
  eventUuid:z.uuid(), eventName:z.enum(['page_view','product_view','product_purchase_link_click','service_view','news_view','cta_click']),
  pagePath:z.string().min(1).max(500).optional(), entityType:z.enum(['product','service','news']).optional(),
  entityId:z.number().int().positive().optional(), linkDestination:z.string().max(1000).refine(value=>validButtonDestination(value)||validLegacyHttp(value),'Use a safe site path or HTTP(S) destination').optional(), referrerHost:z.string().max(255).optional(),
});
export type EventInput = z.infer<typeof eventSchema>;
export function normalizeEvent(input: EventInput, ip: string | undefined, agent: string | undefined, config: Config) {
  const needsEntity = ['product_view','product_purchase_link_click','service_view','news_view'].includes(input.eventName);
  const type = input.eventName.startsWith('product') ? 'product' : input.eventName === 'service_view' ? 'service' : input.eventName === 'news_view' ? 'news' : null;
  if (needsEntity && (!input.entityId || input.entityType !== type)) throw new HttpError(400,'VALIDATION_ERROR','Select the matching content item for this event.');
  if (!needsEntity && (input.entityType || input.entityId)) throw new HttpError(400,'VALIDATION_ERROR','This event does not accept a content item.');
  if (input.eventName === 'product_purchase_link_click' && !input.linkDestination) throw new HttpError(400,'VALIDATION_ERROR','A purchase-link click requires its destination.');
  if (input.linkDestination && !['product_purchase_link_click','cta_click'].includes(input.eventName)) throw new HttpError(400,'VALIDATION_ERROR','This event does not accept a destination.');
  let path: string | null = null;
  if (input.pagePath) {
    if (!/^\/(?!\/)/.test(input.pagePath)) throw new HttpError(400,'VALIDATION_ERROR','Use a site-relative page path.');
    path = new URL(input.pagePath,'https://local.invalid').pathname.slice(0,500);
  }
  const ua = agent?.toLowerCase() ?? '';
  const device = /ipad|tablet/.test(ua) ? 'tablet' : /mobile|android|iphone/.test(ua) ? 'mobile' : 'desktop';
  const day = new Date().toISOString().slice(0,10);
  return { uuid:input.eventUuid,name:input.eventName,path,entityType:input.entityType??null,entityId:input.entityId??null,destination:input.linkDestination??null,referrer:input.referrerHost??null,visitorHash:ip?hashToken(`${day}:${ip}`,config.ANALYTICS_HASH_PEPPER):null,device };
}
