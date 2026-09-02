import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import heroModelUrl from '../assets/hero/hero-model.glb';
import studioSoftHdr from '../assets/hdri/studio-soft.hdr';
import { HeroModelFrame } from './HeroModelFrame';
import { useElementVisibility } from '../hooks/useElementVisibility';
import { subscribeToPageVisibility } from '../hooks/usePageVisibility';
import { computeHeroCameraFraming, heroCameraFramingSignature } from './heroCameraFraming';
import { computeHeroModelNormalization } from './heroModelNormalization';
import {
  HERO_DIAGNOSTICS_ENABLED,
  beginHeroDiagnosticsMount,
  recordHeroFraming,
  recordHeroModelMetrics,
  recordHeroReady,
  registerHeroDiagnostics,
} from './heroDiagnostics';

const MAX_FRAME_DELTA = 1 / 30;
const INITIAL_REVEAL_SCALE = 0.82;

interface SceneLifecycle {
  isActive: boolean;
  consumeDelta: (delta: number) => number;
  isInteractingRef: React.MutableRefObject<boolean>;
}

const SceneLifecycleContext = createContext<SceneLifecycle | null>(null);

const SceneLifecycleProvider: React.FC<{ isActive: boolean; children: React.ReactNode }> = ({ isActive, children }) => {
  const skipNextFrameRef = useRef(true);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      // The next rendered frame must never apply elapsed offscreen time.
      skipNextFrameRef.current = true;
      isInteractingRef.current = false;
    }
  }, [isActive]);

  const consumeDelta = useCallback((delta: number) => {
    if (!isActive || skipNextFrameRef.current) {
      skipNextFrameRef.current = false;
      return 0;
    }
    return Math.min(Math.max(delta, 0), MAX_FRAME_DELTA);
  }, [isActive]);

  return (
    <SceneLifecycleContext.Provider value={{ isActive, consumeDelta, isInteractingRef }}>
      {children}
    </SceneLifecycleContext.Provider>
  );
};

const useSceneLifecycle = () => {
  const lifecycle = useContext(SceneLifecycleContext);
  if (!lifecycle) throw new Error('Hero scene components must be rendered inside SceneLifecycleProvider.');
  return lifecycle;
};

/**
 * Single coordination point for the ordered hand-off:
 * stable canvas measurement -> model bounds -> camera framing -> controls target
 * -> first valid render -> loader hand-off -> reveal.
 */
interface HeroSceneCoordination {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  isFramed: boolean;
  markFramed: () => void;
}

const HeroSceneCoordinationContext = createContext<HeroSceneCoordination | null>(null);

const HeroSceneCoordinationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [isFramed, setIsFramed] = useState(false);
  const markFramed = useCallback(() => setIsFramed(true), []);
  const value = useMemo(() => ({ controlsRef, isFramed, markFramed }), [isFramed, markFramed]);

  return <HeroSceneCoordinationContext.Provider value={value}>{children}</HeroSceneCoordinationContext.Provider>;
};

const useHeroSceneCoordination = () => {
  const coordination = useContext(HeroSceneCoordinationContext);
  if (!coordination) throw new Error('Hero scene components must be rendered inside HeroSceneCoordinationProvider.');
  return coordination;
};

const HeroLights: React.FC = React.memo(() => (
  <>
    <ambientLight intensity={0.4} />
    <hemisphereLight groundColor="#202121" color="#ffffff" intensity={0.4} />
    <directionalLight position={[5, 8, 5]} intensity={0.8} />
    <directionalLight position={[-5, -2, -5]} intensity={0.3} color="#f9d02d" />
    <Environment files={studioSoftHdr} background={false} environmentIntensity={0.8} environmentRotation={[0, Math.PI / 4, 0]} />
  </>
));
HeroLights.displayName = 'HeroLights';

