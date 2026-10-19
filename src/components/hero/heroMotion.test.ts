import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRotorAngle, smoothStep } from './heroMotion';

test('a drone rotor advances in one direction and keeps its angle across repeated activations', () => {
  let angle = 0;
  for (const activity of [0, 0.2, 1, 1, 0.5, 0, 0, 0.7, 1, 0]) {
    const next = advanceRotorAngle(angle, 1 / 60, activity);
    assert.ok(next >= angle);
    assert.equal(next === angle, activity === 0);
    angle = next;
  }
  assert.ok(angle > 0.9);
  assert.equal(advanceRotorAngle(angle, -1, 1), angle);
});

test('intro easing is bounded and reaches its endpoints without overshoot', () => {
  assert.equal(smoothStep(-1), 0);
  assert.equal(smoothStep(0), 0);
  assert.equal(smoothStep(1), 1);
  assert.equal(smoothStep(2), 1);
  assert.ok(smoothStep(0.25) < 0.25);
  assert.ok(smoothStep(0.75) > 0.75);
});
