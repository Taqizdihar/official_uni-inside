import type {SocialAccount} from '../social/model';

export type FooterFields={footer_description:string|null;public_email:string|null;public_phone:string|null;address_text:string|null};
export type FooterSocialPlacement={social_link_id:number;position:number};
export type FooterCapabilities={footerBaseSettings:{enabled:boolean};footerSocialPlacements:{enabled:boolean;reason?:string};footerMapsEmbed:{enabled:boolean;reason?:string}};
export type FooterResponse={settings:FooterFields;capabilities:FooterCapabilities;socialLinkIds?:number[];mapUrl?:string;version?:string};
export const maxFooterAccounts=10;
export const pendingFooterCapabilities:FooterCapabilities={footerBaseSettings:{enabled:true},footerSocialPlacements:{enabled:false,reason:'DATABASE_MIGRATION_PENDING'},footerMapsEmbed:{enabled:false,reason:'DATABASE_MIGRATION_PENDING'}};
export const emptyFooterFields:FooterFields={footer_description:null,public_email:null,public_phone:null,address_text:null};
export function placementsFor(ids:number[]):FooterSocialPlacement[]{
  if(ids.length>maxFooterAccounts||new Set(ids).size!==ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<=0))throw new Error('Pilihan akun Footer tidak valid.');
  return ids.map((social_link_id,index)=>({social_link_id,position:index+1}));
}
export function addFooterAccount(ids:number[],account:Pick<SocialAccount,'id'|'is_active'>):number[]{
  if(!account.is_active)throw new Error('Hanya akun aktif yang dapat dipilih.');
  return placementsFor([...ids,account.id]).map(item=>item.social_link_id);
}
export function moveFooterAccount(ids:number[],from:number,to:number):number[]{
  if(from<0||from>=ids.length||to<0||to>=ids.length)return ids;
  const next=[...ids];next.splice(to,0,...next.splice(from,1));return next;
}
export function removeFooterAccount(ids:number[],id:number){return ids.filter(value=>value!==id);}
export function validateFooterFields(fields:FooterFields):FooterFields{
  const footer_description=fields.footer_description?.trim()||null,public_email=fields.public_email?.trim()||null,public_phone=fields.public_phone?.trim()||null,address_text=fields.address_text?.trim()||null;
  if(footer_description&&footer_description.length>1000)throw new Error('Deskripsi Footer maksimal 1.000 karakter.');
  if(public_email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(public_email)||public_email.length>254))throw new Error('Masukkan alamat email yang valid.');
  if(public_phone&&(!/^[+0-9().\s-]{5,50}$/.test(public_phone)||public_phone.replace(/\D/g,'').length<5))throw new Error('Masukkan nomor telepon yang valid.');
  if(address_text&&address_text.length>500)throw new Error('Lokasi maksimal 500 karakter.');
  return {footer_description,public_email,public_phone,address_text};
}
export function validMapsEmbed(raw:string):string|null{
  if(!raw||raw.length>2048)return null;
  try{const url=new URL(raw.trim());if(url.protocol!=='https:'||url.hostname!=='www.google.com'||url.username||url.password||url.port||url.hash)return null;
    if(url.pathname!=='/maps/embed'&&url.pathname!=='/maps/embed/v1/place'&&url.pathname!=='/maps/embed/v1/view'&&url.pathname!=='/maps/embed/v1/search'&&url.pathname!=='/maps/embed/v1/directions')return null;
    if([...url.searchParams.keys()].some(key=>['url','u','next','redirect','redirect_uri','target'].includes(key.toLowerCase())))return null;
    if(url.pathname==='/maps/embed'&&!url.searchParams.get('pb'))return null;
    if(url.pathname.startsWith('/maps/embed/v1/')&&!url.searchParams.get('key'))return null;
    return url.toString();
  }catch{return null;}
}
