import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
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
  exploded: { x: number; y: number; rotate: number; scale: number };
};

/**
 * Back-to-front order reconstructed against complex-logo-composite.avif.
 * Camera arm 14 and crop 15 share one motion group, with the camera operator
 * and badge intentionally stacked between them. Tablet pieces 09 and 10 also
 * share one motion group, with the Uni symbol between their z positions.
 */
const COMPLEX_LOGO_LAYERS: ComplexLogoLayer[] = [
  { id: 'drone', src: drone, zIndex: 1, depth: -0.4, motionGroup: 'far', exploded: { x: 12, y: 3, rotate: 12, scale: 0.9 } },
  { id: 'broadcast-arcs', src: broadcastArcs, zIndex: 2, depth: 0.2, motionGroup: 'core', exploded: { x: -7, y: -8, rotate: -8, scale: 0.9 } },
  { id: 'selfie-stick', src: selfieStick, zIndex: 3, depth: 0.45, motionGroup: 'middle', exploded: { x: 9, y: -7, rotate: 14, scale: 0.9 } },
  { id: 'tablet-arm-extension', src: tabletArmExtension, zIndex: 4, depth: 0.75, motionGroup: 'tablet', exploded: { x: -10, y: 12, rotate: -11, scale: 0.9 } },
  { id: 'photo-camera-arm-full', src: photoCameraArm, zIndex: 5, depth: 0.95, motionGroup: 'camera', exploded: { x: -7, y: -7, rotate: 9, scale: 0.9 } },
  { id: 'vintage-microphone', src: vintageMicrophone, zIndex: 6, depth: 0.45, motionGroup: 'middle', exploded: { x: -5, y: 10, rotate: -13, scale: 0.9 } },
  { id: 'megaphone-hand', src: megaphoneHand, zIndex: 7, depth: 0.45, motionGroup: 'middle', exploded: { x: -12, y: -6, rotate: -15, scale: 0.9 } },
  { id: 'uni-symbol', src: uniSymbol, zIndex: 8, depth: 0.2, motionGroup: 'core', exploded: { x: -9, y: -6, rotate: -5, scale: 0.84 } },
  { id: 'seated-creator', src: seatedCreator, zIndex: 9, depth: 0.65, motionGroup: 'foreground', exploded: { x: 9, y: -1, rotate: 10, scale: 0.9 } },
  { id: 'headset', src: headset, zIndex: 10, depth: 0.65, motionGroup: 'foreground', exploded: { x: 15, y: 5, rotate: 15, scale: 0.9 } },
  { id: 'tablet-main', src: tabletMain, zIndex: 11, depth: 0.75, motionGroup: 'tablet', exploded: { x: -10, y: 12, rotate: -11, scale: 0.9 } },
  { id: '3d-printer', src: printer, zIndex: 12, depth: 0.8, motionGroup: 'foreground', exploded: { x: 13, y: 4, rotate: 13, scale: 0.9 } },
  { id: 'video-camera-operator', src: videoCameraOperator, zIndex: 13, depth: 0.8, motionGroup: 'foreground', exploded: { x: 4, y: -3, rotate: 8, scale: 0.9 } },
  { id: 'clapperboard', src: clapperboard, zIndex: 14, depth: 0.8, motionGroup: 'foreground', exploded: { x: -2, y: 6, rotate: -12, scale: 0.9 } },
  { id: 'inside-badge', src: insideBadge, zIndex: 15, depth: 0.2, motionGroup: 'core', exploded: { x: 5, y: -7, rotate: 5, scale: 0.84 } },
  { id: 'photo-camera-foreground-crop', src: photoCameraForeground, zIndex: 16, depth: 0.95, motionGroup: 'camera', exploded: { x: -7, y: -7, rotate: 9, scale: 0.9 } },
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

const InteractiveComplexLogo: React.FC<{ active: boolean; trackingAllowed: boolean }> = ({ active, trackingAllowed }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
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
  const [logoVisible, setLogoVisible] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const [windowFocused, setWindowFocused] = useState(() => typeof document === 'undefined' || typeof document.hasFocus !== 'function' || document.hasFocus());
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const loadStarted = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new IntersectionObserver(([entry]) => {
      setLogoVisible(entry.isIntersecting);
    }, { root: null, rootMargin: '0px', threshold: 0.01 });
    observer.observe(frame);
    return () => observer.disconnect();
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
    if (!logoVisible || !pageVisible || layerState !== 'ready') {
      setAssembled(false);
      return;
    }
    const timer = window.setTimeout(() => setAssembled(true), 1750);
    return () => window.clearTimeout(timer);
  }, [logoVisible, pageVisible, layerState]);

  useEffect(() => {
    if (!active || !logoVisible) return;

    const updatePageVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setPageVisible(visible);
      if (!visible) {
        lastPointer.current = null;
        pointerX.set(0);
        pointerY.set(0);
      }
    };
    const handleWindowFocus = () => {
      setWindowFocused(true);
      updatePageVisibility();
    };
    const handleWindowBlur = () => {
      setWindowFocused(false);
      lastPointer.current = null;
      pointerX.set(0);
      pointerY.set(0);
    };

    updatePageVisibility();
    setWindowFocused(typeof document.hasFocus !== 'function' || document.hasFocus());
    document.addEventListener('visibilitychange', updatePageVisibility);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', updatePageVisibility);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [active, logoVisible, pointerX, pointerY]);

  const trackingEnabled = active
    && trackingAllowed
    && assembled
    && layerState === 'ready'
    && logoVisible
    && pageVisible
    && windowFocused;
  const showLayers = layerState !== 'failed' && (active || layerState === 'ready');

  const resetToNeutral = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!trackingEnabled || !frame) {
      resetToNeutral();
      return;
    }

    let animationFrame = 0;
    const updatePointer = () => {
      animationFrame = 0;
      const position = lastPointer.current;
      if (!position) return;

      const bounds = frame.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const normalize = (position: number, center: number, viewportLength: number) => {
        const delta = position - center;
        const available = delta < 0 ? Math.max(1, Math.abs(center)) : Math.max(1, Math.abs(viewportLength - center));
        return Math.max(-1, Math.min(1, delta / available));
      };

      pointerX.set(normalize(position.x, centerX, window.innerWidth));
      pointerY.set(normalize(position.y, centerY, window.innerHeight));
    };
    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updatePointer);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      scheduleUpdate();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resetToNeutral();
    };
  }, [trackingEnabled, pointerX, pointerY, resetToNeutral]);

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      role="img"
      aria-label="Uni-Inside Studio complex logo"
      data-parallax-active={trackingEnabled ? 'true' : 'false'}
      data-logo-assembly={layerState === 'ready' ? assembled ? 'assembled' : 'exploded' : 'loading'}
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
          <motion.svg
            className={styles.blueprintGuide}
            viewBox="0 0 1080 1080"
            fill="none"
            animate={{ opacity: assembled ? 0 : 0.5 }}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
          >
            <path d="M 160 410 L 320 520 L 570 480 L 810 310 M 320 520 L 180 810 M 570 480 L 805 740 M 805 740 L 650 900" stroke="currentColor" strokeWidth="2" strokeDasharray="9 10" />
            <circle cx="320" cy="520" r="13" /><circle cx="570" cy="480" r="13" /><circle cx="805" cy="740" r="13" />
          </motion.svg>
          {COMPLEX_LOGO_LAYERS.map((layer) => {
            const movement = sharedMotion[layer.motionGroup];
            return (
              <motion.div
                key={layer.id}
                data-complex-logo-layer={layer.id}
                className={styles.layer}
                aria-hidden="true"
                animate={{
                  x: assembled ? '0%' : `${layer.exploded.x}%`,
                  y: assembled ? '0%' : `${layer.exploded.y}%`,
                  rotate: assembled ? 0 : layer.exploded.rotate,
                  scale: assembled ? 1 : layer.exploded.scale,
                  filter: assembled ? 'grayscale(0) contrast(1) brightness(1)' : 'grayscale(1) contrast(1.4) brightness(1.13)',
                }}
                transition={{ duration: assembled && !reducedMotion ? 1.25 : 0, ease: [0.2, 0.8, 0.2, 1] }}
                style={{
                  zIndex: layer.zIndex,
                }}
                data-depth={layer.depth}
              >
                <motion.img
                  className={styles.layer}
                  src={layer.src}
                  alt=""
                  width={1080}
                  height={1080}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  onError={() => setLayerState('failed')}
                  style={{ x: movement.x, y: movement.y, willChange: trackingEnabled ? 'transform' : 'auto' }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

const ParallaxCapabilityGate: React.FC<{ active: boolean }> = ({ active }) => {
  const [canUseParallax, setCanUseParallax] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const capability = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const update = () => setCanUseParallax(capability.matches);
    update();
    capability.addEventListener('change', update);
    return () => capability.removeEventListener('change', update);
  }, []);

  return <InteractiveComplexLogo active={active} trackingAllowed={canUseParallax} />;
};

export const AboutComplexLogoParallax: React.FC<AboutComplexLogoParallaxProps> = ({ active, interactive = true }) => {
  if (!interactive) return <StaticComplexLogo />;
  return <ParallaxCapabilityGate active={active} />;
};
