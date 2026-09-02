import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import heroModelUrl from '../assets/hero/hero-model.glb';
import studioSoftHdr from '../assets/hdri/studio-soft.hdr';
import { HeroModelFrame } from './HeroModelFrame';
import { useElementVisibility } from '../hooks/useElementVisibility';

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
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { isActive, isInteractingRef } = useSceneLifecycle();
  const clearInteraction = useCallback(() => { isInteractingRef.current = false; }, [isInteractingRef]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || isActive) return;

    clearInteraction();
    // Public OrbitControls API: clear residual damping before the canvas pauses.
    const wasDampingEnabled = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = wasDampingEnabled;
  }, [clearInteraction, isActive]);

  useEffect(() => {
    const clear = () => clearInteraction();
    window.addEventListener('pointerup', clear, { passive: true });
    window.addEventListener('pointercancel', clear, { passive: true });
    window.addEventListener('lostpointercapture', clear, { passive: true });
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
      window.removeEventListener('lostpointercapture', clear);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
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

  return <group ref={groupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>{children}</group>;
});
IdleAnimation.displayName = 'IdleAnimation';

/** Sets canonical framing once per Canvas mount; resizes only refresh projection. */
const HeroCameraManager: React.FC<{ scaledRadius: number }> = React.memo(({ scaledRadius }) => {
  const { camera, size, invalidate } = useThree();
  const hasFramedRef = useRef(false);

  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    if (!perspectiveCamera.isPerspectiveCamera || size.width <= 0 || size.height <= 0) return;

    if (!hasFramedRef.current) {
      const fovRadians = THREE.MathUtils.degToRad(perspectiveCamera.fov || 45);
      const verticalDistance = scaledRadius / Math.sin(fovRadians / 2);
      const horizontalDistance = verticalDistance / Math.min(1, size.width / size.height);
      const distance = Math.max(verticalDistance, horizontalDistance) * 0.95;
      perspectiveCamera.position.set(0, 0, distance);
      perspectiveCamera.near = distance / 100;
      perspectiveCamera.far = distance * 100;
      hasFramedRef.current = true;
    }

    perspectiveCamera.aspect = size.width / size.height;
    perspectiveCamera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, scaledRadius, size.height, size.width]);

  return null;
});
HeroCameraManager.displayName = 'HeroCameraManager';

const ResumeInvalidator: React.FC = () => {
  const { invalidate, size } = useThree();
  const { isActive } = useSceneLifecycle();

  useEffect(() => {
    if (!isActive || size.width <= 0 || size.height <= 0) return;
    const frame = window.requestAnimationFrame(() => invalidate());
    return () => window.cancelAnimationFrame(frame);
  }, [invalidate, isActive, size.height, size.width]);

  return null;
};

/** Cached GLTF data is cloned once per Hero mount below fresh transform wrappers. */
const HeroModelMesh: React.FC = React.memo(() => {
  const { scene } = useGLTF(heroModelUrl);
  const model = useMemo(() => clone(scene), [scene]);
  const { center, normalizedScale, scaledRadius } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const maxDimension = Math.max(size.x, size.y, size.z);
    const normalizedScale = maxDimension > 0 ? 5.4 / maxDimension : 1;
    return { center, normalizedScale, scaledRadius: (sphere.radius || maxDimension * 0.5 || 1.4) * normalizedScale };
  }, [model]);

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
      <group position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
        <group scale={normalizedScale}>
          <primitive object={model} position={[-center.x, -center.y, -center.z]} dispose={null} />
        </group>
      </group>
    </>
  );
});
HeroModelMesh.displayName = 'HeroModelMesh';

const HeroRevealGroup: React.FC<{ isReady: boolean; children: React.ReactNode }> = React.memo(({ isReady, children }) => {
  const groupRef = useRef<THREE.Group>(null);
  const hasFinishedRef = useRef(false);
  const { consumeDelta } = useSceneLifecycle();
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || hasFinishedRef.current) return;
    if (!isReady) {
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

  return <group ref={groupRef} scale={[INITIAL_REVEAL_SCALE, INITIAL_REVEAL_SCALE, INITIAL_REVEAL_SCALE]}>{children}</group>;
});
HeroRevealGroup.displayName = 'HeroRevealGroup';

const HeroSceneReady: React.FC<{ onReady?: () => void }> = React.memo(({ onReady }) => {
  const reportedRef = useRef(false);
  useFrame(() => {
    if (!reportedRef.current) {
      reportedRef.current = true;
      onReady?.();
    }
  });
  return null;
});

interface HeroModelProps {
  isReady: boolean;
  onReady?: () => void;
}

export const HeroModel: React.FC<HeroModelProps> = React.memo(({ isReady, onReady }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const { isVisible, isPageVisible } = useElementVisibility(frameRef, '300px 0px');
  const isRendering = isVisible && isPageVisible;

  return (
    <HeroModelFrame ref={frameRef}>
      <Canvas gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} dpr={[1, 1.5]} frameloop={isRendering ? 'always' : 'never'} className="h-full w-full">
        <PerspectiveCamera makeDefault fov={45} />
        <SceneLifecycleProvider isActive={isRendering}>
          <ResumeInvalidator />
          <HeroControls />
          <Suspense fallback={null}>
            <HeroLights />
            <HeroRevealGroup isReady={isReady}><IdleAnimation><HeroModelMesh /></IdleAnimation></HeroRevealGroup>
            <HeroSceneReady onReady={onReady} />
          </Suspense>
        </SceneLifecycleProvider>
      </Canvas>
    </HeroModelFrame>
  );
});
HeroModel.displayName = 'HeroModel';

export default HeroModel;
