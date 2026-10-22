export const platformCodes=['instagram','whatsapp','youtube','linkedin','tiktok','facebook','x','github','pinterest','threads','discord','telegram'] as const;
export type PlatformCode=typeof platformCodes[number];
export const platformNames:Record<PlatformCode,string>={instagram:'Instagram',whatsapp:'WhatsApp',youtube:'YouTube',linkedin:'LinkedIn',tiktok:'TikTok',facebook:'Facebook',x:'X',github:'GitHub',pinterest:'Pinterest',threads:'Threads',discord:'Discord',telegram:'Telegram'};
const legacyCodes:Record<string,PlatformCode>={instagram_studio:'instagram',instagram_craft:'instagram',tiktok_studio:'tiktok',tiktok_craft:'tiktok',linkedin:'linkedin',whatsapp:'whatsapp'};
export type LegacyAccount={id:number;platform_code:string;label:string;url:string;icon_key?:string|null;is_active:number|boolean;sort_order:number};
export type SocialAccount=LegacyAccount&{platform_id?:number;canonical_code:PlatformCode;platform_name:string;description?:string|null};
export type SocialPlatform={id:number;platform_code:PlatformCode;name:string;icon_key:string;sort_order:number};
export type AccountDraft={suffix:string;description:string;url:string};
export function groupLegacyAccount(account:LegacyAccount):SocialAccount|null{
  const canonical_code=legacyCodes[account.platform_code.toLowerCase()];
  return canonical_code?{...account,canonical_code,platform_name:platformNames[canonical_code]}:null;
}
export function accountSuffix(label:string,platform:PlatformCode):string{
  const prefix=platformNames[platform];
  const escaped=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return label.replace(new RegExp(`^${escaped}\\s*[-–—]\\s*`,'i'),'').trim();
}
export function completeLabel(platform:PlatformCode,suffix:string):string{
  const clean=suffix.trim(),prefix=platformNames[platform];
  if(!clean)throw new Error('Isi nama akun.');
  if(new RegExp(`^${prefix}\\s*[-–—]\\s*`,'i').test(clean))throw new Error('Isi nama akun tanpa mengulang nama platform.');
  const label=`${prefix} - ${clean}`;
  if(label.length>100)throw new Error('Nama akun lengkap maksimal 100 karakter.');
  return label;
}
const domains:Record<PlatformCode,string[]>={instagram:['instagram.com'],whatsapp:['wa.me','api.whatsapp.com','web.whatsapp.com'],youtube:['youtube.com','youtu.be'],linkedin:['linkedin.com'],tiktok:['tiktok.com'],facebook:['facebook.com','fb.com'],x:['x.com','twitter.com'],github:['github.com'],pinterest:['pinterest.com','pin.it'],threads:['threads.net'],discord:['discord.com','discord.gg'],telegram:['t.me','telegram.me']};
export function validateAccountUrl(raw:string,platform:PlatformCode):string{
  const value=raw.trim();if(value.length>1000)throw new Error('URL maksimal 1.000 karakter.');
  let url:URL;try{url=new URL(value);}catch{throw new Error('Masukkan URL akun yang valid.');}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||!domains[platform].some(domain=>host===domain||host.endsWith(`.${domain}`)))throw new Error('Gunakan tautan HTTPS resmi untuk platform ini.');
  if(/^\/(?:l\.php|redirect|away)(?:\/|$)/i.test(url.pathname)||['url','u','next','redirect','redirect_uri','target'].some(key=>url.searchParams.has(key)))throw new Error('Gunakan tautan akun langsung, bukan tautan pengalihan.');
  if(platform==='whatsapp'){
    const phone=host==='wa.me'?url.pathname.slice(1):url.searchParams.get('phone');
    if(!phone||!/^\d{7,15}$/.test(phone)||(host!=='wa.me'&&url.pathname!=='/send'))throw new Error('Gunakan tautan WhatsApp dengan nomor internasional yang valid.');
  }
  return url.toString();
}
export function accountChanges(platform:PlatformCode,draft:AccountDraft,original?:SocialAccount){
  const body:Record<string,unknown>={};let label=original?.label??'';
  if(!original||draft.suffix.trim()!==accountSuffix(original.label,platform)){label=completeLabel(platform,draft.suffix);body.label_suffix=draft.suffix.trim();}
  if(!original||draft.url!==original.url)body.url=validateAccountUrl(draft.url,platform);
  if(draft.description.length>1000)throw new Error('Deskripsi maksimal 1.000 karakter.');
  if(!original||draft.description!==(original.description??''))body.description=draft.description.trim()||null;
  if(!Object.keys(body).length)throw new Error('Belum ada perubahan untuk disimpan.');
  return {label,body};
}
export function safeAccountHref(raw:string,platform:PlatformCode):string|null{try{return validateAccountUrl(raw,platform);}catch{return null;}}
export function filteredPlatforms<T extends {name:string;platform_code:string}>(items:T[],query:string){const needle=query.trim().toLocaleLowerCase('id');return items.filter(item=>`${item.name} ${item.platform_code}`.toLocaleLowerCase('id').includes(needle));}
export function canAddAccount(count:number){return count<5;}
export function nextTabIndex(key:string,index:number,total:number){if(!total)return 0;return key==='Home'?0:key==='End'?total-1:key==='ArrowRight'?(index+1)%total:key==='ArrowLeft'?(index-1+total)%total:index;}
