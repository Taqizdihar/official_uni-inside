import { describe, expect, it } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { createCompleteService, sanitizeServiceDescription, serviceSummary, validateServiceCreate } from '../src/services/serviceCreation';

const input = {
  name: 'Produksi Video', category_id: 3, description: '<p><strong>Video</strong> untuk brand.</p>',
  cover_media_id: 11, gallery_media_ids: [12, 13], pricing_type: 'starting_from',
  starting_price: 1500000, currency_code: 'IDR', price_note: 'Sesuai lingkup proyek',
  estimated_duration: '2–4 minggu',
  items: [{ item_type: 'deliverable', label: 'Video final' }, { item_type: 'requirement', label: 'Brief' }],
  process_steps: [{ title: 'Diskusi', description: 'Bahas kebutuhan' }, { title: 'Produksi', description: '' }],
  primary_cta_label: '', primary_cta_url: '', status: 'published',
};
const actor = { id: 7, permissions: new Set(['services.create', 'services.publish']) };

function fakeDatabase(failStep = false, slugTaken = false) {
  const calls: { sql: string; values: unknown[] }[] = [];
  let committed = false, rolledBack = false;
  let slugChecks = 0;
  const conn = {
    beginTransaction: async () => {}, commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; }, release: () => {},
    execute: async (options: { sql: string }, values: unknown[] = []) => {
      const sql = options.sql;
      calls.push({ sql, values });
      if (sql.includes('FROM service_categories')) return [[{ id: 3 }], []];
      if (sql.includes('FROM media_assets')) return [[{ id: 11 }, { id: 12 }, { id: 13 }], []];
      if (sql.includes('FROM services WHERE slug=')) return [slugTaken && slugChecks++ === 0 ? [{ id: 2 }] : [], []];
      if (sql.startsWith('INSERT INTO services')) return [{ insertId: 42 }, []];
      if (sql.startsWith('INSERT INTO service_process_steps') && failStep) throw new Error('simulated child failure');
      if (sql.includes('FROM `services`')) return [[{ id: 42, name: input.name, status: input.status }], []];
      if (sql.includes('MAX(revision_number)')) return [[{ next: 1 }], []];
      return [{ affectedRows: 1 }, []];
    },
  };
  return { db: { getConnection: async () => conn } as unknown as Pool, calls, state: () => ({ committed, rolledBack }) };
}

describe('complete service creation', () => {
  it('derives plain summary and removes unsafe rich content', () => {
    const html = sanitizeServiceDescription('<p><u>Halo</u> <a href="javascript:alert(1)">klik</a></p><script>alert(1)</script>');
    expect(html).toContain('<u>Halo</u>');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('<script>');
    expect(serviceSummary(html)).toBe('Halo klik');
    expect(serviceSummary('<p>Satu</p><p>Dua</p>')).toBe('Satu Dua');
    expect(sanitizeServiceDescription('<a href="/services">Layanan</a>')).toContain('href="/services"');
  });
  it('rejects unsafe or half-configured CTA links and duplicate images', () => {
    for (const url of ['javascript:alert(1)', '//elsewhere.example', 'http:/broken', 'https://user:pass@example.com', '/unsafe\\path', '\nhttps://example.com']) {
      expect(() => validateServiceCreate({ ...input, primary_cta_label: 'Buka', primary_cta_url: url }, true)).toThrow();
    }
    expect(() => validateServiceCreate({ ...input, primary_cta_label: 'Buka' }, true)).toThrow();
    expect(() => validateServiceCreate({ ...input, gallery_media_ids: [11] }, true)).toThrow();
    expect(validateServiceCreate({ ...input, primary_cta_label: 'Kontak', primary_cta_url: '/#contact-us' }, true).primary_cta_url).toBe('/#contact-us');
    expect(validateServiceCreate({ ...input, primary_cta_label: 'Email', primary_cta_url: 'mailto:halo@example.com' }, true).primary_cta_url).toBe('mailto:halo@example.com');
    expect(validateServiceCreate({ ...input, primary_cta_label: 'Telepon', primary_cta_url: 'tel:+6222 123456' }, true).primary_cta_url).toBe('tel:+6222 123456');
  });
  it('requires publish permission and model-specific public pricing details', () => {
    expect(() => validateServiceCreate(input, false)).toThrow();
    expect(() => validateServiceCreate({ ...input, starting_price: null }, true)).toThrow();
    expect(() => validateServiceCreate({ ...input, pricing_type: 'range', price_note: '' }, true)).toThrow();
    expect(validateServiceCreate({ ...input, pricing_type: 'contact', starting_price: null, status: 'draft' }, false).status).toBe('draft');
  });
  it('saves parent and ordered children in one transaction with audit and revision', async () => {
    const test = fakeDatabase();
    const result = await createCompleteService(test.db, input, actor, 'request-1');
    expect(result).toMatchObject({ id: 42, gallery_media_ids: [12, 13], items: input.items, process_steps: input.process_steps });
    expect(test.state()).toEqual({ committed: true, rolledBack: false });
    expect(test.calls.filter(call => call.sql.startsWith('INSERT INTO service_images')).map(call => call.values)).toEqual([[42, 11, 1, 0], [42, 12, 0, 1], [42, 13, 0, 2]]);
    expect(test.calls.find(call => call.sql.includes('FROM media_assets'))?.values.at(-1)).toBe('uni-inside/services/%');
    expect(test.calls.filter(call => call.sql.startsWith('INSERT INTO service_list_items')).map(call => call.values.at(-1))).toEqual([0, 1]);
    expect(test.calls.filter(call => call.sql.startsWith('INSERT INTO service_process_steps')).map(call => call.values.at(-1))).toEqual([0, 1]);
    expect(test.calls.some(call => call.sql.startsWith('INSERT INTO content_revisions'))).toBe(true);
    expect(test.calls.some(call => call.sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  });
  it('rolls back the parent and prior children if a later step fails', async () => {
    const test = fakeDatabase(true);
    await expect(createCompleteService(test.db, input, actor, 'request-2')).rejects.toThrow('simulated child failure');
    expect(test.state()).toEqual({ committed: false, rolledBack: true });
    expect(test.calls.some(call => call.sql.startsWith('INSERT INTO services'))).toBe(true);
  });
  it('generates a unique suffix when the derived slug is already used', async () => {
    const test = fakeDatabase(false, true);
    await createCompleteService(test.db, input, actor, 'request-3');
    const insert = test.calls.find(call => call.sql.startsWith('INSERT INTO services'))!;
    expect(insert.values[2]).toBe('produksi-video-2');
  });
});
