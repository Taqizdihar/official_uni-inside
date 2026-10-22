import { describe,expect,it,vi } from 'vitest';
import { v2 as cloudinary } from 'cloudinary';
import { loadConfig } from '../src/config/env';
import { folderFor,imageFormats,mediaIdentifier,signedUpload,verifyUpload,verifyUploadGrant,deleteCloudinary,moveCloudinary,renameCloudinary,safeMediaName } from '../src/services/media';
import {listMedia,countMedia,mediaReferenceCount} from '../src/repositories/media';
import type {Executor} from '../src/database/pool';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret'});

describe('signed Media Library uploads',()=>{
  it('derives safe, collision-resistant image IDs without content slugs',()=>{
    const first=mediaIdentifier('Foto Produk 01.PNG');
    expect(first).toMatch(/^foto-produk-01-[a-f0-9]{24}$/);
    expect(mediaIdentifier('Foto Produk 01.PNG')).not.toBe(first);
    expect(mediaIdentifier('🦋.png')).toMatch(/^gambar-[a-f0-9]{24}$/);
  });
  it('signs only the supported Upload API fields and never returns the secret',()=>{
    const sign=vi.spyOn(cloudinary.utils,'api_sign_request');
    try {
      const result=signedUpload(config,'pengaturan','site','Photo.png',1);
      expect(sign).toHaveBeenCalledWith({asset_folder:'uni-inside/site',public_id_prefix:'uni-inside/site',public_id:expect.stringMatching(/^photo-[a-f0-9]{24}$/),overwrite:false,timestamp:expect.any(Number),allowed_formats:imageFormats.join(',')},'test-secret');
      expect(Object.keys(result).sort()).toEqual(['allowed_formats','apiKey','asset_folder','public_id_prefix','public_id','overwrite','uploadGrant','signature','timestamp','uploadUrl'].sort());
      expect(JSON.stringify(result)).not.toContain('test-secret');
      expect(result.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
      expect(()=>verifyUploadGrant(config,result.uploadGrant,1,`${result.asset_folder}/${result.public_id}`)).not.toThrow();
      expect(()=>verifyUploadGrant(config,result.uploadGrant,2,`${result.asset_folder}/${result.public_id}`)).toThrow();
      expect(()=>verifyUploadGrant(config,result.uploadGrant,1,`${result.asset_folder}/other`)).toThrow();
    } finally {sign.mockRestore();}
  });
  it('uses stable folders for every supported scope and rejects invalid destinations',()=>{
    for(const scope of ['site','users','team','partners','achievements'])expect(folderFor(scope)).toBe(`uni-inside/${scope}`);
    for(const scope of ['products','services','projects','news'])expect(folderFor(scope,'sample-item')).toBe(`uni-inside/${scope}`);
    expect(folderFor('products')).toBe('uni-inside/products');
    expect(folderFor('news','../secret')).toBe('uni-inside/news');
    expect(()=>folderFor('site',undefined,'../wrong')).toThrow();
  });
  it('rejects invalid Cloudinary metadata during finalization',async()=>{
    const resource=vi.spyOn(cloudinary.api,'resource').mockResolvedValue({public_id:'uni-inside/site/photo',resource_type:'image',format:'png',bytes:10_000_001,width:500,height:500,secure_url:'https://res.cloudinary.com/test-cloud/image/upload/photo'} as never);
    try {
      await expect(verifyUpload(config,'uni-inside/site/photo','pengaturan','site')).rejects.toThrow();
      expect(resource).toHaveBeenCalledOnce();
      await expect(verifyUpload(config,'elsewhere/photo','pengaturan','site')).rejects.toThrow();
      expect(resource).toHaveBeenCalledOnce();
    } finally {resource.mockRestore();}
  });
});

describe('Cloudinary media actions',()=>{
  const media={provider:'cloudinary',resource_type:'image',public_id:'uni-inside/site/photo',secure_url:'https://res.cloudinary.com/test-cloud/image/upload/v123/uni-inside/site/photo.jpg',folder_path:'uni-inside/site',format:'jpg'};
  it('deletes by stored public ID and confirms the Admin API result',async()=>{
    const remove=vi.spyOn(cloudinary.api,'delete_resources').mockResolvedValue({deleted:{[media.public_id]:'deleted'}} as never);
    try{
      await expect(deleteCloudinary(config,media)).resolves.toBe('deleted');
      expect(remove).toHaveBeenCalledWith([media.public_id],{resource_type:'image',type:'upload',invalidate:true});
      remove.mockResolvedValue({deleted:{[media.public_id]:'not_found'}} as never);
      await expect(deleteCloudinary(config,media)).resolves.toBe('not_found');
    }finally{remove.mockRestore();}
  });
  it('rejects failed deletion and assets outside the configured account',async()=>{
    const remove=vi.spyOn(cloudinary.api,'delete_resources').mockResolvedValue({deleted:{[media.public_id]:'error'}} as never);
    try{
      await expect(deleteCloudinary(config,media)).rejects.toMatchObject({code:'CLOUDINARY_DELETE_FAILED'});
      await expect(deleteCloudinary(config,{...media,secure_url:'https://res.cloudinary.com/another-cloud/image/upload/photo.jpg'})).rejects.toMatchObject({code:'INVALID_MEDIA'});
      expect(remove).toHaveBeenCalledTimes(1);
    }finally{remove.mockRestore();}
  });
  it('validates rename and moves the physical asset folder without changing its public ID',async()=>{
    expect(safeMediaName(' Team Photo ')).toEqual({name:'Team Photo',slug:'team-photo'});
    expect(()=>safeMediaName('../secret')).toThrow();
    const rename=vi.spyOn(cloudinary.uploader,'rename').mockResolvedValue({public_id:'uni-inside/site/team-photo',secure_url:'https://res.cloudinary.com/test-cloud/image/upload/v124/uni-inside/site/team-photo.jpg'} as never);
    const move=vi.spyOn(cloudinary.api,'update').mockResolvedValue({public_id:media.public_id,asset_folder:'uni-inside/team'} as never);
    try{
      await expect(renameCloudinary(config,media,'uni-inside/site/team-photo')).resolves.toContain('team-photo.jpg');
      expect(rename).toHaveBeenCalledWith(media.public_id,'uni-inside/site/team-photo',{resource_type:'image',type:'upload',overwrite:false,invalidate:true});
      await expect(moveCloudinary(config,media,'uni-inside/team')).resolves.toBeUndefined();
      expect(move).toHaveBeenCalledWith(media.public_id,{resource_type:'image',type:'upload',asset_folder:'uni-inside/team'});
    }finally{rename.mockRestore();move.mockRestore();}
  });
});

describe('Media Library queries',()=>{
  it('filters logical folders before pagination and uses a stable sort',async()=>{
    const calls:{sql:string;values:unknown[]}[]=[];
    const db={execute:async(options:{sql:string},values:unknown[])=>{calls.push({sql:options.sql,values});return [options.sql.includes('COUNT(*) AS total')?[{total:3}]:[],[]];}} as unknown as Executor;
    await listMedia(db,20,0,{search:'team',folders:['uni-inside/site','uni-inside/team'],sort:'bytes_size',direction:'ASC'});
    expect(calls[0]!.sql).toContain('ORDER BY bytes_size ASC,id ASC LIMIT ? OFFSET ?');
    expect(calls[0]!.values).toEqual(['%team%','%team%','uni-inside/site','uni-inside/site/%','uni-inside/team','uni-inside/team/%',20,0]);
    await expect(countMedia(db,{otherFolders:['uni-inside/site']})).resolves.toBe(3);
    expect(calls[1]!.sql).toContain('folder_path IS NULL OR');
  });
  it('counts content references before allowing destructive actions',async()=>{
    const db={execute:async(options:{sql:string},values:unknown[])=>{expect(options.sql).toContain('FROM news_images');expect(values).toHaveLength(15);return [[{count:2}],[]];}} as unknown as Executor;
    await expect(mediaReferenceCount(db,4)).resolves.toBe(2);
  });
});
