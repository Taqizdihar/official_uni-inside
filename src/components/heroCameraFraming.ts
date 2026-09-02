import * as THREE from 'three';

/** Fraction of the perfectly-fitting distance the Hero composition uses. */
export const HERO_CAMERA_FILL_RATIO = 0.95;

export interface HeroCameraFramingInput {
  width: number;
  height: number;
  fov: number;
  scaledRadius: number;
}

export interface HeroCameraFraming {
  aspect: number;
  distance: number;
  near: number;
  far: number;
}

/**
 * Pure, deterministic Hero camera framing.
 *
 * Returns `null` for any input that cannot produce a usable frustum, so callers
 * never install a camera derived from a zero-sized or transitional layout.
 */
export const computeHeroCameraFraming = ({
  width,
  height,
  fov,
  scaledRadius,
}: HeroCameraFramingInput): HeroCameraFraming | null => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (!Number.isFinite(fov) || fov <= 0 || fov >= 180) return null;
  if (!Number.isFinite(scaledRadius) || scaledRadius <= 0) return null;

  const aspect = width / height;
  const fovRadians = THREE.MathUtils.degToRad(fov);
  const verticalDistance = scaledRadius / Math.sin(fovRadians / 2);
  const horizontalDistance = verticalDistance / Math.min(1, aspect);
  const distance = Math.max(verticalDistance, horizontalDistance) * HERO_CAMERA_FILL_RATIO;

  if (!Number.isFinite(aspect) || aspect <= 0) return null;
  if (!Number.isFinite(distance) || distance <= 0) return null;

  return { aspect, distance, near: distance / 100, far: distance * 100 };
};

/** Signature of everything the framing result depends on. */
export const heroCameraFramingSignature = (
  cameraUuid: string,
  { width, height, fov, scaledRadius }: HeroCameraFramingInput,
) => `${cameraUuid}|${Math.round(width)}x${Math.round(height)}|${fov.toFixed(4)}|${scaledRadius.toFixed(6)}`;
