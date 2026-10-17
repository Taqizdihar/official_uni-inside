import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env';
import { equalHash, hashPassword, hashToken, newToken, redact, sessionCookieOptions, validatePassword, verifyPassword } from '../src/utils/security';
import { originAllowed } from '../src/app';
import { folderFor, signedUpload, verifyUpload } from '../src/services/media';
import { v2 as cloudinary } from 'cloudinary';
import { vi } from 'vitest';
import { eventSchema, normalizeEvent } from '../src/services/analytics';

const config = () => loadConfig({ DB_HOST:'127.0.0.1',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000,https://uniinside.net' });
describe('security boundaries',()=>{
  it('validates deployment settings without printing secret values',()=>{
    expect(()=>loadConfig({NODE_ENV:'production',DB_HOST:'x',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'secret',ANALYTICS_HASH_PEPPER:'b'.repeat(40)})).toThrow(/AUTH_TOKEN_PEPPER/);
    expect(()=>loadConfig({DB_HOST:'x',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CLOUDINARY_ROOT_FOLDER:'../outside'})).toThrow(/CLOUDINARY_ROOT_FOLDER/);
    expect(()=>loadConfig({NODE_ENV:'production',DB_HOST:'x',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),SESSION_COOKIE_SECURE:'false'})).toThrow(/Secure cookies/);
    expect(redact({nested:{password:'secret',apiToken:'raw'},title:'safe'})).toEqual({nested:{password:'[REDACTED]',apiToken:'[REDACTED]'},title:'safe'});
  });
  it('hashes passwords and opaque session tokens',async()=>{
    const raw=newToken();expect(Buffer.from(raw,'base64url').length).toBe(32);
    const digest=hashToken(raw,config().AUTH_TOKEN_PEPPER);expect(digest).not.toContain(raw);expect(equalHash(digest,hashToken(raw,config().AUTH_TOKEN_PEPPER))).toBe(true);
    const hash=await hashPassword('a solid passphrase with words');expect(await verifyPassword(hash,'a solid passphrase with words')).toBe(true);expect(await verifyPassword(hash,'wrong')).toBe(false);
    expect(()=>validatePassword('password12345',12)).toThrow();
  });
  it('enforces cross-site cookie and origin settings',()=>{
    expect(sessionCookieOptions(config())).toMatchObject({httpOnly:true,sameSite:'lax',path:'/'});
    expect(originAllowed('https://uniinside.net',config())).toBe(true);
    expect(originAllowed('https://attacker.example',config())).toBe(false);
    expect(()=>loadConfig({NODE_ENV:'production',DB_HOST:'x',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'replace-with-a-long-random-secret-of-at-least-32-chars',ANALYTICS_HASH_PEPPER:'b'.repeat(40),SESSION_COOKIE_SECURE:'true'})).toThrow(/Replace example security peppers/);
  });
  it('keeps media folders controlled and analytics events matched to entities',()=>{
    expect(folderFor('products','golden-cube')).toBe('uni-inside/products/golden-cube');
    expect(()=>folderFor('products','../private')).toThrow();
    const input=eventSchema.parse({eventUuid:'03b8c029-7e80-414c-84d2-95bc349627f4',eventName:'product_view',entityType:'product',entityId:3,pagePath:'/products/cube?secret=1'});
    expect(normalizeEvent(input,'127.0.0.1','mobile',config())).toMatchObject({path:'/products/cube',device:'mobile',entityType:'product'});
    expect(()=>normalizeEvent({...input,entityType:'news'},'127.0.0.1','desktop',config())).toThrow();
    expect(()=>normalizeEvent({...input,eventName:'product_purchase_link_click'},'127.0.0.1','desktop',config())).toThrow();
  });
  it('signs only controlled Cloudinary asset folders and prefixes',async()=>{
    expect(config().CLOUDINARY_ROOT_FOLDER).toBe('uni-inside');
    for(const scope of ['site','users','team','partners','achievements'])expect(folderFor(scope,undefined,'studio-assets')).toBe(`studio-assets/${scope}`);
    for(const scope of ['products','services','projects','news'])expect(folderFor(scope,'item-one','studio-assets')).toBe(`studio-assets/${scope}/item-one`);
    for(const root of ['/root','root/','root//bad','root/../bad','Root'])expect(()=>folderFor('site',undefined,root)).toThrow();
    expect(()=>folderFor('products')).toThrow();
    expect(()=>folderFor('products','../wrong')).toThrow();
    const mediaConfig={...config(),CLOUDINARY_CLOUD_NAME:'example',CLOUDINARY_API_KEY:'public-key',CLOUDINARY_API_SECRET:'test-secret',CLOUDINARY_ROOT_FOLDER:'studio-assets'};
    const signed=signedUpload(mediaConfig,'products','item-one');
    expect(signed).toMatchObject({asset_folder:'studio-assets/products/item-one',public_id_prefix:'studio-assets/products/item-one'});
    expect(signed).not.toHaveProperty('folder');
    const resource=vi.spyOn(cloudinary.api,'resource').mockResolvedValue({resource_type:'image',format:'webp',bytes:100,width:100,height:100,secure_url:'https://res.cloudinary.com/example/image/upload/item.webp',public_id:'studio-assets/products/item-one/item'} as never);
    await expect(verifyUpload(mediaConfig,'studio-assets/products/item-one/item','products','item-one')).resolves.toMatchObject({folder:'studio-assets/products/item-one'});
    await expect(verifyUpload(mediaConfig,'studio-assets/products/other/item','products','item-one')).rejects.toThrow();
    resource.mockRestore();
  });
});
