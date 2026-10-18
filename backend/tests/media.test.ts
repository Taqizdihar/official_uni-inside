import { describe,expect,it,vi } from 'vitest';
import { v2 as cloudinary } from 'cloudinary';
import { loadConfig } from '../src/config/env';
import { folderFor,imageFormats,signedUpload,verifyUpload } from '../src/services/media';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret'});

describe('signed Media Library uploads',()=>{
  it('signs only the supported Upload API fields and never returns the secret',()=>{
    const sign=vi.spyOn(cloudinary.utils,'api_sign_request');
    try {
      const result=signedUpload(config,'site');
      expect(sign).toHaveBeenCalledWith({asset_folder:'uni-inside/site',public_id_prefix:'uni-inside/site',timestamp:expect.any(Number),allowed_formats:imageFormats.join(',')},'test-secret');
      expect(Object.keys(result).sort()).toEqual(['allowed_formats','apiKey','asset_folder','public_id_prefix','signature','timestamp','uploadUrl'].sort());
      expect(JSON.stringify(result)).not.toContain('test-secret');
      expect(result.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    } finally {sign.mockRestore();}
  });
  it('uses stable folders for every supported scope and rejects invalid destinations',()=>{
    for(const scope of ['site','users','team','partners','achievements'])expect(folderFor(scope)).toBe(`uni-inside/${scope}`);
    for(const scope of ['products','services','projects','news'])expect(folderFor(scope,'sample-item')).toBe(`uni-inside/${scope}/sample-item`);
    expect(()=>folderFor('products')).toThrow();
    expect(()=>folderFor('news','../secret')).toThrow();
    expect(()=>folderFor('site',undefined,'../wrong')).toThrow();
  });
  it('rejects invalid Cloudinary metadata during finalization',async()=>{
    const resource=vi.spyOn(cloudinary.api,'resource').mockResolvedValue({public_id:'uni-inside/site/photo',resource_type:'image',format:'png',bytes:10_000_001,width:500,height:500,secure_url:'https://res.cloudinary.com/test-cloud/image/upload/photo'} as never);
    try {
      await expect(verifyUpload(config,'uni-inside/site/photo','site')).rejects.toThrow();
      expect(resource).toHaveBeenCalledOnce();
      await expect(verifyUpload(config,'elsewhere/photo','site')).rejects.toThrow();
      expect(resource).toHaveBeenCalledOnce();
    } finally {resource.mockRestore();}
  });
});
