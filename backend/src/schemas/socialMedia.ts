import { z } from 'zod';
import { HttpError } from '../utils/http';

export const platformCodes = ['instagram','whatsapp','youtube','linkedin','tiktok','facebook','x','github','pinterest','threads','discord','telegram'] as const;
export type PlatformCode = typeof platformCodes[number];
export const platformNames: Record<PlatformCode,string> = { instagram:'Instagram', whatsapp:'WhatsApp', youtube:'YouTube', linkedin:'LinkedIn', tiktok:'TikTok', facebook:'Facebook', x:'X', github:'GitHub', pinterest:'Pinterest', threads:'Threads', discord:'Discord', telegram:'Telegram' };
const hosts: Record<PlatformCode,readonly string[]> = {
  instagram:['instagram.com'],whatsapp:['wa.me','api.whatsapp.com','web.whatsapp.com'],youtube:['youtube.com','youtu.be'],
  linkedin:['linkedin.com'],tiktok:['tiktok.com'],facebook:['facebook.com','fb.com'],x:['x.com','twitter.com'],
  github:['github.com'],pinterest:['pinterest.com','pin.it'],threads:['threads.net'],discord:['discord.com','discord.gg'],
  telegram:['t.me','telegram.me'],
};
export function accountUrl(value: string, platform: PlatformCode): string {
  const raw=value.trim();
  if (raw.length>1000) throw new HttpError(400,'INVALID_ACCOUNT_URL','URL akun terlalu panjang.');
  let url: URL;
  try { url=new URL(raw); } catch { throw new HttpError(400,'INVALID_ACCOUNT_URL','URL akun tidak valid.'); }
  const host=url.hostname.toLowerCase();
  if (url.protocol!=='https:' || url.username || url.password || url.port || !hosts[platform].some(domain=>host===domain||host.endsWith(`.${domain}`))) throw new HttpError(400,'INVALID_ACCOUNT_URL','Gunakan tautan HTTPS resmi untuk platform yang dipilih.');
  const redirectKeys=['url','u','next','redirect','redirect_uri','target'];
  if (/^\/(?:l\.php|redirect|away)(?:\/|$)/i.test(url.pathname) || redirectKeys.some(key=>url.searchParams.has(key))) throw new HttpError(400,'INVALID_ACCOUNT_URL','Gunakan tautan akun langsung, bukan tautan pengalihan.');
  if (platform==='whatsapp') {
    const phone=host==='wa.me' ? url.pathname.slice(1) : url.searchParams.get('phone');
    if (!phone || !/^\d{7,15}$/.test(phone) || (host!=='wa.me' && url.pathname!=='/send')) throw new HttpError(400,'INVALID_ACCOUNT_URL','Gunakan tautan WhatsApp dengan nomor internasional yang valid.');
  }
  return url.toString();
}
export const accountCreateSchema=z.strictObject({
  platform_code:z.enum(platformCodes), label_suffix:z.string().trim().min(1).max(100), description:z.string().trim().max(1000).nullable().optional(),
  url:z.string().trim().min(1).max(1000), is_active:z.boolean().default(true), sort_order:z.number().int().min(0).max(65535).default(0),
});
export const accountPatchSchema=z.strictObject({
  label_suffix:z.string().trim().min(1).max(100).optional(),description:z.string().trim().max(1000).nullable().optional(),
  url:z.string().trim().min(1).max(1000).optional(),is_active:z.boolean().optional(),sort_order:z.number().int().min(0).max(65535).optional(),
});
export function completeLabel(platform:PlatformCode,suffix:string):string {
  const clean=suffix.trim(),name=platformNames[platform];
  if (!clean || new RegExp(`^${name}\\s*[-–—]\\s*`,'i').test(clean)) throw new HttpError(400,'INVALID_ACCOUNT_LABEL','Isi nama akun tanpa mengulang nama platform.');
  const label=`${name} - ${clean}`;
  if (label.length>100) throw new HttpError(400,'INVALID_ACCOUNT_LABEL','Nama akun lengkap maksimal 100 karakter.');
  return label;
}
