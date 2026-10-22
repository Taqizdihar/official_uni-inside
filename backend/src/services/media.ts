import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'node:crypto';
import type { Config } from '../config/env';
import { HttpError } from '../utils/http';
import { equalHash, hashToken } from '../utils/security';
import { resolveMediaDestination, sectionForContext, type MediaSection } from './mediaSections';

export const imageFormats = ['jpg','jpeg','png','webp','avif'] as const;
export function folderFor(scope: string, entity?: string, root = 'uni-inside') {
  // Compatibility helper for existing callers: content identity no longer selects a folder.
  void entity;
  return resolveMediaDestination(sectionForContext(scope),scope,root);
}
export function configured(config: Config) {
  if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) throw new HttpError(503,'INTEGRATION_NOT_CONFIGURED','Image storage is not configured.');
  cloudinary.config({ cloud_name:config.CLOUDINARY_CLOUD_NAME, api_key:config.CLOUDINARY_API_KEY, api_secret:config.CLOUDINARY_API_SECRET, secure:true });
}
export function mediaIdentifier(filename:string){
  const stem=filename.replace(/\.[^.]+$/,'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64).replace(/-+$/,'')||'gambar';
  return `${stem}-${randomBytes(12).toString('hex')}`;
}
function uploadGrant(config:Config,actorId:number,publicId:string){
  const payload=Buffer.from(JSON.stringify({actorId,publicId,expires:Date.now()+600_000})).toString('base64url');
  return `${payload}.${hashToken(payload,config.AUTH_TOKEN_PEPPER)}`;
}
export function verifyUploadGrant(config:Config,grant:string,actorId:number,publicId:string){
  const [payload,mac,extra]=grant.split('.');
  if(!payload||!mac||extra||payload.length>800||!equalHash(mac,hashToken(payload,config.AUTH_TOKEN_PEPPER)))throw new HttpError(400,'INVALID_MEDIA','Upload authorization is invalid.');
  let value:{actorId?:number;publicId?:string;expires?:number};
  try{value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw new HttpError(400,'INVALID_MEDIA','Upload authorization is invalid.');}
  if(value.actorId!==actorId||value.publicId!==publicId||typeof value.expires!=='number'||value.expires<Date.now()||value.expires>Date.now()+600_000)throw new HttpError(400,'INVALID_MEDIA','Upload authorization is invalid or expired.');
}
export function signedUpload(config: Config, section: MediaSection, context: string|undefined, filename:string, actorId:number) {
  configured(config);
  const folder = resolveMediaDestination(section,context,config.CLOUDINARY_ROOT_FOLDER);
  const publicId=mediaIdentifier(filename);
  const expectedPublicId=`${folder}/${publicId}`;
  if(expectedPublicId.length>255)throw new HttpError(400,'INVALID_MEDIA','Image identifier is too long.');
  const timestamp = Math.floor(Date.now()/1000);
  const params = { asset_folder:folder, public_id_prefix:folder, public_id:publicId, overwrite:false, timestamp, allowed_formats:imageFormats.join(',') };
  const signature = cloudinary.utils.api_sign_request(params,config.CLOUDINARY_API_SECRET);
  return { uploadUrl:`https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`, apiKey:config.CLOUDINARY_API_KEY, signature, uploadGrant:uploadGrant(config,actorId,expectedPublicId), ...params };
}
export async function verifyUpload(config: Config, publicId: string, section: MediaSection, context?: string) {
  configured(config);
  const folder = resolveMediaDestination(section,context,config.CLOUDINARY_ROOT_FOLDER);
  if (!publicId.startsWith(`${folder}/`) || publicId.length > 255 || !/^[a-z0-9-]+$/.test(publicId.slice(folder.length+1))) throw new HttpError(400,'INVALID_MEDIA','The image is outside the requested folder.');
  const item = await cloudinary.api.resource(publicId,{resource_type:'image'});
  if (item.public_id !== publicId || item.asset_folder!==folder) throw new HttpError(400,'INVALID_MEDIA','The uploaded image is outside the requested folder.');
  if (item.resource_type !== 'image' || !imageFormats.includes(item.format as typeof imageFormats[number]) || item.bytes > 10_000_000 || !item.width || !item.height || !String(item.secure_url).startsWith(`https://res.cloudinary.com/${config.CLOUDINARY_CLOUD_NAME}/image/upload/`)) throw new HttpError(400,'INVALID_MEDIA','The image is not an allowed format or exceeds the size limit.');
  return { publicId:String(item.public_id),format:String(item.format),secureUrl:String(item.secure_url),filename:item.original_filename ? String(item.original_filename).slice(0,255):null,width:Number(item.width),height:Number(item.height),bytes:Number(item.bytes),folder };
}

export type StoredMedia = {provider:string;resource_type:string;public_id:string;secure_url:string;folder_path:string;format:string};
export function verifyStoredMedia(config:Config,item:StoredMedia) {
  configured(config);
  const root=config.CLOUDINARY_ROOT_FOLDER;
  let url:URL;try{url=new URL(item.secure_url);}catch{throw new HttpError(400,'INVALID_MEDIA','The stored image URL is invalid.');}
  if(item.provider!=='cloudinary'||item.resource_type!=='image'||!item.public_id.startsWith(`${root}/`)||item.public_id.split('/').some(part=>!part||part==='.'||part==='..')||url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.startsWith(`/${config.CLOUDINARY_CLOUD_NAME}/image/upload/`))throw new HttpError(400,'INVALID_MEDIA','The image does not belong to this Cloudinary library.');
}
export function safeMediaName(value:string) {
  const name=value.trim();
  if(!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,119}$/.test(name))throw new HttpError(400,'INVALID_MEDIA_NAME','Use 1–120 letters, numbers, spaces, hyphens, or underscores.');
  return {name,slug:name.toLowerCase().replace(/\s+/g,'-')};
}
export async function renameCloudinary(config:Config,item:StoredMedia,targetId:string) {
  verifyStoredMedia(config,item);
  try {
    const result=await cloudinary.uploader.rename(item.public_id,targetId,{resource_type:'image',type:'upload',overwrite:false,invalidate:true});
    if(result.public_id!==targetId||typeof result.secure_url!=='string'||!result.secure_url.startsWith(`https://res.cloudinary.com/${config.CLOUDINARY_CLOUD_NAME}/image/upload/`))throw new Error('Unexpected Cloudinary rename response');
    return String(result.secure_url);
  } catch(error){if(error&&typeof error==='object'&&'message' in error&&/already exists/i.test(String(error.message)))throw new HttpError(409,'ALREADY_EXISTS','An image with this name already exists.');throw new HttpError(502,'CLOUDINARY_RENAME_FAILED','Cloudinary could not rename this image.');}
}
export async function moveCloudinary(config:Config,item:StoredMedia,targetFolder:string) {
  verifyStoredMedia(config,item);
  try {
    const result=await cloudinary.api.update(item.public_id,{resource_type:'image',type:'upload',asset_folder:targetFolder});
    if(result.asset_folder!==targetFolder||result.public_id!==item.public_id)throw new Error('Unexpected Cloudinary move response');
  } catch {throw new HttpError(502,'CLOUDINARY_MOVE_FAILED','Cloudinary could not move this image.');}
}
export async function deleteCloudinary(config:Config,item:StoredMedia) {
  verifyStoredMedia(config,item);
  try {
    const result=await cloudinary.api.delete_resources([item.public_id],{resource_type:'image',type:'upload',invalidate:true});
    const outcome=result.deleted?.[item.public_id];
    if(outcome!=='deleted'&&outcome!=='not_found')throw new Error('Cloudinary did not confirm deletion');
    return outcome as 'deleted'|'not_found';
  } catch {throw new HttpError(502,'CLOUDINARY_DELETE_FAILED','Cloudinary could not confirm image deletion.');}
}
