import assert from 'node:assert/strict';
import test from 'node:test';
import {PRODUCTION_RENDER_API_BASE,resolveApiBase,resolveFrontendApiBase} from '../src/config/resolveApiBase';

test('resolves local, HTTPS production, and future same-origin API bases',()=>{
  assert.equal(resolveApiBase({},false),'http://localhost:4000/api/v1');
  assert.equal(resolveApiBase({VITE_API_BASE_URL:'https://api.example.invalid/api/v1///'},true),'https://api.example.invalid/api/v1');
  assert.equal(resolveApiBase({VITE_API_BASE_URL:'/api/v1'},true),'/api/v1');
});

test('rejects missing, insecure, credential-bearing, or incorrectly scoped production API bases',()=>{
  assert.throws(()=>resolveApiBase({},true),/must be set/);
  assert.throws(()=>resolveApiBase({VITE_API_BASE_URL:'http://api.example.invalid/api/v1'},true),/HTTPS/);
  assert.throws(()=>resolveApiBase({VITE_API_BASE_URL:'https://user:pass@api.example.invalid/api/v1'},true),/credentials/);
  assert.throws(()=>resolveApiBase({VITE_API_BASE_URL:'https://api.example.invalid/v1'},true),/\/api\/v1/);
});

test('production frontend bypasses the Kroombox gateway regardless of injected VITE_API_BASE_URL',()=>{
  for (const configured of [undefined, '', '/api/v1', 'https://uniinside.net/api/v1', 'https://cms-api.example.invalid/api/v1', 'http://localhost:4000/api/v1']) {
    assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:configured},true),PRODUCTION_RENDER_API_BASE);
  }
  assert.equal(PRODUCTION_RENDER_API_BASE,'https://uni-inside-studio-landing-page.onrender.com/api/v1');
});

test('development frontend still honors configured API URLs and local fallback',()=>{
  assert.equal(resolveFrontendApiBase({},false),'http://localhost:4000/api/v1');
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'/api/v1'},false),'/api/v1');
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'https://dev.example.invalid/api/v1'},false),'https://dev.example.invalid/api/v1');
});