/** OrbitControls owns camera interaction only; model groups never receive pointer translation. */
const HeroControls: React.FC = React.memo(() => {
  const { controlsRef, isFramed } = useHeroSceneCoordination();
  const { isActive, isInteractingRef } = useSceneLifecycle();
  const clearInteraction = useCallback(() => { isInteractingRef.current = false; }, [isInteractingRef]);

  useEffect(() => {
    const controls = controlsRef.current;
    // Never drive the controls while the camera is still unframed at the origin.
    if (!controls || isActive || !isFramed) return;

    clearInteraction();
    // Public OrbitControls API: clear residual damping before the canvas pauses.
    const wasDampingEnabled = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = wasDampingEnabled;
  }, [clearInteraction, controlsRef, isActive, isFramed]);

  useEffect(() => {
    const clear = () => clearInteraction();
    window.addEventListener('pointerup', clear, { passive: true });
    window.addEventListener('pointercancel', clear, { passive: true });
    window.addEventListener('lostpointercapture', clear, { passive: true });
    window.addEventListener('blur', clear);
    const unsubscribe = subscribeToPageVisibility(clear);
    return () => {
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
      window.removeEventListener('lostpointercapture', clear);
      window.removeEventListener('blur', clear);
      unsubscribe();
      clear();
    };
  }, [clearInteraction]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={isActive}
      enableRotate
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.05}
      minPolarAngle={Math.PI / 2 - 0.35}
      maxPolarAngle={Math.PI / 2 + 0.15}
      onStart={() => { isInteractingRef.current = true; }}
      onEnd={clearInteraction}
    />
  );
});
HeroControls.displayName = 'HeroControls';

/** The only runtime writer for the rotation/float group. */
const IdleAnimation: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const blendRef = useRef(1);
  const { consumeDelta, isInteractingRef } = useSceneLifecycle();

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const safeDelta = consumeDelta(delta);
    if (safeDelta === 0) return;

    elapsedRef.current += safeDelta;
    const isInteracting = isInteractingRef.current;
    blendRef.current = THREE.MathUtils.lerp(blendRef.current, isInteracting ? 0 : 1, safeDelta * (isInteracting ? 10 : 2.5));
    const blend = blendRef.current;
    group.rotation.y += safeDelta * 0.2 * blend;
    group.position.y = THREE.MathUtils.lerp(group.position.y, Math.sin(elapsedRef.current * 1.2) * 0.08 * blend, safeDelta * 5);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, Math.sin(elapsedRef.current * 0.8) * 0.04 * blend, safeDelta * 5);
  });

  return <group ref={groupRef} name="hero-idle" position={[0, 0, 0]} rotation={[0, 0, 0]}>{children}</group>;
});
IdleAnimation.displayName = 'IdleAnimation';

/**
 * Reports the canvas size only once the same rounded rectangle has survived two
 * consecutive animation frames, so framing never latches onto a transitional
 * layout measurement taken during a route remount.
 */
