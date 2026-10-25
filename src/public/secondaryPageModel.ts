import {secondarySpecs,supportedSecondaryFields,safeSecondaryDestination,type SecondaryName} from '../../backend/src/contracts/secondaryPages';
export function resolveSecondaryContent(name:SecondaryName,pages:Record<string,unknown>[]|undefined){
 const row=pages?.find(page=>page.page_key===secondarySpecs[name].pageKey);
 return Object.fromEntries(supportedSecondaryFields(name).map(field=>{
  const stored=row?.[field.column!];
  const value=typeof stored==='string'?stored:field.fallback;
  return [field.key,field.kind==='destination'&&!safeSecondaryDestination(value)?field.fallback:value];
 }));
}
export function footerEmail(value:unknown){return typeof value==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?value:'uninsidemed@gmail.com';}
