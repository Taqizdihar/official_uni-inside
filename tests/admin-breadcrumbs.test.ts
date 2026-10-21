import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveBreadcrumb} from '../src/admin/breadcrumbs';

const labels=(path:string)=>resolveBreadcrumb(path).map(crumb=>crumb.label);
test('CMS breadcrumb resolves primary pages and creation routes',()=>{
  assert.deepEqual(labels('/admin/dashboard'),['Internal CMS','Dashboard']);
  assert.deepEqual(labels('/admin/analytics'),['Internal CMS','Analitik']);
  assert.deepEqual(labels('/admin/content/products'),['Internal CMS','Daftar Produk']);
  assert.deepEqual(labels('/admin/content/products/new'),['Internal CMS','Daftar Produk','Tambah Produk']);
  assert.deepEqual(labels('/admin/content/services/new'),['Internal CMS','Daftar Layanan','Tambah Layanan']);
  assert.deepEqual(labels('/admin/content/news/new'),['Internal CMS','Daftar Artikel','Tambah Artikel']);
});
test('CMS breadcrumb names editing and fixed resource routes without raw IDs',()=>{
  assert.deepEqual(labels('/admin/content/products/487'),['Internal CMS','Daftar Produk','Edit Produk']);
  assert.deepEqual(labels('/admin/content/product-categories/33'),['Internal CMS','Kategori Produk','Edit Kategori Produk']);
  assert.deepEqual(labels('/admin/site/page-settings/media_kit'),['Internal CMS','Pengaturan Halaman','Media Kit']);
  assert.deepEqual(labels('/admin/homepage/homepage-sections/products'),['Internal CMS','Bagian Homepage','Produk']);
  assert.deepEqual(labels('/admin/homepage/hero-settings/1'),['Internal CMS','Hero','Pengaturan Hero']);
});
