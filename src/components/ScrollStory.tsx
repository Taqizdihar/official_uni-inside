import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { OurProductsSection } from './ProductsSection';
import { ServicesCarousel } from './ServicesCarousel';
import { EventsSection } from './EventsSection';
import printerGif from '../assets/our-products/GIF Printer Transparent.gif';
import { ShoppingCart } from 'lucide-react';
import coinSoundUrl from '../assets/audio/our-products/Coin Sound.mp3';

const PRODUCT_ASSET_MODULES = import.meta.glob('../assets/our-products/3D Printer Products/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const PRODUCT_ASSETS = Object.values(PRODUCT_ASSET_MODULES);

gsap.registerPlugin(ScrollTrigger);

export interface ScrollStoryHandle {
  scrollToScene: (scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS') => void;
}

export interface ScrollStoryProps {
  productsRef?: React.RefObject<HTMLDivElement>;
  servicesRef?: React.RefObject<HTMLDivElement>;
  eventsRef?: React.RefObject<HTMLDivElement>;
  /**
   * Called on ENTER with the target scene id, on EXIT with null.
   * Also called on every scene-boundary crossing inside the story.
   * The caller is responsible for suppressing all other section observers
   * while this is active (scene !== null).
   */
  onSceneChange?: (scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS' | null) => void;
}

const SCENE_CONFIG = {
  PRODUCTS: {
    contentScale: 1.00,
    offsetY: 'clamp(-50px, -6vh, -20px)',
  },
  SERVICES: {
    contentScale: 1.00,
    offsetY: '0px',
  },
  EVENTS: {
    contentScale: 1.00,
    offsetY: 'clamp(150px, 14vh, 160px)',
  },
};

/**
 * Maps a raw 0-1 timeline progress to the active scene.
 * Boundaries are chosen so that the "active" label switches only at the
 * midpoint of each transition, never during one.
 *
 * Timeline units (out of 125):
 *   0-32   → PRODUCTS visible
 *   32-46  → PRODUCTS→SERVICES transition  (midpoint 39 = 0.312)
 *   46-76  → SERVICES visible
 *   76-90  → SERVICES→EVENTS transition    (midpoint 83 = 0.664)
 *   90-125 → EVENTS visible
 */
const progressToScene = (p: number): 'PRODUCTS' | 'SERVICES' | 'EVENTS' => {
  if (p >= 0.664) return 'EVENTS';
  if (p >= 0.312) return 'SERVICES';
  return 'PRODUCTS';
};

export const ScrollStory = forwardRef<ScrollStoryHandle, ScrollStoryProps>((
  {
    productsRef,
    servicesRef,
    eventsRef,
    onSceneChange,
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const productsLayerRef = useRef<HTMLDivElement>(null);
  const servicesLayerRef = useRef<HTMLDivElement>(null);
  const eventsLayerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const printerRef = useRef<HTMLDivElement>(null);
  const particlesContainerRef = useRef<HTMLDivElement>(null);
  const cartCursorRef = useRef<HTMLDivElement>(null);
  const activeParticlesRef = useRef<Set<HTMLElement>>(new Set());
  const cursorPosRef = useRef({ x: -1000, y: -1000 });
  const coinAudioPoolRef = useRef<HTMLAudioElement[]>([]);
  const lastCollectTimeRef = useRef<number>(0);
  const comboCountRef = useRef<number>(0);
  const activeTimelinesRef = useRef<Set<gsap.core.Timeline>>(new Set());

  // Track the last reported scene so we only fire on real changes
  const lastReportedScene = useRef<'PRODUCTS' | 'SERVICES' | 'EVENTS' | null>(null);

  const reportScene = (scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS' | null) => {
    if (lastReportedScene.current !== scene) {
      lastReportedScene.current = scene;
      onSceneChange?.(scene);
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToScene: (scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS') => {
      if (!scrollTriggerRef.current) return;
      const st = scrollTriggerRef.current;
      let targetProgress = 0;
      if (scene === 'PRODUCTS') targetProgress = 0;
      else if (scene === 'SERVICES') targetProgress = 0.49;
      else if (scene === 'EVENTS') targetProgress = 0.86;

      const targetY = st.start + targetProgress * (st.end - st.start);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }), []);

  useEffect(() => {
    if (
      !containerRef.current ||
      !stickyRef.current ||
      !productsLayerRef.current ||
      !servicesLayerRef.current ||
      !eventsLayerRef.current ||
      !bgRef.current
    ) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          pin: stickyRef.current,
          scrub: 1,
          anticipatePin: 1,
          start: 'top top',
          end: 'bottom bottom',
          onEnter: () => {
            // Report the entry scene immediately so the navbar doesn't flicker
            const p = scrollTriggerRef.current?.progress ?? 0;
            reportScene(progressToScene(p));
          },
          onLeave: () => {
            // ScrollStory is done — release control to normal observers
            reportScene(null);
          },
          onLeaveBack: () => {
            // Scrolled back above ScrollStory — release control
            reportScene(null);
          },
          onUpdate: (self) => {
            // Only fire while actually active
            if (!self.isActive) return;
            const scene = progressToScene(self.progress);
            reportScene(scene);
          },
        },
      });

      scrollTriggerRef.current = tl.scrollTrigger || null;

      // Initial states:
      gsap.set(bgRef.current, { backgroundColor: 'transparent' });
      gsap.set(productsLayerRef.current, { scale: 1, opacity: 1, filter: 'blur(0px)', zIndex: 3, autoAlpha: 1 });
      gsap.set(servicesLayerRef.current, { scale: 1.35, opacity: 0, filter: 'blur(12px)', zIndex: 2, autoAlpha: 0 });
      gsap.set(eventsLayerRef.current, { yPercent: -100, opacity: 0, filter: 'blur(0px)', zIndex: 1, autoAlpha: 0 });

      // Total timeline duration = 125 units

      // 0 to 14: Smoothly interpolate background from transparent (inheriting Team black) to White (#f0f0f0)
      tl.to(bgRef.current, {
        backgroundColor: '#f0f0f0',
        duration: 14,
        ease: 'power1.inOut'
      }, 0);

      // 0 to 32: Products fully visible
      tl.to({}, { duration: 32 });

      // 32 to 46: Products zooms out, fades, blur. Services zooms in. Background transitions White -> Black.
      tl.to(bgRef.current, {
        backgroundColor: '#202121',
        duration: 14,
        ease: 'power2.inOut',
      }, 32);

      tl.to(productsLayerRef.current, {
        scale: 0.65,
        opacity: 0,
        filter: 'blur(14px)',
        autoAlpha: 0,
        duration: 14,
        ease: 'power2.inOut',
      }, 32);

      tl.to(servicesLayerRef.current, {
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        autoAlpha: 1,
        duration: 14,
        ease: 'power2.inOut',
      }, 32);

      // 46 to 76: Services fully visible and interactive.
      tl.to({}, { duration: 30 });

      // 76 to 90: Services slides down out of viewport. Events slides down from above. Background transitions Black -> White.
      tl.to(bgRef.current, {
        backgroundColor: '#f0f0f0',
        duration: 14,
        ease: 'power2.inOut',
      }, 76);

      tl.to(servicesLayerRef.current, {
        yPercent: 100,
        opacity: 0,
        autoAlpha: 0,
        duration: 14,
        ease: 'power2.inOut',
      }, 76);

      tl.to(eventsLayerRef.current, {
        yPercent: 0,
        opacity: 1,
        autoAlpha: 1,
        duration: 14,
        ease: 'power2.inOut',
      }, 76);

      // 90 to 110: Events fully visible
      tl.to({}, { duration: 20 }, 90);

      // 110 to 125: Seamlessly dissolve background to transparent so it blends perfectly into Achievements without a horizontal seam
      tl.to(bgRef.current, {
        backgroundColor: 'transparent',
        duration: 15,
        ease: 'power1.inOut'
      }, 110);

    }, containerRef);

    return () => {
      // Ensure we release control when this component unmounts
      reportScene(null);
      ctx.revert();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Printer random patrol animation
  useEffect(() => {
    const el = printerRef.current;
    if (!el) return;

    let isActive = true;

    const patrol = () => {
      if (!isActive) return;

      const speedCategory = Math.random();
      let duration;
      if (speedCategory < 0.4) {
        // Fast
        duration = gsap.utils.random(0.8, 1.4);
      } else if (speedCategory < 0.8) {
        // Normal
        duration = gsap.utils.random(1.4, 2.1);
      } else {
        // Slower
        duration = gsap.utils.random(2.1, 2.5);
      }
      
      const elWidth = el.offsetWidth || 300;
      const windowWidth = window.innerWidth;
      
      // Calculate safe boundaries. Leave 20px padding from the edges.
      const maxDistance = (windowWidth / 2) - (elWidth / 2) - 20;
      const safeDistance = Math.max(0, maxDistance);

      const destX = gsap.utils.random(-safeDistance, safeDistance);

      gsap.to(el, {
        x: destX,
        duration: duration,
        ease: 'power2.inOut',
        onComplete: patrol
      });
    };

    patrol();

    return () => {
      isActive = false;
      gsap.killTweensOf(el);
    };
  }, []);

  // Preload coin sound audio pool
  useEffect(() => {
    coinAudioPoolRef.current = Array.from({ length: 5 }, () => {
      const audio = new Audio(coinSoundUrl);
      audio.preload = 'auto';
      audio.volume = 0.75;
      return audio;
    });
  }, []);

  const playCoinSound = (combo: number) => {
    const pool = coinAudioPoolRef.current;
    if (!pool || pool.length === 0) return;
    const available = pool.find((a) => a.paused || a.ended) || pool[0];
    available.currentTime = 0;
    
    // Scale playback rate subtle multiplier per combo level, capped at 1.20x
    const rate = Math.min(1.20, 1.0 + (combo - 1) * 0.035);
    available.playbackRate = rate;

    available.play().catch(() => {
      // Ignore browser autoplay restrictions prior to user interaction
    });
  };

  // Collect Product function
  const collectProduct = (el: HTMLElement) => {
    if (!el || el.dataset.collected === 'true') return;
    el.dataset.collected = 'true';
    activeParticlesRef.current.delete(el);
    gsap.killTweensOf(el);

    // Calculate combo
    const now = Date.now();
    if (now - lastCollectTimeRef.current <= 1000) {
      comboCountRef.current += 1;
    } else {
      comboCountRef.current = 1;
    }
    lastCollectTimeRef.current = now;

    const currentCombo = comboCountRef.current;
    playCoinSound(currentCombo);

    const rect = el.getBoundingClientRect();
    const parentRect = particlesContainerRef.current?.getBoundingClientRect();
    if (!parentRect) {
      el.remove();
      return;
    }

    const posX = rect.left + rect.width / 2 - parentRect.left;
    const posY = rect.top + rect.height / 2 - parentRect.top;

    // Small pop effect on product
    gsap.to(el, {
      scale: 1.4,
      opacity: 0,
      duration: 0.18,
      ease: 'power2.out',
      onComplete: () => el.remove()
    });

    // Floating Combo Text
    const textEl = document.createElement('div');
    textEl.textContent = currentCombo === 1 ? '+1 Product' : `${currentCombo}x Combo!`;
    
    // Visual size & brightness changes based on combo
    const fontSize = Math.min(36, 20 + currentCombo * 1.5);
    const brightness = Math.min(1.4, 1.0 + (currentCombo - 1) * 0.05);

    textEl.className = 'absolute font-black tracking-wider uppercase pointer-events-none select-none z-50 text-[#f9d02d] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]';
    textEl.style.left = `${posX}px`;
    textEl.style.top = `${posY}px`;
    textEl.style.transform = 'translate(-50%, -50%)';
    textEl.style.fontSize = `${fontSize}px`;
    textEl.style.filter = `brightness(${brightness})`;

    particlesContainerRef.current?.appendChild(textEl);

    const scaleBoost = Math.min(1.3, 1.0 + (currentCombo - 1) * 0.04);
    gsap.fromTo(textEl,
      { y: 0, scale: 0.8 * scaleBoost, opacity: 1 },
      {
        y: -55,
        scale: 1.18 * scaleBoost,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.out',
        onComplete: () => textEl.remove()
      }
    );
  };

  // Eject burst of 3 products every 2 seconds
  const emitBurst = () => {
    if (document.hidden) return;
    if (!printerRef.current || !particlesContainerRef.current) return;
    const layer = productsLayerRef.current;
    if (!layer || (gsap.getProperty(layer, 'opacity') as number) < 0.5) return;

    const printerRect = printerRef.current.getBoundingClientRect();
    const parentRect = particlesContainerRef.current.getBoundingClientRect();

    const originX = printerRect.left + printerRect.width / 2 - parentRect.left;
    const originY = printerRect.top + printerRect.height * 0.35 - parentRect.top;

    if (PRODUCT_ASSETS.length < 3) return;

    const shuffled = [...PRODUCT_ASSETS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    // Wide fountain spread angles:
    // Left: -110° to -125°
    // Center: -85° to -95°
    // Right: -55° to -70°
    const angles = [
      gsap.utils.random(-110, -125),
      gsap.utils.random(-85, -95),
      gsap.utils.random(-55, -70)
    ];

    selected.forEach((src, idx) => {
      const angle = angles[idx];
      const rad = angle * Math.PI / 180;
      const V = gsap.utils.random(680, 780);
      const vx = V * Math.cos(rad);
      const vy = V * Math.sin(rad);

      const size = gsap.utils.random(70, 110);
      const rotationSpeed = gsap.utils.random(-360, 360);

      const particle = document.createElement('img');
      particle.src = src;
      particle.className = 'absolute object-contain select-none cursor-pointer will-change-transform';
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${originX}px`;
      particle.style.top = `${originY}px`;
      particle.style.transform = 'translate(-50%, -50%)';

      particle.addEventListener('pointerenter', () => collectProduct(particle));
      particle.addEventListener('mouseenter', () => collectProduct(particle));

      particlesContainerRef.current?.appendChild(particle);
      activeParticlesRef.current.add(particle);

      const apexTime = gsap.utils.random(0.68, 0.88);
      const fallTime = gsap.utils.random(1.25, 1.55);
      const totalTime = apexTime + fallTime;

      // Horizontal drift
      gsap.to(particle, {
        x: vx * totalTime,
        duration: totalTime,
        ease: 'none'
      });

      // Rotation
      gsap.to(particle, {
        rotation: rotationSpeed,
        duration: totalTime,
        ease: 'none'
      });

      // Vertical launch + gravitational fall
      const tl = gsap.timeline({
        onComplete: () => {
          activeParticlesRef.current.delete(particle);
          activeTimelinesRef.current.delete(tl);
          particle.remove();
        }
      });
      activeTimelinesRef.current.add(tl);

      if (document.hidden) {
        tl.pause();
      }

      const jumpHeight = Math.abs(vy) * apexTime * 0.72;
      tl.to(particle, {
        y: -jumpHeight,
        duration: apexTime,
        ease: 'power2.out'
      });

      tl.to(particle, {
        y: window.innerHeight + 220,
        duration: fallTime,
        ease: 'power2.in'
      });
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      emitBurst();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle visibility state to pause and resume animations when tab changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        activeTimelinesRef.current.forEach((tl) => tl.pause());
        activeParticlesRef.current.forEach((particle) => {
          gsap.getTweensOf(particle).forEach((t) => t.pause());
        });
      } else {
        activeTimelinesRef.current.forEach((tl) => tl.resume());
        activeParticlesRef.current.forEach((particle) => {
          gsap.getTweensOf(particle).forEach((t) => t.resume());
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Shopping cart cursor & instant touch collection tracking
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      cursorPosRef.current = { x: e.clientX, y: e.clientY };

      const layer = productsLayerRef.current;
      if (layer && layer.contains(e.target as Node) && (gsap.getProperty(layer, 'opacity') as number) >= 0.5) {
        if (cartCursorRef.current) {
          cartCursorRef.current.style.display = 'block';
          cartCursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }
        layer.style.cursor = 'none';

        activeParticlesRef.current.forEach((particle) => {
          const r = particle.getBoundingClientRect();
          if (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          ) {
            collectProduct(particle);
          }
        });
      } else {
        if (cartCursorRef.current) {
          cartCursorRef.current.style.display = 'none';
        }
        if (layer) layer.style.cursor = '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div ref={containerRef} className="w-full relative" style={{ height: '550vh' }}>
      <div
        ref={stickyRef}
        className="top-0 left-0 w-full overflow-hidden"
        style={{ height: '100vh' }}
      >
        {/* Animated Background Layer */}
        <div ref={bgRef} className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: 'transparent' }} />

        {/* Products Scene */}
        <div
          ref={productsLayerRef}
          className="absolute inset-0 flex flex-col justify-center will-change-transform"
          style={{
            transform: 'translate3d(0,0,0)',
            zIndex: 3,
          }}
        >
          {/* Printer GIF Layer (Behind Products content) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
             <div className="absolute bottom-0 left-0 w-full flex justify-center items-end m-0 p-0">
                <div ref={printerRef} className="will-change-transform flex items-end m-0 p-0 leading-none">
                   <img 
                     src={printerGif} 
                     alt="Autonomous Printer" 
                     className="h-[20vh] sm:h-[25vh] max-h-[300px] w-auto object-contain opacity-95 drop-shadow-xl block m-0 p-0 align-bottom" 
                   />
                </div>
             </div>
          </div>

          <div
            className="w-full h-full flex flex-col justify-center pointer-events-auto relative z-10"
            style={{
              transform: `scale(${SCENE_CONFIG.PRODUCTS.contentScale}) translateY(${SCENE_CONFIG.PRODUCTS.offsetY})`,
              transformOrigin: 'center center',
            }}
          >
             <OurProductsSection ref={productsRef} />
          </div>

          {/* Flying Product Particles & Floating Text Layer (Above all Products content, below Navbar) */}
          <div ref={particlesContainerRef} className="absolute inset-0 pointer-events-none overflow-visible z-20" />
        </div>

        {/* Services Scene */}
        <div
          ref={servicesLayerRef}
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{
            transform: 'translate3d(0,0,0)',
            zIndex: 2,
          }}
        >
           <div
             className="w-full h-full flex flex-col justify-center pointer-events-auto"
             style={{
               transform: `scale(${SCENE_CONFIG.SERVICES.contentScale}) translateY(${SCENE_CONFIG.SERVICES.offsetY})`,
               transformOrigin: 'center center',
             }}
           >
             <div ref={servicesRef} id="services" className="scroll-mt-0 w-full relative z-10" />
             <ServicesCarousel />
           </div>
        </div>

        {/* Events Scene */}
        <div
          ref={eventsLayerRef}
          className="absolute inset-0 flex flex-col items-center will-change-transform"
          style={{
            transform: 'translate3d(0,0,0)',
            zIndex: 1,
          }}
        >
           <div
             className="w-full h-full flex flex-col pointer-events-auto"
             style={{
               transform: `scale(${SCENE_CONFIG.EVENTS.contentScale}) translateY(${SCENE_CONFIG.EVENTS.offsetY})`,
               transformOrigin: 'center top',
             }}
           >
             <div ref={eventsRef} id="events" className="scroll-mt-0 w-full relative z-10" />
             <EventsSection />
           </div>
        </div>

      </div>

      {/* Shopping Cart Custom Cursor */}
      <div
        ref={cartCursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[999999] hidden -translate-x-1 -translate-y-1"
        style={{ display: 'none' }}
      >
        <svg
          className="w-20 h-20 sm:w-24 sm:h-24 text-[#202121] drop-shadow-[0_2px_8px_rgba(255,255,255,0.95)]"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </div>
    </div>
  );
});

ScrollStory.displayName = 'ScrollStory';
