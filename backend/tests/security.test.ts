import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env';
import { databaseTlsOptions } from '../src/database/tls';
import { clearCsrfCookieOptions, clearSessionCookieOptions, csrfCookieOptions, equalHash, hashPassword, hashToken, newToken, redact, sessionCookieOptions, validatePassword, verifyPassword } from '../src/utils/security';
import { originAllowed } from '../src/app';
import { folderFor, signedUpload, verifyUpload } from '../src/services/media';
import { v2 as cloudinary } from 'cloudinary';
import { vi } from 'vitest';
import { eventSchema, normalizeEvent } from '../src/services/analytics';
import { rootCertificates } from 'node:tls';

const config = () => loadConfig({ DB_HOST:'127.0.0.1',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000,https://uniinside.net' });
const caPem=rootCertificates[0]!;
const productionConfig=(overrides:Record<string,string>={})=>loadConfig({NODE_ENV:'production',HOST:'0.0.0.0',API_BASE_PATH:'/api/v1',PUBLIC_FRONTEND_URL:'https://uni-inside.pages.dev',ADMIN_FRONTEND_URL:'https://uni-inside.pages.dev/admin',CORS_ALLOWED_ORIGINS:'https://uni-inside.pages.dev',TRUST_PROXY:'true',DB_HOST:'db.example.invalid',DB_NAME:'uni-inside',DB_USER:'app',DB_PASSWORD:'test-password',DB_SSL_MODE:'required',DB_SSL_CA_BASE64:Buffer.from(caPem).toString('base64'),DB_SSL_REJECT_UNAUTHORIZED:'true',SESSION_COOKIE_SECURE:'true',SESSION_COOKIE_SAME_SITE:'none',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),...overrides});
describe('security boundaries',()=>{
  it('activates verified V2 CMS editors in production while preserving explicit rollback flags',()=>{
    const production=productionConfig();
    for(const key of ['SOCIAL_MEDIA_V2_ENABLED','PRODUCT_VARIANT_MEDIA_ENABLED','HERO_THREE_LINE_ENABLED','SECONDARY_CONTENT_SLOTS_ENABLED','CONTACT_PLACEMENTS_ENABLED','FOOTER_V2_ENABLED','TEAM_TEMPLATE_ENABLED','HOMEPAGE_NEWS_SELECTION_ENABLED','ABOUT_EDITORIAL_V2_ENABLED'] as const)expect(production[key]).toBe(true);
    expect(productionConfig({SECONDARY_CONTENT_SLOTS_ENABLED:'false'}).SECONDARY_CONTENT_SLOTS_ENABLED).toBe(false);
    expect(production.SECONDARY_PROJECTS_ENABLED).toBe(false);
    expect(production.TEAM_MEMBERS_PUBLIC_ENABLED).toBe(false);
    expect(production.PARTNERS_PUBLIC_ENABLED).toBe(false);
    expect(config().SECONDARY_CONTENT_SLOTS_ENABLED).toBe(false);
  });
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
  it('keeps Render/Aiven TLS verified and accepts system roots when no custom CA is needed',()=>{
    const production=productionConfig();
    expect(databaseTlsOptions(production)).toEqual({rejectUnauthorized:true,ca:caPem});
    expect(databaseTlsOptions(productionConfig({DB_SSL_CA_BASE64:''}))).toEqual({rejectUnauthorized:true});
    expect(()=>productionConfig({DB_SSL_CA_BASE64:'%%%'})).toThrow(/base64/);
    expect(()=>productionConfig({DB_SSL_CA_BASE64:Buffer.from('not a certificate').toString('base64')})).toThrow(/PEM certificate/);
    expect(()=>productionConfig({DB_SSL_CA_BASE64:Buffer.from('-----BEGIN CERTIFICATE-----\n%%%\n-----END CERTIFICATE-----\n').toString('base64')})).toThrow(/PEM certificate/);
    expect(()=>productionConfig({DB_SSL_CA_BASE64:Buffer.from('-----BEGIN CERTIFICATE-----\nYWJj\n-----END CERTIFICATE-----\n').toString('base64')})).toThrow(/PEM certificate/);
    expect(()=>productionConfig({DB_SSL_REJECT_UNAUTHORIZED:'false'})).toThrow(/DB_SSL_REJECT_UNAUTHORIZED/);
    expect(()=>productionConfig({DB_SSL_ALLOW_PRIVATE_NETWORK:'true'})).toThrow(/DB_SSL_ALLOW_PRIVATE_NETWORK/);
    expect(config().DB_SSL_ALLOW_PRIVATE_NETWORK).toBe(false);
    expect(databaseTlsOptions(config())).toBeUndefined();
  });
  it('requires an exact private-network opt-in before production can disable database TLS',()=>{
    const plaintext={DB_SSL_MODE:'disabled',DB_SSL_CA_BASE64:''};
    expect(()=>productionConfig(plaintext)).toThrow(/DB_SSL_ALLOW_PRIVATE_NETWORK/);
    expect(()=>productionConfig({...plaintext,DB_SSL_ALLOW_PRIVATE_NETWORK:'false'})).toThrow(/DB_SSL_ALLOW_PRIVATE_NETWORK/);
    for(const value of ['', '1', 'yes', 'TRUE']) expect(()=>productionConfig({...plaintext,DB_SSL_ALLOW_PRIVATE_NETWORK:value})).toThrow(/DB_SSL_ALLOW_PRIVATE_NETWORK/);
    const privateNetwork=productionConfig({...plaintext,DB_SSL_ALLOW_PRIVATE_NETWORK:'true'});
    expect(privateNetwork.DB_SSL_ALLOW_PRIVATE_NETWORK).toBe(true);
    expect(databaseTlsOptions(privateNetwork)).toBeUndefined();
    expect(()=>productionConfig({...plaintext,DB_SSL_ALLOW_PRIVATE_NETWORK:'true',DB_SSL_CA_BASE64:Buffer.from(caPem).toString('base64')})).toThrow(/DB_SSL_CA_BASE64/);
    expect(()=>productionConfig({...plaintext,DB_SSL_ALLOW_PRIVATE_NETWORK:'true',DB_SSL_REJECT_UNAUTHORIZED:'false'})).toThrow(/DB_SSL_REJECT_UNAUTHORIZED/);
  });
  it('requires exact production origins, distinct peppers, proxy trust, and complete Cloudinary settings',()=>{
    expect(productionConfig().origins).toEqual(['https://uni-inside.pages.dev']);
    expect(()=>productionConfig({CORS_ALLOWED_ORIGINS:'https://uni-inside.pages.dev/'})).toThrow(/CORS_ALLOWED_ORIGINS/);
    expect(()=>productionConfig({CORS_ALLOWED_ORIGINS:'https://*.pages.dev'})).toThrow(/CORS_ALLOWED_ORIGINS/);
    expect(()=>productionConfig({CORS_ALLOWED_ORIGINS:'https://uni-inside.pages.dev/path'})).toThrow(/CORS_ALLOWED_ORIGINS/);
    expect(()=>productionConfig({TRUST_PROXY:'false'})).toThrow(/TRUST_PROXY/);
    expect(()=>productionConfig({AUTH_TOKEN_PEPPER:'x'.repeat(40),ANALYTICS_HASH_PEPPER:'x'.repeat(40)})).toThrow(/distinct/);
    expect(()=>productionConfig({CLOUDINARY_CLOUD_NAME:'cloud'})).toThrow(/Cloudinary/);
    expect(()=>productionConfig({PUBLIC_FRONTEND_URL:'http://uni-inside.pages.dev'})).toThrow(/PUBLIC_FRONTEND_URL/);
    expect(()=>productionConfig({ADMIN_FRONTEND_URL:'https://uni-inside.pages.dev'})).toThrow(/ADMIN_FRONTEND_URL/);
  });
  it('creates cross-site cookies and matching clear options',()=>{
    const crossSite=productionConfig();
    expect(sessionCookieOptions(crossSite)).toMatchObject({httpOnly:true,secure:true,sameSite:'none',path:'/'});
    expect(csrfCookieOptions(crossSite)).toMatchObject({httpOnly:false,secure:true,sameSite:'none',path:'/'});
    expect(clearSessionCookieOptions(crossSite)).toMatchObject({httpOnly:true,secure:true,sameSite:'none',path:'/'});
    expect(clearCsrfCookieOptions(crossSite)).toMatchObject({httpOnly:false,secure:true,sameSite:'none',path:'/'});
    const sameSite=productionConfig({PUBLIC_FRONTEND_URL:'https://uniinside.net',ADMIN_FRONTEND_URL:'https://uniinside.net/admin',CORS_ALLOWED_ORIGINS:'https://uniinside.net',SESSION_COOKIE_SAME_SITE:'lax'});
    expect(sessionCookieOptions(sameSite)).toMatchObject({httpOnly:true,secure:true,sameSite:'lax',path:'/'});
    expect(csrfCookieOptions(sameSite)).toMatchObject({httpOnly:false,secure:true,sameSite:'lax',path:'/'});
    expect(sessionCookieOptions(sameSite)).not.toHaveProperty('domain');
    expect(()=>productionConfig({SESSION_COOKIE_SECURE:'false',SESSION_COOKIE_SAME_SITE:'none'})).toThrow(/Secure cookies/);
    expect(()=>loadConfig({DB_HOST:'127.0.0.1',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),SESSION_COOKIE_SAME_SITE:'none'})).toThrow(/SameSite=None/);
  });
  it('keeps media folders controlled and analytics events matched to entities',()=>{
    expect(folderFor('products','golden-cube')).toBe('uni-inside/products');
    expect(folderFor('products','../private')).toBe('uni-inside/products');
    const input=eventSchema.parse({eventUuid:'03b8c029-7e80-414c-84d2-95bc349627f4',eventName:'product_view',entityType:'product',entityId:3,pagePath:'/products/cube?secret=1'});
    expect(normalizeEvent(input,'127.0.0.1','mobile',config())).toMatchObject({path:'/products/cube',device:'mobile',entityType:'product'});
    expect(()=>normalizeEvent({...input,entityType:'news'},'127.0.0.1','desktop',config())).toThrow();
    expect(()=>normalizeEvent({...input,eventName:'product_purchase_link_click'},'127.0.0.1','desktop',config())).toThrow();
  });
  it('signs only controlled Cloudinary asset folders and prefixes',async()=>{
    expect(config().CLOUDINARY_ROOT_FOLDER).toBe('uni-inside');
    for(const scope of ['site','users','team','partners','achievements'])expect(folderFor(scope,undefined,'studio-assets')).toBe(`studio-assets/${scope}`);
    for(const scope of ['products','services','projects','news'])expect(folderFor(scope,'item-one','studio-assets')).toBe(`studio-assets/${scope}`);
    for(const root of ['/root','root/','root//bad','root/../bad','Root'])expect(()=>folderFor('site',undefined,root)).toThrow();
    expect(folderFor('products')).toBe('uni-inside/products');
    expect(folderFor('products','../wrong')).toBe('uni-inside/products');
    const mediaConfig={...config(),CLOUDINARY_CLOUD_NAME:'example',CLOUDINARY_API_KEY:'public-key',CLOUDINARY_API_SECRET:'test-secret',CLOUDINARY_ROOT_FOLDER:'studio-assets'};
    const signed=signedUpload(mediaConfig,'postingan','products','item.png',1);
    expect(signed).toMatchObject({asset_folder:'studio-assets/products',public_id_prefix:'studio-assets/products'});
    expect(signed).not.toHaveProperty('folder');
    const resource=vi.spyOn(cloudinary.api,'resource').mockResolvedValue({resource_type:'image',format:'webp',bytes:100,width:100,height:100,secure_url:'https://res.cloudinary.com/example/image/upload/item.webp',public_id:'studio-assets/products/item',asset_folder:'studio-assets/products'} as never);
    await expect(verifyUpload(mediaConfig,'studio-assets/products/item','postingan','products')).resolves.toMatchObject({folder:'studio-assets/products'});
    await expect(verifyUpload(mediaConfig,'studio-assets/products/other/item','postingan','products')).rejects.toThrow();
    resource.mockRestore();
  });
});
