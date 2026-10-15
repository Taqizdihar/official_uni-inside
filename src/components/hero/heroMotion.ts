import * as THREE from 'three';

/** Cumulative rotation keeps a propeller's direction through every activation cycle. */
export function advanceRotorAngle(angle: number, deltaSeconds: number, activity: number, speed = 14) {
  return angle + Math.max(0, Math.min(deltaSeconds, 0.05)) * Math.max(0, activity) * speed;
}

export function smoothStep(value: number) {
  const progress = Math.min(1, Math.max(0, value));
  return progress * progress * (3 - 2 * progress);
}

/** Animate one already-isolated monitor material and restore its exact palette when inactive. */
export function updateRgbScreen(
  material: THREE.MeshStandardMaterial,
  baseColor: THREE.Color,
  baseEmissive: THREE.Color,
  activity: number,
  time: number,
  reducedMotion: boolean,
  rgbColor: THREE.Color,
  nextColor: THREE.Color,
  nextEmissive: THREE.Color,
) {
  const amount = reducedMotion ? 0 : THREE.MathUtils.clamp(activity, 0, 1);
  if (amount === 0) {
    material.color.copy(baseColor);
    material.emissive.copy(baseEmissive);
    return;
  }

  // One full HSL hue loop gives cyan → blue → magenta → red → yellow → green → cyan.
  rgbColor.setHSL((0.5 + (time * 0.08) % 1) % 1, 0.95, 0.55);
  nextColor.copy(baseColor).lerp(rgbColor, amount);
  nextEmissive.copy(baseEmissive).lerp(rgbColor, amount);
  material.color.copy(nextColor);
  material.emissive.copy(nextEmissive);
}
