import * as THREE from 'three';

/**
 * Read-only Hero scene diagnostics.
 *
 * Enabled in `vite dev` and in any build started with `VITE_HERO_DIAG=1`.
 * In a normal production build both operands fold to `false`, so every helper
 * below is eliminated by the bundler and nothing is exposed at runtime.
 */
export const HERO_DIAGNOSTICS_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_HERO_DIAG === '1';

export interface HeroModelMetrics {
  boxSize: [number, number, number];
  center: [number, number, number];
  sphereRadius: number;
  normalizedScale: number;
  scaledRadius: number;
  isValid: boolean;
  rootPosition: [number, number, number];
  preciseBoxSize: [number, number, number] | null;
}

export interface HeroFramingMetrics {
  width: number;
  height: number;
  fov: number;
  aspect: number;
  distance: number;
  near: number;
  far: number;
  cameraUuid: string;
  isCanonical: boolean;
}

interface HeroDiagnosticsState {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  gl: THREE.WebGLRenderer | null;
  size: { width: number; height: number } | null;
  controls: unknown;
  model: HeroModelMetrics | null;
  framing: HeroFramingMetrics | null;
  framingUpdates: number;
  readyEvents: number;
  mountId: number;
}

const state: HeroDiagnosticsState = {
  scene: null,
  camera: null,
  gl: null,
  size: null,
  controls: null,
  model: null,
  framing: null,
  framingUpdates: 0,
  readyEvents: 0,
  mountId: 0,
};

const vec = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

export const recordHeroModelMetrics = (metrics: HeroModelMetrics) => {
  if (!HERO_DIAGNOSTICS_ENABLED) return;
  state.model = metrics;
};

export const recordHeroFraming = (framing: HeroFramingMetrics) => {
  if (!HERO_DIAGNOSTICS_ENABLED) return;
  state.framing = framing;
  state.framingUpdates += 1;
};

export const recordHeroReady = () => {
  if (!HERO_DIAGNOSTICS_ENABLED) return;
  state.readyEvents += 1;
};

const findByName = (root: THREE.Object3D | null, name: string) => root?.getObjectByName(name) ?? null;

const describe = (object: THREE.Object3D | null) =>
  object
    ? {
        position: vec(object.position),
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z] as [number, number, number],
        scale: vec(object.scale),
      }
    : null;

const projectedBounds = (object: THREE.Object3D | null, camera: THREE.Camera, width: number, height: number) => {
  if (!object) return null;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object, true);
  if (box.isEmpty()) return null;
  const corner = new THREE.Vector3();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 8; i += 1) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    corner.project(camera);
    const x = (corner.x * 0.5 + 0.5) * width;
    const y = (0.5 - corner.y * 0.5) * height;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return {
    world: { min: vec(box.min), max: vec(box.max), size: vec(box.getSize(new THREE.Vector3())) },
    screen: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
  };
};

/**
 * Projected bounds of the normalized model with the idle rotation and float
 * neutralized, so the number depends only on model normalization, reveal scale
 * and camera framing - never on the animation phase.
 */
const projectedCanonicalBounds = (
  model: HeroModelMetrics | null,
  revealScale: number,
  camera: THREE.Camera,
  width: number,
  height: number,
) => {
  if (!model) return null;
  const half = new THREE.Vector3(...model.boxSize).multiplyScalar(0.5 * model.normalizedScale * revealScale);
  const corner = new THREE.Vector3();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 8; i += 1) {
    corner.set(i & 1 ? half.x : -half.x, i & 2 ? half.y : -half.y, i & 4 ? half.z : -half.z);
    corner.project(camera);
    const x = (corner.x * 0.5 + 0.5) * width;
    const y = (0.5 - corner.y * 0.5) * height;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

const readSnapshot = () => {
  const { scene, camera, gl, size } = state;
  if (!scene || !camera || !gl) return null;
  const perspective = camera as THREE.PerspectiveCamera;
  const controls = state.controls as { target?: THREE.Vector3; enableZoom?: boolean; enablePan?: boolean; enableRotate?: boolean; enabled?: boolean } | null;
  const canvas = gl.domElement;
  const reveal = findByName(scene, 'hero-reveal');
  const idle = findByName(scene, 'hero-idle');
  const normalize = findByName(scene, 'hero-normalize');
  const centerGroup = findByName(scene, 'hero-center');
  const modelRoot = findByName(scene, 'hero-model-root');

  return {
    mountId: state.mountId,
    canvas: {
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
      bufferWidth: canvas.width,
      bufferHeight: canvas.height,
      pixelRatio: gl.getPixelRatio(),
      framebufferPixels: canvas.width * canvas.height,
    },
    r3fSize: size,
    camera: {
      uuid: camera.uuid,
      type: camera.type,
      isPerspective: Boolean(perspective.isPerspectiveCamera),
      position: vec(camera.position),
      fov: perspective.fov,
      aspect: perspective.aspect,
      near: perspective.near,
      far: perspective.far,
      distanceToTarget: controls?.target ? camera.position.distanceTo(controls.target) : camera.position.length(),
    },
    controls: controls
      ? {
          target: controls.target ? vec(controls.target) : null,
          enabled: controls.enabled,
          enableZoom: controls.enableZoom,
          enablePan: controls.enablePan,
          enableRotate: controls.enableRotate,
        }
      : null,
    model: state.model,
    framing: state.framing,
    framingUpdates: state.framingUpdates,
    readyEvents: state.readyEvents,
    graph: {
      reveal: describe(reveal),
      idle: describe(idle),
      normalize: describe(normalize),
      center: describe(centerGroup),
      modelRoot: describe(modelRoot),
    },
    bounds: projectedBounds(reveal, camera, canvas.clientWidth, canvas.clientHeight),
    canonicalBounds: projectedCanonicalBounds(
      state.model,
      reveal ? reveal.scale.x : 1,
      camera,
      canvas.clientWidth,
      canvas.clientHeight,
    ),
  };
};

export const registerHeroDiagnostics = (next: {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gl: THREE.WebGLRenderer;
  size: { width: number; height: number };
  controls: unknown;
}) => {
  if (!HERO_DIAGNOSTICS_ENABLED) return;
  state.scene = next.scene;
  state.camera = next.camera;
  state.gl = next.gl;
  state.size = next.size;
  state.controls = next.controls;
  (window as unknown as { __heroDiag?: () => unknown }).__heroDiag = readSnapshot;
};

export const beginHeroDiagnosticsMount = () => {
  if (!HERO_DIAGNOSTICS_ENABLED) return;
  state.mountId += 1;
  state.model = null;
  state.framing = null;
  state.framingUpdates = 0;
  state.readyEvents = 0;
};
