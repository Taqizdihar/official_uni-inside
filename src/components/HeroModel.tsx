import React, { Suspense, useMemo, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import heroModelUrl from '../assets/hero/hero-model.glb';
import studioSoftHdr from '../assets/hdri/studio-soft.hdr';

// PART 2: Preload GLB asset early in lifecycle
useGLTF.preload(heroModelUrl);

/**
 * Shared context to coordinate interaction state between OrbitControls and IdleAnimation.
 */
interface IdleInteractionContextType {
  isInteractingRef: React.MutableRefObject<boolean>;
}
const IdleInteractionContext = createContext<IdleInteractionContextType | null>(null);

const IdleInteractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isInteractingRef = useRef<boolean>(false);
  return (
    <IdleInteractionContext.Provider value={{ isInteractingRef }}>
      {children}
    </IdleInteractionContext.Provider>
  );
};

/**
 * Modern Premium Lighting Component
 */
const HeroLights: React.FC = React.memo(() => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <hemisphereLight
        groundColor={new THREE.Color('#202121')}
        color={new THREE.Color('#ffffff')}
        intensity={0.4}
      />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <directionalLight position={[-5, -2, -5]} intensity={0.3} color="#f9d02d" />
      <Environment 
        files={studioSoftHdr} 
        background={false} 
        environmentIntensity={0.8}
        environmentRotation={[0, Math.PI / 4, 0]} 
      />
    </>
  );
});
HeroLights.displayName = 'HeroLights';

/**
 * Controlled Interaction via OrbitControls
 * Allows smooth 360° horizontal rotation with damping, limits vertical polar angles,
 * disables zoom & pan, and notifies IdleAnimation on start/end.
 */
const HeroControls: React.FC = React.memo(() => {
  const context = useContext(IdleInteractionContext);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStart = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (context) {
      context.isInteractingRef.current = true;
    }
  }, [context]);

  const handleEnd = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      if (context) {
        context.isInteractingRef.current = false;
      }
    }, 2500);
  }, [context]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  return (
    <OrbitControls
      makeDefault
      enableRotate={true}
      enableZoom={false}
      enablePan={false}
      enableDamping={true}
      dampingFactor={0.05}
      minPolarAngle={Math.PI / 2 - 0.35}
      maxPolarAngle={Math.PI / 2 + 0.15}
      onStart={handleStart}
      onEnd={handleEnd}
    />
  );
});
HeroControls.displayName = 'HeroControls';

/**
 * Subtle Idle Floating & Rotation Animation Component
 */
const IdleAnimation: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const groupRef = useRef<THREE.Group>(null);
  const context = useContext(IdleInteractionContext);
  const blendRef = useRef<number>(1);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const isInteracting = context?.isInteractingRef.current ?? false;

    const targetBlend = isInteracting ? 0 : 1;
    const lerpSpeed = isInteracting ? 10 : 2.5;
    blendRef.current = THREE.MathUtils.lerp(blendRef.current, targetBlend, delta * lerpSpeed);

    const blend = blendRef.current;
    const t = state.clock.getElapsedTime();

    groupRef.current.rotation.y += delta * 0.2 * blend;

    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      Math.sin(t * 1.2) * 0.08 * blend,
      delta * 5
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      Math.sin(t * 0.8) * 0.04 * blend,
      delta * 5
    );
  });

  return <group ref={groupRef}>{children}</group>;
});
IdleAnimation.displayName = 'IdleAnimation';

/**
 * Dedicated Camera Framing Lifecycle Component (ISSUE 1 Fix)
 * Synchronizes camera position, aspect, and projection matrix after layout or resize changes
 * without allowing scroll re-renders to override camera scale.
 */
const HeroCameraManager: React.FC<{ scaledRadius: number }> = React.memo(({ scaledRadius }) => {
  const { camera, size: canvasSize, invalidate } = useThree();

  useEffect(() => {
    const perspectiveCam = camera as THREE.PerspectiveCamera;
    if (!perspectiveCam || !perspectiveCam.isPerspectiveCamera) return;

    const fovRad = THREE.MathUtils.degToRad(perspectiveCam.fov || 45);
    const distVert = scaledRadius / Math.sin(fovRad / 2);
    const aspect = canvasSize.width / Math.max(1, canvasSize.height);
    const distHoriz = distVert / Math.min(1, aspect);
    const computedDistance = Math.max(distVert, distHoriz) * 0.95;

    perspectiveCam.position.set(0, 0, computedDistance);
    perspectiveCam.near = computedDistance / 100;
    perspectiveCam.far = computedDistance * 100;
    perspectiveCam.updateProjectionMatrix();
    invalidate();
  }, [camera, canvasSize.width, canvasSize.height, scaledRadius, invalidate]);

  return null;
});
HeroCameraManager.displayName = 'HeroCameraManager';

/**
 * Model-Independent Mesh Loader
 * Computes bounding box, origin centering, and normalization strictly once when loaded.
 */
const HeroModelMesh: React.FC = React.memo(() => {
  const { scene } = useGLTF(heroModelUrl);

  // Compute center, scale, and bounding sphere radius strictly once per loaded scene
  const { center, normalizedScale, scaledRadius } = useMemo(() => {
    scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const boxCenter = box.getCenter(new THREE.Vector3());
    const boundingSphere = box.getBoundingSphere(new THREE.Sphere());

    const TARGET_SIZE = 5.4;
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? TARGET_SIZE / maxDim : 1;
    const radius = (boundingSphere.radius || maxDim * 0.5 || 1.4) * scale;

    return { center: boxCenter, normalizedScale: scale, scaledRadius: radius };
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }, [scene]);

  return (
    <>
      <HeroCameraManager scaledRadius={scaledRadius} />
      <group scale={normalizedScale}>
        <primitive object={scene} position={[-center.x, -center.y, -center.z]} dispose={null} />
      </group>
    </>
  );
});
HeroModelMesh.displayName = 'HeroModelMesh';

/**
 * Dedicated HeroModel Component
 */
export const HeroModel: React.FC = React.memo(() => {
  return (
    <div className="relative w-[210%] sm:w-[250%] lg:w-[275%] h-[690px] sm:h-[870px] lg:h-[1080px] -ml-[55%] sm:-ml-[75%] lg:-ml-[87.5%] flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        className="w-full h-full"
      >
        <PerspectiveCamera makeDefault fov={45} />
        <IdleInteractionProvider>
          <HeroControls />
          <Suspense fallback={null}>
            <HeroLights />
            <IdleAnimation>
              <HeroModelMesh />
            </IdleAnimation>
          </Suspense>
        </IdleInteractionProvider>
      </Canvas>
    </div>
  );
});
HeroModel.displayName = 'HeroModel';

export default HeroModel;
