import * as THREE from 'three';

/** Longest bounding-box dimension the normalized model is scaled to. */
export const HERO_TARGET_MODEL_SIZE = 5.4;
/** Only used when the GLB reports no usable bounding sphere at all. */
export const HERO_FALLBACK_SPHERE_RADIUS = 1.4;

export interface HeroModelNormalization {
  boxSize: THREE.Vector3;
  center: THREE.Vector3;
  sphereRadius: number;
  normalizedScale: number;
  scaledRadius: number;
  isValid: boolean;
}

const isFiniteVector = (vector: THREE.Vector3) =>
  Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);

/**
 * Deterministic model normalization.
 *
 * The measurement is taken from a freshly cloned, canonically transformed model
 * so an initial load and a browser-Back remount always produce identical
 * numbers. Nothing here depends on the camera, the reveal scale, the idle
 * animation or OrbitControls.
 */
export const computeHeroModelNormalization = (model: THREE.Object3D): HeroModelNormalization => {
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const boxSize = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const maxDimension = Math.max(boxSize.x, boxSize.y, boxSize.z);

  const isValid =
    !box.isEmpty() &&
    isFiniteVector(boxSize) &&
    isFiniteVector(center) &&
    Number.isFinite(maxDimension) &&
    maxDimension > 0;

  const normalizedScale = isValid ? HERO_TARGET_MODEL_SIZE / maxDimension : 1;
  const safeCenter = isValid ? center : new THREE.Vector3();

  const sphereRadius = Number.isFinite(sphere.radius) && sphere.radius > 0
    ? sphere.radius
    : isValid && maxDimension * 0.5 > 0
      ? maxDimension * 0.5
      : HERO_FALLBACK_SPHERE_RADIUS;

  const scaledRadius = sphereRadius * normalizedScale;

  return {
    boxSize,
    center: safeCenter,
    sphereRadius,
    normalizedScale,
    scaledRadius: Number.isFinite(scaledRadius) && scaledRadius > 0 ? scaledRadius : HERO_FALLBACK_SPHERE_RADIUS,
    isValid,
  };
};