const useStableCanvasSize = () => {
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const [stableSize, setStableSize] = useState<{ width: number; height: number } | null>(null);
  const [revalidateToken, setRevalidateToken] = useState(0);
  const latestSizeRef = useRef(size);
  latestSizeRef.current = size;

  useEffect(() => {
    const width = Math.round(size.width);
    const height = Math.round(size.height);
    if (width <= 0 || height <= 0) return;

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const latest = latestSizeRef.current;
        if (Math.round(latest.width) !== width || Math.round(latest.height) !== height) return;
        setStableSize((previous) =>
          previous && Math.round(previous.width) === width && Math.round(previous.height) === height
            ? previous
            : { width: latest.width, height: latest.height },
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [revalidateToken, size]);

  useEffect(() => {
    const element = gl.domElement;
    const revalidate = () => {
      setRevalidateToken((token) => token + 1);
      invalidate();
    };
    const observer = new ResizeObserver(revalidate);
    observer.observe(element);
    // Back/Forward Cache restores and orientation changes need one re-measure.
    window.addEventListener('pageshow', revalidate);
    window.addEventListener('orientationchange', revalidate);
    return () => {
      observer.disconnect();
      window.removeEventListener('pageshow', revalidate);
      window.removeEventListener('orientationchange', revalidate);
    };
  }, [gl, invalidate]);

  return stableSize;
};

/**
 * Deterministic camera framing.
 *
 * Framing is keyed on the actual camera instance plus the stable layout, so the
 * throw-away fallback camera React Three Fiber creates before the drei
 * `makeDefault` swap can never latch the composition for the camera that
 * really renders.
 */
const HeroCameraManager: React.FC<{ scaledRadius: number }> = React.memo(({ scaledRadius }) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const { controlsRef, markFramed } = useHeroSceneCoordination();
  const stableSize = useStableCanvasSize();
  const framedCameraRef = useRef<string | null>(null);
  const framingSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (!stableSize) return;

    const input = { width: stableSize.width, height: stableSize.height, fov: camera.fov, scaledRadius };
    const framing = computeHeroCameraFraming(input);
    if (!framing) return;

    const signature = heroCameraFramingSignature(camera.uuid, input);
    const isCanonical = framedCameraRef.current !== camera.uuid;
    if (!isCanonical && framingSignatureRef.current === signature) {
      markFramed();
      return;
    }

    const controls = controlsRef.current;

    if (isCanonical) {
      // A fresh route mount always starts from the canonical orientation.
      camera.up.set(0, 1, 0);
      camera.position.set(0, 0, framing.distance);
      camera.lookAt(0, 0, 0);
    } else {
      // A true resize keeps the direction the visitor swiped to.
      const currentTarget = controls ? controls.target : new THREE.Vector3();
      const direction = camera.position.clone().sub(currentTarget);
      if (!(direction.lengthSq() > 1e-8)) direction.set(0, 0, 1);
      direction.normalize().multiplyScalar(framing.distance);
      camera.position.copy(currentTarget).add(direction);
    }

    camera.aspect = framing.aspect;
    camera.near = framing.near;
    camera.far = framing.far;
    camera.updateProjectionMatrix();

    if (controls) {
      if (isCanonical) controls.target.set(0, 0, 0);
      controls.update();
      if (isCanonical) controls.saveState();
    }

    framedCameraRef.current = camera.uuid;
    framingSignatureRef.current = signature;

    recordHeroFraming({
      width: stableSize.width,
      height: stableSize.height,
      fov: camera.fov,
      aspect: framing.aspect,
      distance: framing.distance,
      near: framing.near,
      far: framing.far,
      cameraUuid: camera.uuid,
      isCanonical,
    });

    if (import.meta.env.DEV) {
      const target = controls ? controls.target : new THREE.Vector3();
      const distanceToTarget = camera.position.distanceTo(target);
      if (!(framing.aspect > 0) || !Number.isFinite(framing.aspect)) console.error('[HeroModel] Canvas aspect is not finite and positive.', framing);
      if (!(framing.distance > 0) || !Number.isFinite(framing.distance)) console.error('[HeroModel] Camera distance is not finite and positive.', framing);
      if (!(scaledRadius > 0)) console.error('[HeroModel] scaledRadius must be positive.', scaledRadius);
      if (!(distanceToTarget > 0)) console.error('[HeroModel] Camera and controls target resolved to the same point.');
      if (camera.position.lengthSq() === 0) console.error('[HeroModel] Camera resolved to the world origin.');
    }

    markFramed();
    invalidate();
  }, [camera, controlsRef, invalidate, markFramed, scaledRadius, stableSize]);

  return null;
});
HeroCameraManager.displayName = 'HeroCameraManager';

const ResumeInvalidator: React.FC = () => {
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const { isActive } = useSceneLifecycle();

  useEffect(() => {
    if (!isActive || size.width <= 0 || size.height <= 0) return;
    const frame = window.requestAnimationFrame(() => invalidate());
    return () => window.cancelAnimationFrame(frame);
  }, [invalidate, isActive, size.height, size.width]);

  return null;
};

const HeroDiagnosticsProbe: React.FC = () => {
  const { scene, camera, gl, size, controls } = useThree();
  useEffect(() => {
    registerHeroDiagnostics({ scene, camera, gl, size, controls });
  });
  return null;
};

/** Cached GLTF data is cloned once per Hero mount below fresh transform wrappers. */
const HeroModelMesh: React.FC = React.memo(() => {
  const { scene } = useGLTF(heroModelUrl);
  const model = useMemo(() => clone(scene), [scene]);
  const normalization = useMemo(() => {
    const result = computeHeroModelNormalization(model);

    if (import.meta.env.DEV) {
      if (!result.isValid) console.error('[HeroModel] The GLB reported unusable bounds; the canonical fallback is in use.');
      if (!(result.normalizedScale > 0)) console.error('[HeroModel] normalizedScale must be positive.', result.normalizedScale);
      if (!(result.scaledRadius > 0)) console.error('[HeroModel] scaledRadius must be positive.', result.scaledRadius);
    }

    recordHeroModelMetrics({
      boxSize: [result.boxSize.x, result.boxSize.y, result.boxSize.z],
      center: [result.center.x, result.center.y, result.center.z],
      sphereRadius: result.sphereRadius,
      normalizedScale: result.normalizedScale,
      scaledRadius: result.scaledRadius,
      isValid: result.isValid,
      rootPosition: [model.position.x, model.position.y, model.position.z],
      preciseBoxSize: HERO_DIAGNOSTICS_ENABLED
        ? (() => {
            const preciseSize = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3());
            return [preciseSize.x, preciseSize.y, preciseSize.z] as [number, number, number];
          })()
        : null,
    });

    return result;
  }, [model]);

  const { center, normalizedScale, scaledRadius } = normalization;

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }, [model]);

  return (
    <>
      <HeroCameraManager scaledRadius={scaledRadius} />
      <group name="hero-anchor" position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
        <group name="hero-normalize" scale={normalizedScale}>
          <group name="hero-center" position={[-center.x, -center.y, -center.z]}>
            <primitive name="hero-model-root" object={model} dispose={null} />
          </group>
        </group>
      </group>
    </>
  );
});
HeroModelMesh.displayName = 'HeroModelMesh';

