import { v2 as cloudinary } from 'cloudinary';
import type { Config } from '../config/env';
import { HttpError } from '../utils/http';

export const imageFormats = ['jpg','jpeg','png','webp','avif'] as const;
export function folderFor(scope: string, entity?: string, root = 'uni-inside') {
  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(root)) throw new HttpError(400,'INVALID_MEDIA_FOLDER','Invalid image root folder.');
  if (['site','users','team','partners','achievements'].includes(scope)) return `${root}/${scope}`;
  if (!['products','services','projects','news'].includes(scope) || !entity || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity)) throw new HttpError(400,'VALIDATION_ERROR','Choose a valid media destination.');
  return `${root}/${scope}/${entity}`;
}
export function configured(config: Config) {
  if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) throw new HttpError(503,'INTEGRATION_NOT_CONFIGURED','Image storage is not configured.');
  cloudinary.config({ cloud_name:config.CLOUDINARY_CLOUD_NAME, api_key:config.CLOUDINARY_API_KEY, api_secret:config.CLOUDINARY_API_SECRET, secure:true });
}
export function signedUpload(config: Config, scope: string, entity?: string) {
  configured(config);
  const folder = folderFor(scope,entity,config.CLOUDINARY_ROOT_FOLDER);
  const timestamp = Math.floor(Date.now()/1000);
  const params = { asset_folder:folder, public_id_prefix:folder, timestamp, allowed_formats:imageFormats.join(',') };
  const signature = cloudinary.utils.api_sign_request(params,config.CLOUDINARY_API_SECRET);
  return { uploadUrl:`https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`, apiKey:config.CLOUDINARY_API_KEY, signature, ...params };
}
export async function verifyUpload(config: Config, publicId: string, scope: string, entity?: string) {
  configured(config);
  const folder = folderFor(scope,entity,config.CLOUDINARY_ROOT_FOLDER);
  if (!publicId.startsWith(`${folder}/`) || publicId.length > 255) throw new HttpError(400,'INVALID_MEDIA','The image is outside the requested folder.');
  const item = await cloudinary.api.resource(publicId,{resource_type:'image'});
  if (item.public_id !== publicId || !String(item.public_id).startsWith(`${folder}/`)) throw new HttpError(400,'INVALID_MEDIA','The uploaded image is outside the requested folder.');
  if (item.resource_type !== 'image' || !imageFormats.includes(item.format as typeof imageFormats[number]) || item.bytes > 10_000_000 || !item.width || !item.height || !String(item.secure_url).startsWith('https://res.cloudinary.com/')) throw new HttpError(400,'INVALID_MEDIA','The image is not an allowed format or exceeds the size limit.');
  return { publicId:String(item.public_id),format:String(item.format),secureUrl:String(item.secure_url),filename:item.original_filename ? String(item.original_filename).slice(0,255):null,width:Number(item.width),height:Number(item.height),bytes:Number(item.bytes),folder };
}
