import * as THREE from 'three';

export const HERO_CAMERA = {
  spinDuration: 1300,
  spinRadians: Math.PI * 6,
  footprintRadius: Math.sqrt(20),
  topPadding: 1.1,
  frontPadding: 1.06,
  desktopWidth: 0.58,
  desktopCenter: 0.7,
  interactionStart: 0.4,
  mobileWidth: 0.94,
} as const;

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CameraFrame {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function createHeroCameraPoses() {
  const topPosition = new THREE.Vector3(0, 22, 0);
  // Restore the original leftward three-quarter azimuth without changing the top pose.
  const frontPosition = new THREE.Vector3(5, 10, 14);
  const topQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(topPosition, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)),
  );
  const frontQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(frontPosition, new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(0, 1, 0)),
  );
  return { topPosition, frontPosition, topQuaternion, frontQuaternion };
}

export function introCameraProgress(elapsed: number, duration: number) {
  const linear = THREE.MathUtils.clamp((elapsed - HERO_CAMERA.spinDuration) / Math.max(1, duration - HERO_CAMERA.spinDuration), 0, 1);
  return linear < 0.5 ? 4 * linear ** 3 : 1 - (-2 * linear + 2) ** 3 / 2;
}

export function introSpinRotation(elapsed: number) {
  const progress = THREE.MathUtils.clamp(elapsed / HERO_CAMERA.spinDuration, 0, 1);
  if (progress === 1) return 0;
  return -HERO_CAMERA.spinRadians * (1 - progress) ** 3;
}

export function fitHeroCameraFrames(aspect: number, active: CameraBounds, radius: number, desktop: boolean): { top: CameraFrame; front: CameraFrame } {
  const safeAspect = Math.max(0.01, aspect);
  // Mobile reserves side space for the two decorative intro marks.
  const diameter = Math.max(HERO_CAMERA.footprintRadius, radius) * 2 * (desktop ? HERO_CAMERA.topPadding : 1.4);
  const topHeight = Math.max(diameter, diameter / safeAspect);
  const frontHeight = Math.max(
    (active.maxY - active.minY) * HERO_CAMERA.frontPadding,
    (active.maxX - active.minX) / (safeAspect * (desktop ? HERO_CAMERA.desktopWidth : HERO_CAMERA.mobileWidth)),
  );
  return {
    top: { width: topHeight * safeAspect, height: topHeight, centerX: 0, centerY: 0 },
    front: {
      width: frontHeight * safeAspect,
      height: frontHeight,
      centerX: (active.minX + active.maxX) / 2,
      centerY: (active.minY + active.maxY) / 2,
    },
  };
}
