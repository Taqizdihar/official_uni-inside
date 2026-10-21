import {api,ApiError} from './client';

export type CmsCapabilities={socialMediaV2:{enabled:boolean;reason:string|null};productVariantMedia:{enabled:boolean;reason:string|null}};
const legacy: CmsCapabilities={socialMediaV2:{enabled:false,reason:'FEATURE_DISABLED'},productVariantMedia:{enabled:false,reason:'FEATURE_DISABLED'}};
export async function getCmsCapabilities(signal?:AbortSignal):Promise<CmsCapabilities>{
  try{return (await api<CmsCapabilities>('/admin/social-media/capabilities',{signal})).data;}
  catch(cause){if(cause instanceof ApiError&&cause.status===404)return legacy;throw cause;}
}
