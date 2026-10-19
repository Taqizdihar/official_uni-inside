import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { HERO_CAMERA, createHeroCameraPoses, fitHeroCameraFrames, introCameraProgress, introSpinRotation } from './heroCamera';

test('the primary spin uses a stable true top-down camera above the floor center', () => {
  const poses = createHeroCameraPoses();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(poses.topQuaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(poses.topQuaternion);
  assert.deepEqual(poses.topPosition.toArray(), [0, 22, 0]);
  assert.ok(forward.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-12);
  assert.ok(up.distanceTo(new THREE.Vector3(0, 0, -1)) < 1e-12);
  for (const elapsed of [0, 200, 600, 1000, HERO_CAMERA.spinDuration]) assert.equal(introCameraProgress(elapsed, 2200), 0);
  assert.equal(introSpinRotation(HERO_CAMERA.spinDuration), 0);
  assert.equal(introCameraProgress(2200, 2200), 1);
});

test('the settled camera restores the previous leftward three-quarter view in both rooms', () => {
  const poses = createHeroCameraPoses();
  const camera = new THREE.OrthographicCamera(-7, 7, 4, -4, 0.1, 80);
  camera.position.copy(poses.frontPosition);
  camera.quaternion.copy(poses.frontQuaternion);
  camera.updateMatrixWorld();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(poses.frontQuaternion);
  assert.deepEqual(poses.frontPosition.toArray(), [5, 10, 14]);
  assert.ok(forward.x < -0.25);
  assert.ok(forward.y < 0 && forward.z < 0);
  for (const rotation of [0, Math.PI, 0, Math.PI, 0, Math.PI, 0, Math.PI, 0, Math.PI]) {
    const root = new THREE.Matrix4().makeRotationY(rotation);
    const left = new THREE.Vector3(-2, 2.8, rotation ? -0.08 : 0.08).applyMatrix4(root).project(camera);
    const right = new THREE.Vector3(2, 2.8, rotation ? -0.08 : 0.08).applyMatrix4(root).project(camera);
    assert.ok(Math.abs(left.y - right.y) > 0.01);
  }
  const wallLeft = new THREE.Vector3(-2, 2.8, 0.08).project(camera);
  const wallRight = new THREE.Vector3(2, 2.8, 0.08).project(camera);
  assert.ok(Math.abs(wallLeft.y - wallRight.y) > 0.01);
});

test('quaternion interpolation remains continuous throughout the top-down to three-quarter entrance', () => {
  const poses = createHeroCameraPoses();
  const quaternion = new THREE.Quaternion();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  for (let step = 0; step <= 100; step += 1) {
    quaternion.slerpQuaternions(poses.topQuaternion, poses.frontQuaternion, step / 100);
    forward.set(0, 0, -1).applyQuaternion(quaternion);
    right.set(1, 0, 0).applyQuaternion(quaternion);
    assert.ok(forward.toArray().every(Number.isFinite));
    assert.ok(Math.abs(forward.length() - 1) < 1e-12);
    assert.ok(Math.abs(right.length() - 1) < 1e-12);
    assert.ok(Math.abs(forward.dot(right)) < 1e-12);
  }
});

test('top-down framing fits every spun floor corner at 81–91% of the usable desktop height', () => {
  const frames = fitHeroCameraFrames(1918 / 698, { minX: -4, maxX: 4, minY: -3.3, maxY: 1.45 }, Math.sqrt(20), true);
  const minimumHeightRatio = 8 / frames.top.height;
  const maximumHeightRatio = Math.sqrt(20) * 2 / frames.top.height;
  assert.ok(minimumHeightRatio >= 0.8 && maximumHeightRatio <= 0.92);
  assert.ok(frames.top.width >= Math.sqrt(20) * 2);
  const frontWidthRatio = 8 / frames.front.width;
  assert.ok(frontWidthRatio <= HERO_CAMERA.desktopWidth + 1e-12 && frontWidthRatio > 0.57);
});
