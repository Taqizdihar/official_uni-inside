import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveApiBase,resolveFrontendApiBase} from '../src/config/resolveApiBase';

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

test('production frontend uses the configured HTTPS or same-origin API base',()=>{
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'/api/v1'},true),'/api/v1');
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'https://backend.example.com/api/v1'},true),'https://backend.example.com/api/v1');
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'https://uni-inside-studio-landing-page.onrender.com/api/v1'},true),'https://uni-inside-studio-landing-page.onrender.com/api/v1');
});

test('production frontend rejects missing or invalid API configuration',()=>{
  for (const configured of [undefined, '', '  ']) {
    assert.throws(()=>resolveFrontendApiBase({VITE_API_BASE_URL:configured},true),/VITE_API_BASE_URL must be set/);
  }
  for (const configured of ['http://localhost:4000/api/v1', 'https://backend.example.com/v1', '//backend.example.com/api/v1']) {
    assert.throws(()=>resolveFrontendApiBase({VITE_API_BASE_URL:configured},true),/VITE_API_BASE_URL/);
  }
});

test('development frontend still honors configured API URLs and local fallback',()=>{
  assert.equal(resolveFrontendApiBase({},false),'http://localhost:4000/api/v1');
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'/api/v1'},false),'/api/v1');
  assert.equal(resolveFrontendApiBase({VITE_API_BASE_URL:'https://dev.example.invalid/api/v1'},false),'https://dev.example.invalid/api/v1');
});
