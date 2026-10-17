export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');

export type ApiEnvelope<T> = { data:T; meta?:{page:number;limit:number;total:number;totalPages:number} };
export type ApiIssue = {path?:string;message?:string};
export class ApiError extends Error {
  constructor(public status:number,public code:string,message:string,public requestId?:string,public details:ApiIssue[]=[]){super(message);}
}
let csrfToken = '';
export function setCsrfToken(value:string){csrfToken=value;}
export function clearCsrfToken(){csrfToken='';}
export async function api<T>(path:string,options:RequestInit={}):Promise<ApiEnvelope<T>> {
  const method=(options.method??'GET').toUpperCase();
  const headers=new Headers(options.headers);
  if(options.body && !(options.body instanceof FormData))headers.set('Content-Type','application/json');
  if(!['GET','HEAD'].includes(method) && csrfToken)headers.set('X-CSRF-Token',csrfToken);
  let response:Response;
  try {response=await fetch(`${API_BASE}${path.startsWith('/')?path:`/${path}`}`,{...options,method,headers,credentials:'include'});}
  catch {throw new ApiError(0,'NETWORK_ERROR','The CMS server is unavailable. Check that the backend is running.');}
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401){clearCsrfToken();window.dispatchEvent(new Event('cms:session-expired'));}
    const error=payload.error??{};
    const details=(Array.isArray(error.details)?error.details:[]).map((item:unknown)=>typeof item==='string'?{message:item}:item as ApiIssue);
    throw new ApiError(response.status,error.code??'REQUEST_FAILED',friendlyMessage(error.code,error.message,response.status),error.requestId,details);
  }
  return payload as ApiEnvelope<T>;
}
export function friendlyMessage(code?:string,message?:string,status?:number){
  const known:Record<string,string>={CSRF_INVALID:'Your session verification expired. Refresh and try again.',MEDIA_REFERENCED:'This image is still in use. Replace its references first.',INTEGRATION_NOT_CONFIGURED:'Image storage is not configured yet.',FEATURED_SLOT_TAKEN:'Another service already uses this homepage slot.',CATEGORY_IN_USE:'This category is used by published content.',ALREADY_EXISTS:'That value already exists. Try a different slug or name.',NOT_READY:'The database is not ready yet.',FORBIDDEN:'You do not have permission to do that.',PUBLISH_INCOMPLETE:message??'Complete the missing fields before publishing.'};
  return (code&&known[code]) || (status===403?'You do not have permission to do that.':message||'The request could not be completed.');
}
export function query(values:Record<string,string|number|boolean|undefined|null>){const search=new URLSearchParams();for(const [key,value] of Object.entries(values))if(value!==undefined&&value!==null&&value!=='')search.set(key,String(value));return search.toString();}
