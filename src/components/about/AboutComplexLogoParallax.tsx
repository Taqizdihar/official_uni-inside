import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import styles from './AboutComplexLogoParallax.module.css';

import composite from '../../assets/about-us/complex-logo/complex-logo-composite.avif';
import broadcastArcs from '../../assets/about-us/complex-logo/layers/layer-01-broadcast-arcs.avif';
import uniSymbol from '../../assets/about-us/complex-logo/layers/layer-02-uni-symbol.avif';
import insideBadge from '../../assets/about-us/complex-logo/layers/layer-03-inside-badge.avif';
import drone from '../../assets/about-us/complex-logo/layers/layer-04-drone.avif';
import seatedCreator from '../../assets/about-us/complex-logo/layers/layer-05-seated-creator.avif';
import megaphoneHand from '../../assets/about-us/complex-logo/layers/layer-06-megaphone-hand.avif';
import selfieStick from '../../assets/about-us/complex-logo/layers/layer-07-selfie-stick.avif';
import headset from '../../assets/about-us/complex-logo/layers/layer-08-headset.avif';
import tabletMain from '../../assets/about-us/complex-logo/layers/layer-09-tablet-main.avif';
import tabletArmExtension from '../../assets/about-us/complex-logo/layers/layer-10-tablet-arm-extension.avif';
import printer from '../../assets/about-us/complex-logo/layers/layer-11-3d-printer.avif';
import videoCameraOperator from '../../assets/about-us/complex-logo/layers/layer-12-video-camera-operator.avif';
import clapperboard from '../../assets/about-us/complex-logo/layers/layer-13-clapperboard.avif';
import photoCameraArm from '../../assets/about-us/complex-logo/layers/layer-14-photo-camera-arm-full.avif';
import photoCameraForeground from '../../assets/about-us/complex-logo/layers/layer-15-photo-camera-foreground-crop.avif';
import vintageMicrophone from '../../assets/about-us/complex-logo/layers/layer-16-vintage-microphone.avif';

type MotionGroup = 'far' | 'core' | 'middle' | 'foreground' | 'tablet' | 'camera';

type ComplexLogoLayer = {
  id: string;
  src: string;
  zIndex: number;
  depth: number;
  motionGroup: MotionGroup;
};

/**
 * Back-to-front order reconstructed against complex-logo-composite.avif.
 * Camera arm 14 and crop 15 share one motion group, with the camera operator
 * and badge intentionally stacked between them. Tablet pieces 09 and 10 also
 * share one motion group, with the Uni symbol between their z positions.
 */
const COMPLEX_LOGO_LAYERS: ComplexLogoLayer[] = [
  { id: 'drone', src: drone, zIndex: 1, depth: -0.4, motionGroup: 'far' },
  { id: 'broadcast-arcs', src: broadcastArcs, zIndex: 2, depth: 0.2, motionGroup: 'core' },
  { id: 'selfie-stick', src: selfieStick, zIndex: 3, depth: 0.45, motionGroup: 'middle' },
  { id: 'tablet-arm-extension', src: tabletArmExtension, zIndex: 4, depth: 0.75, motionGroup: 'tablet' },
  { id: 'photo-camera-arm-full', src: photoCameraArm, zIndex: 5, depth: 0.95, motionGroup: 'camera' },
  { id: 'vintage-microphone', src: vintageMicrophone, zIndex: 6, depth: 0.45, motionGroup: 'middle' },
  { id: 'megaphone-hand', src: megaphoneHand, zIndex: 7, depth: 0.45, motionGroup: 'middle' },
  { id: 'uni-symbol', src: uniSymbol, zIndex: 8, depth: 0.2, motionGroup: 'core' },
  { id: 'seated-creator', src: seatedCreator, zIndex: 9, depth: 0.65, motionGroup: 'foreground' },
  { id: 'headset', src: headset, zIndex: 10, depth: 0.65, motionGroup: 'foreground' },
  { id: 'tablet-main', src: tabletMain, zIndex: 11, depth: 0.75, motionGroup: 'tablet' },
  { id: '3d-printer', src: printer, zIndex: 12, depth: 0.8, motionGroup: 'foreground' },
  { id: 'video-camera-operator', src: videoCameraOperator, zIndex: 13, depth: 0.8, motionGroup: 'foreground' },
  { id: 'clapperboard', src: clapperboard, zIndex: 14, depth: 0.8, motionGroup: 'foreground' },
  { id: 'inside-badge', src: insideBadge, zIndex: 15, depth: 0.2, motionGroup: 'core' },
  { id: 'photo-camera-foreground-crop', src: photoCameraForeground, zIndex: 16, depth: 0.95, motionGroup: 'camera' },
];

type AboutComplexLogoParallaxProps = {
  active: boolean;
  interactive?: boolean;
};

const StaticComplexLogo: React.FC = () => (
  <div className={styles.frame} role="img" aria-label="Uni-Inside Studio complex logo">
    <img
      className={`${styles.image} ${styles.fallback}`}
      src={composite}
      alt=""
      aria-hidden="true"
      width={1080}
      height={1080}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  </div>
);

