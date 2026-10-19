import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servicePreviewPrice } from '../src/admin/services/serviceForm.ts';

test('service preview pricing never invents a range or contact price', () => {
  const base = { starting_price: 250000, currency_code: 'IDR', price_note: 'Sesuai kebutuhan' };
  assert.equal(servicePreviewPrice({ ...base, pricing_type: 'contact' }).value, 'Sesuai kebutuhan');
  assert.equal(servicePreviewPrice({ ...base, pricing_type: 'range' }).value, 'Sesuai kebutuhan');
  assert.match(servicePreviewPrice({ ...base, pricing_type: 'fixed' }).value, /250\.000/);
  assert.match(servicePreviewPrice({ ...base, pricing_type: 'starting_from' }).value, /250\.000/);
});
