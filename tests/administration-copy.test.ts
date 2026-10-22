import test from 'node:test';
import assert from 'node:assert/strict';
import {auditActionLabel,auditActorLabel,auditEntityLabel,formatCmsUtc} from '../src/admin/copy.ts';

test('MySQL UTC date strings render once in Indonesian WIB',()=>{
  const rendered=formatCmsUtc('2026-10-21 17:43:00');
  assert.match(rendered,/22 Okt 2026/);
  assert.match(rendered,/00[.:]43/);
  assert.equal(formatCmsUtc('2026-10-21T17:43:00Z'),rendered);
});

test('audit labels are readable without leaking raw codes',()=>{
  assert.equal(auditActionLabel('auth.login'),'Masuk ke CMS');
  assert.equal(auditActionLabel('users.password.admin_reset'),'Reset password anggota');
  assert.equal(auditActionLabel('news_articles.create'),'Membuat artikel');
  assert.equal(auditActionLabel('unexpected.private'),'Aktivitas lainnya');
  assert.equal(auditEntityLabel('hero_settings:1'),'Hero');
  assert.equal(auditEntityLabel('users'),'Pengguna');
  assert.equal(auditEntityLabel('unknown_table'),'Konten CMS');
  assert.equal(auditActorLabel(7,null),'Pengguna tidak tersedia');
  assert.equal(auditActorLabel(null,null),'Aksi sistem');
  assert.equal(auditActorLabel(7,'Ayu'),'Ayu');
});
