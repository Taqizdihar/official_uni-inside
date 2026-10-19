import sanitizeHtml from 'sanitize-html';
import { HttpError } from './http';

export const productDescriptionTags=['p','br','strong','em','u','ul','ol','li','h2','h3','blockquote','a'];
export function safeProductLink(value:string) {
  if(/^\/(?!\/)/.test(value)||/^#[\w-]*$/.test(value))return true;
  try { const url=new URL(value);return ['http:','https:','mailto:'].includes(url.protocol)&&!url.username&&!url.password; } catch { return false; }
}
export function sanitizeProductDescription(value:string,rejectUnsafeLinks=false) {
  return sanitizeHtml(value,{
    allowedTags:productDescriptionTags,
    nonTextTags:['script','style','textarea','option','iframe','video','audio','object','embed'],
    allowedAttributes:{a:['href','title','target','rel']},allowedSchemes:['http','https','mailto'],allowProtocolRelative:false,
    transformTags:{b:'strong',i:'em',a:(_tag,attributes)=>{
      const safe=!attributes.href||safeProductLink(attributes.href);
      if(!safe&&rejectUnsafeLinks)throw new HttpError(400,'VALIDATION_ERROR','Gunakan tautan http, https, atau mailto yang valid.');
      return {tagName:'a',attribs:{...(safe?attributes:{}),rel:'noopener noreferrer'}};
    }},
  });
}
export function productSummary(html:string) {
  let text='';
  const spaced=html.replace(/<\/(?:p|li|h2|h3|blockquote)>|<br\s*\/?\s*>/gi,' ');
  sanitizeHtml(`<div>${spaced}</div>`,{allowedTags:['div'],allowedAttributes:{},exclusiveFilter:frame=>{if(frame.tag==='div')text=frame.text;return false;}});
  return text.replace(/\s+/g,' ').trim().slice(0,500);
}