/** Sole owner of the reveal scale; it is never multiplied into the normalization scale. */
const HeroRevealGroup: React.FC<{ isReady: boolean; children: React.ReactNode }> = React.memo(({ isReady, children }) => {
  const groupRef = useRef<THREE.Group>(null);
  const hasFinishedRef = useRef(false);
  const { consumeDelta } = useSceneLifecycle();
  const { isFramed } = useHeroSceneCoordination();
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || hasFinishedRef.current) return;
    if (!isReady || !isFramed) {
      group.scale.setScalar(INITIAL_REVEAL_SCALE);
      return;
    }
    if (prefersReducedMotion) {
      group.scale.setScalar(1);
      hasFinishedRef.current = true;
      return;
    }
    const safeDelta = consumeDelta(delta);
    if (safeDelta === 0) return;
    const nextScale = THREE.MathUtils.damp(group.scale.x, 1, 7.5, safeDelta);
    if (Math.abs(1 - nextScale) < 0.002) {
      group.scale.setScalar(1);
      hasFinishedRef.current = true;
    } else {
      group.scale.setScalar(nextScale);
    }
  });

  return <group ref={groupRef} name="hero-reveal" scale={[INITIAL_REVEAL_SCALE, INITIAL_REVEAL_SCALE, INITIAL_REVEAL_SCALE]}>{children}</group>;
});
HeroRevealGroup.displayName = 'HeroRevealGroup';

/** Hands the loader off only once a correctly framed scene can render. */
const HeroSceneReady: React.FC<{ onReady?: () => void }> = React.memo(({ onReady }) => {
  const { isFramed } = useHeroSceneCoordination();
  const reportedRef = useRef(false);

  useFrame(() => {
    if (reportedRef.current || !isFramed) return;
    reportedRef.current = true;
    recordHeroReady();
    onReady?.();
  });

  return null;
});
HeroSceneReady.displayName = 'HeroSceneReady';

interface HeroModelProps {
  isReady: boolean;
  onReady?: () => void;
}

export const HeroModel: React.FC<HeroModelProps> = React.memo(({ isReady, onReady }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const { isVisible, isPageVisible } = useElementVisibility(frameRef, '300px 0px');
  const isRendering = isVisible && isPageVisible;

  useEffect(() => { beginHeroDiagnosticsMount(); }, []);

  return (
    <HeroModelFrame ref={frameRef}>
      {/*
        `offsetSize` measures the untransformed layout box. Without it the
        Hero entrance animation (a scale on a Canvas ancestor) leaks into
        `getBoundingClientRect`, so a warm remount sizes the drawing buffer and
        the framing from a transient, scaled-down rectangle.
      */}
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        frameloop={isRendering ? 'always' : 'never'}
        resize={{ offsetSize: true }}
        className="h-full w-full"
      >
        <PerspectiveCamera makeDefault fov={45} />
        <SceneLifecycleProvider isActive={isRendering}>
          <HeroSceneCoordinationProvider>
            {HERO_DIAGNOSTICS_ENABLED ? <HeroDiagnosticsProbe /> : null}
            <ResumeInvalidator />
            <HeroControls />
            <Suspense fallback={null}>
              <HeroLights />
              <HeroRevealGroup isReady={isReady}><IdleAnimation><HeroModelMesh /></IdleAnimation></HeroRevealGroup>
              <HeroSceneReady onReady={onReady} />
            </Suspense>
          </HeroSceneCoordinationProvider>
        </SceneLifecycleProvider>
      </Canvas>
    </HeroModelFrame>
  );
});
HeroModel.displayName = 'HeroModel';

export default HeroModel;
