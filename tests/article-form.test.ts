import assert from 'node:assert/strict';
import test from 'node:test';
import { moveArticleImage, validReadingMinutes } from '../src/admin/news/articleForm';

test('manual article reading time accepts only whole minutes within the documented limit', () => {
  for (const value of ['1', '12', '999']) assert.equal(validReadingMinutes(value), true);
  for (const value of ['', '0', '-2', '1.5', '1000', 'ten']) assert.equal(validReadingMinutes(value), false);
});

test('article image reordering preserves all selected assets and their relative order', () => {
  const images = [1, 2, 3, 4].map(id => ({ id, secure_url: `https://example.test/${id}.jpg` }));
  assert.deepEqual(moveArticleImage(images, 0, 2).map(image => image.id), [2, 3, 1, 4]);
  assert.deepEqual(moveArticleImage(images, 3, 1).map(image => image.id), [1, 4, 2, 3]);
  assert.equal(moveArticleImage(images, 0, -1), images);
});
