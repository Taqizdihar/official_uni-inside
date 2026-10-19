export const platforms=[{key:'shopee',name:'Shopee',color:'#e9572e'},{key:'tokopedia',name:'Tokopedia',color:'#31984b'},{key:'tiktok',name:'TikTok Shop',color:'#252525'},{key:'shopify',name:'Shopify',color:'#67972d'},{key:'whatsapp',name:'WhatsApp',color:'#1b9f57'}] as const;
export type Platform=typeof platforms[number]['key'];
export type Feature={key:string;label:string;value_text:string};
export type Variant={key:string;name:string;price:string;stock_quantity:string;is_active:boolean;media:Photo|null};
export type Photo={id:number;secure_url:string;alt_text?:string|null;original_filename?:string|null};
export type Purchase={platform:Platform;url:string};
export const newKey=()=>globalThis.crypto.randomUUID();
export function moveRow<T>(items:T[],from:number,to:number){if(from<0||to<0||from>=items.length||to>=items.length||from===to)return items;const copy=[...items];const [item]=copy.splice(from,1);copy.splice(to,0,item);return copy;}
export function reorderPhotos(photos:(Photo|null)[],from:number,to:number){
  if(!photos[from]||from===to||to<0||to>=9)return photos;
  if(from===0||to===0){if(from===0&&!photos[to])return photos;const next=[...photos];[next[from],next[to]]=[next[to],next[from]];return next;}
  return moveRow(photos,from,to);
}
export function selectPhoto(photos:(Photo|null)[],index:number,photo:Photo){if(index<0||index>=9)throw new Error('Maksimal delapan foto galeri dan satu foto utama.');if(photos.some((item,at)=>at!==index&&item?.id===photo.id))throw new Error('Gambar ini sudah dipilih.');const next=[...photos];next[index]=photo;return next;}
export function addPlatform(items:Purchase[],platform:Platform){return items.some(item=>item.platform===platform)?items:[...items,{platform,url:''}];}
export function validPlatformUrl(value:string){try{const url=new URL(value.trim());return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}}
export function prepareFeatures(items:Feature[]){return items.filter(item=>item.label.trim()||item.value_text.trim()).map(item=>{if(!item.label.trim()||!item.value_text.trim())throw new Error('Lengkapi label dan nilai untuk setiap fitur.');return {label:item.label.trim(),value_text:item.value_text.trim()};});}
export function numeric(value:string,label:string,integer=false){if(!value.trim())return null;const number=Number(value);if(!Number.isFinite(number)||number<0||(integer&&!Number.isInteger(number)))throw new Error(`${label} harus berupa angka ${integer?'bulat ':''}yang tidak negatif.`);return number;}
export function saveAction(publish:boolean,canPublish:boolean){return publish&&canPublish?'publish':'draft';}
