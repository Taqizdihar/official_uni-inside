import {secondaryFields,secondarySpecs,safeSecondaryDestination,type SecondaryName} from '../../backend/src/contracts/secondaryPages';
export function resolveSecondaryContent(name:SecondaryName,pages:Record<string,unknown>[]|undefined){
 const row=pages?.find(page=>page.page_key===secondarySpecs[name].pageKey);
 const slots=row?.slots&&typeof row.slots==='object'?row.slots as Record<string,unknown>:null;
 const values=Object.fromEntries(secondaryFields(name).map(field=>{
  const stored=field.column?row?.[field.column]:slots?.[field.key];
  const value=typeof stored==='string'?stored:field.fallback;
  return [field.key,field.kind==='destination'&&!safeSecondaryDestination(value)?field.fallback:value];
 }));
 if(name==='products'){
  const mode=slots?.banner_mode==='manual'?'manual':'automatic';
  const media=row?.banner_media&&typeof row.banner_media==='object'?row.banner_media as Record<string,unknown>:null;
  values.banner_media_url=mode==='manual'&&typeof media?.secure_url==='string'&&media.secure_url.startsWith('https://')?media.secure_url:'';
  values.banner_media_alt=values.banner_media_url&&typeof media?.alt_text==='string'?media.alt_text:'';
 }
 return values;
}
export function footerEmail(value:unknown){return typeof value==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?value:'uninsidemed@gmail.com';}