const useDepthMotion = (x: MotionValue<number>, y: MotionValue<number>, depth: number) => ({
  x: useTransform(x, [-1, 1], [-depth * 12, depth * 12]),
  y: useTransform(y, [-1, 1], [-depth * 8, depth * 8]),
});

const InteractiveComplexLogo: React.FC<{ active: boolean }> = ({ active }) => {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 170, damping: 26, mass: 0.35 });
  const springY = useSpring(pointerY, { stiffness: 170, damping: 26, mass: 0.35 });
  const groupDepth = (group: MotionGroup) => COMPLEX_LOGO_LAYERS.find((layer) => layer.motionGroup === group)?.depth ?? 0;
  const far = useDepthMotion(springX, springY, groupDepth('far'));
  const core = useDepthMotion(springX, springY, groupDepth('core'));
  const middle = useDepthMotion(springX, springY, groupDepth('middle'));
  const foreground = useDepthMotion(springX, springY, groupDepth('foreground'));
  const sharedMotion: Record<MotionGroup, ReturnType<typeof useDepthMotion>> = {
    far,
    core,
    middle,
    foreground,
    tablet: useDepthMotion(springX, springY, groupDepth('tablet')),
    camera: useDepthMotion(springX, springY, groupDepth('camera')),
  };

  const [layerState, setLayerState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [pointerInside, setPointerInside] = useState(false);
  const loadStarted = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active || loadStarted.current) return;
    loadStarted.current = true;
    setLayerState('loading');

    const decodedLayers = COMPLEX_LOGO_LAYERS.map((layer) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';
      image.onload = () => {
        void image.decode().then(() => resolve(), reject);
      };
      image.onerror = () => reject(new Error(`Unable to load complex logo layer: ${layer.id}`));
      image.src = layer.src;
    }));

    void Promise.all(decodedLayers).then(() => {
      if (mounted.current) setLayerState('ready');
    }).catch(() => {
      if (mounted.current) setLayerState('failed');
    });
  }, [active]);

  useEffect(() => {
    if (active) return;
    pointerX.set(0);
    pointerY.set(0);
    setPointerInside(false);
  }, [active, pointerX, pointerY]);

  const canInteract = active && layerState === 'ready';
  const showLayers = layerState !== 'failed' && (active || layerState === 'ready');
  const setNeutral = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
    setPointerInside(false);
  }, [pointerX, pointerY]);
  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canInteract || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const normalize = (position: number, start: number, length: number) =>
      Math.max(-1, Math.min(1, ((position - start) / Math.max(length, 1) - 0.5) * 2));
    pointerX.set(normalize(event.clientX, bounds.left, bounds.width));
    pointerY.set(normalize(event.clientY, bounds.top, bounds.height));
  }, [canInteract, pointerX, pointerY]);

  return (
    <div
      className={styles.frame}
      role="img"
      aria-label="Uni-Inside Studio complex logo"
      data-parallax-active={canInteract ? 'true' : 'false'}
      onPointerEnter={canInteract ? () => setPointerInside(true) : undefined}
      onPointerMove={canInteract ? handlePointerMove : undefined}
      onPointerLeave={canInteract ? setNeutral : undefined}
      onPointerCancel={canInteract ? setNeutral : undefined}
    >
      <motion.img
        className={`${styles.image} ${styles.fallback}`}
        src={composite}
        alt=""
        aria-hidden="true"
        width={1080}
        height={1080}
        loading="lazy"
        decoding="async"
        draggable={false}
        initial={false}
        animate={{ opacity: layerState === 'ready' ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      {showLayers && (
        <motion.div
          className={styles.layerStack}
          aria-hidden="true"
          initial={false}
          animate={{ opacity: layerState === 'ready' ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ pointerEvents: 'none' }}
        >
          {COMPLEX_LOGO_LAYERS.map((layer) => {
            const movement = sharedMotion[layer.motionGroup];
            return (
              <motion.img
                key={layer.id}
                data-complex-logo-layer={layer.id}
                className={styles.layer}
                src={layer.src}
                alt=""
                aria-hidden="true"
                width={1080}
                height={1080}
                loading="eager"
                decoding="async"
                draggable={false}
                onError={() => setLayerState('failed')}
                style={{
                  x: movement.x,
                  y: movement.y,
                  zIndex: layer.zIndex,
                  willChange: pointerInside ? 'transform' : 'auto',
                }}
                data-depth={layer.depth}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

const ParallaxCapabilityGate: React.FC<{ active: boolean }> = ({ active }) => {
  const [canUseParallax, setCanUseParallax] = useState(false);
  const [wasActivated, setWasActivated] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const capability = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const update = () => setCanUseParallax(capability.matches);
    update();
    capability.addEventListener('change', update);
    return () => capability.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (canUseParallax && active) setWasActivated(true);
  }, [active, canUseParallax]);

  if (!canUseParallax || !wasActivated) return <StaticComplexLogo />;
  return <InteractiveComplexLogo active={active} />;
};

export const AboutComplexLogoParallax: React.FC<AboutComplexLogoParallaxProps> = ({ active, interactive = true }) => {
  if (!interactive) return <StaticComplexLogo />;
  return <ParallaxCapabilityGate active={active} />;
};
