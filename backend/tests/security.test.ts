import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env';
import { equalHash, hashPassword, hashToken, newToken, redact, sessionCookieOptions, validatePassword, verifyPassword } from '../src/utils/security';
import { originAllowed } from '../src/app';
import { folderFor } from '../src/services/media';
import { eventSchema, normalizeEvent } from '../src/services/analytics';

const config = () => loadConfig({ DB_HOST:'127.0.0.1',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000,https://uniinside.net' });
describe('security boundaries',()=>{
  it('validates deployment settings without printing secret values',()=>{
    expect(()=>loadConfig({NODE_ENV:'production',DB_HOST:'x',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'secret',ANALYTICS_HASH_PEPPER:'b'.repeat(40)})).toThrow(/AUTH_TOKEN_PEPPER/);
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
});
