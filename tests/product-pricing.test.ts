import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { variantFinalPrice } from '../src/pages/productPricing';

test('public variant prices match the final prices editors entered', () => {
  const product = { base_price: '50000.00' };
  assert.equal(variantFinalPrice(product, { final_price: 75000, price_adjustment: '25000.00' }), 75000);
  assert.equal(variantFinalPrice(product, { price_adjustment: '25000.00' }), 75000);
  assert.equal(variantFinalPrice(product, { price_adjustment: '0.00' }), 50000);
  assert.equal(variantFinalPrice(product, { price_adjustment: '-12500.25' }), 37499.75);
  assert.equal(variantFinalPrice(product, { final_price: null, price_adjustment: '25000.00' }), null);
  assert.equal(variantFinalPrice(product, { price_adjustment: 'invalid' }), null);
  assert.equal(variantFinalPrice({ base_price: null }, { price_adjustment: '5' }), null);
});
