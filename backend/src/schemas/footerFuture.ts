import {z} from 'zod';

// Contract preparation only. No route or database write accepts these fields yet.
export const footerSocialPlacementSchema=z.strictObject({social_link_id:z.number().int().positive(),position:z.number().int().min(1).max(10)});
export const footerSocialPlacementsSchema=z.array(footerSocialPlacementSchema).max(10).superRefine((items,context)=>{
  if(new Set(items.map(item=>item.social_link_id)).size!==items.length)context.addIssue({code:'custom',message:'Akun Footer tidak boleh dipilih dua kali.'});
  if(new Set(items.map(item=>item.position)).size!==items.length)context.addIssue({code:'custom',message:'Posisi Footer tidak boleh sama.'});
});
export const footerMapsEmbedSchema=z.url().max(2048).refine(raw=>{
  try{const url=new URL(raw);return url.protocol==='https:'&&url.hostname==='www.google.com'&&!url.username&&!url.password&&!url.port&&!url.hash&&
    (url.pathname==='/maps/embed'?Boolean(url.searchParams.get('pb')):['/maps/embed/v1/place','/maps/embed/v1/view','/maps/embed/v1/search','/maps/embed/v1/directions'].includes(url.pathname)&&Boolean(url.searchParams.get('key')))&&
    ![...url.searchParams.keys()].some(key=>['url','u','next','redirect','redirect_uri','target'].includes(key.toLowerCase()));
  }catch{return false;}
},'Gunakan URL resmi Google Maps Embed.');
export type FooterSocialPlacement=z.infer<typeof footerSocialPlacementSchema>;
