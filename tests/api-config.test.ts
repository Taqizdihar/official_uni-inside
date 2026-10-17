import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveApiBase} from '../src/config/resolveApiBase';

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
