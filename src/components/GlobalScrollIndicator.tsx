import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useLocation } from 'react-router-dom';
import animationData from '../assets/lottie/scrollbar/scrollbar.json';

type Color = { r: number; g: number; b: number; a: number };

const parseColor = (value: string): Color | null => {
  const numbers = value.match(/[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 3) return null;
  return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] ?? 1 };
};

const blend = (front: Color, back: Color): Color => ({
  r: front.r * front.a + back.r * (1 - front.a),
  g: front.g * front.a + back.g * (1 - front.a),
  b: front.b * front.a + back.b * (1 - front.a),
  a: 1,
});

const luminance = ({ r, g, b }: Color) => {
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};

/** A single, non-interactive guide for all routes. The native scrollbar stays hidden. */
export function GlobalScrollIndicator() {
  const location = useLocation();
  const elementRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const frameRef = useRef(0);
  const scrollingRef = useRef(false);
  const lightRef = useRef(false);
  const [scrollable, setScrollable] = useState(false);
  const [visible, setVisible] = useState(true);
  const [heroInViewport, setHeroInViewport] = useState(location.pathname === '/');
  const [light, setLight] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    if (reducedMotion) lottieRef.current?.goToAndStop(0, true);
    else lottieRef.current?.play();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    let graceTimer = 0;
    let endTimer = 0;
    let active = true;

    const update = () => {
      frameRef.current = 0;
      if (!active) return;
      const viewportHeight = window.innerHeight;
      const heroVisible = Array.from(document.querySelectorAll('[data-hero]')).some((hero) => {
        const bounds = hero.getBoundingClientRect();
        return bounds.top < viewportHeight && bounds.bottom > 0;
      });
      setHeroInViewport((previous) => previous === heroVisible ? previous : heroVisible);
      const documentScrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const maximumScroll = Math.max(0, documentScrollHeight - viewportHeight);
      const canScroll = maximumScroll > 1;
      setScrollable((previous) => previous === canScroll ? previous : canScroll);
      if (!canScroll) return;

      const virtualThumbHeight = Math.min(viewportHeight, Math.max(20, viewportHeight * viewportHeight / documentScrollHeight));
      const progress = Math.min(1, Math.max(0, window.scrollY / maximumScroll));
      const center = virtualThumbHeight / 2 + progress * (viewportHeight - virtualThumbHeight);
      const size = element.getBoundingClientRect().height;
      const top = Math.min(viewportHeight - size, Math.max(0, center - size / 2));
      element.style.transform = `translate3d(0, ${top}px, 0)`;

      // The sample is at the actual painted position, so it follows ScrollStory's
      // interpolated background and also works on routes with different surfaces.
      const x = Math.min(window.innerWidth - 1, element.getBoundingClientRect().left + element.clientWidth / 2);
      const y = Math.min(viewportHeight - 1, Math.max(0, center));
      const fallback = parseColor(getComputedStyle(document.documentElement).getPropertyValue('--scrollstory-bg'))
        ?? parseColor(getComputedStyle(document.body).backgroundColor)
        ?? { r: 255, g: 255, b: 255, a: 1 };
      const layers = document.elementsFromPoint(x, y)
        .filter((node) => !node.closest('[data-global-scroll-indicator]'))
        .map((node) => parseColor(getComputedStyle(node).backgroundColor))
        .filter((color): color is Color => color !== null && color.a > 0);
      const surface = layers.reduceRight((behind, front) => blend(front, behind), fallback);
      const value = luminance(surface);
      const nextLight = lightRef.current ? value > 0.39 : value > 0.49;
      if (nextLight !== lightRef.current) {
        lightRef.current = nextLight;
        setLight(nextLight);
      }
    };
    const schedule = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(update);
    };
    const stop = () => {
      scrollingRef.current = false;
      clearTimeout(graceTimer);
      setVisible(true);
    };
    const onScroll = () => {
      schedule();
      if (!scrollingRef.current) {
        scrollingRef.current = true;
        graceTimer = window.setTimeout(() => {
          if (scrollingRef.current) setVisible(false);
        }, 2000);
      }
      clearTimeout(endTimer);
      endTimer = window.setTimeout(stop, 200);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    observer.observe(document.body);
    // ScrollStory paints its interpolated color after the scroll event. Observe
    // that same painted surface so the contrast catches the final animation frame.
    const colorObserver = new MutationObserver(schedule);
    const storySurface = document.querySelector('[style*="--scrollstory-bg"]');
    if (storySurface) colorObserver.observe(storySurface, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule);
    schedule();
    const settledFrame = requestAnimationFrame(schedule);
    return () => {
      active = false;
      observer.disconnect();
      colorObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      cancelAnimationFrame(settledFrame);
      clearTimeout(graceTimer);
      clearTimeout(endTimer);
      scrollingRef.current = false;
    };
  }, [location.key]);

  return (
    <div
      ref={elementRef}
      data-global-scroll-indicator
      aria-hidden="true"
      className="fixed right-[max(-44px,calc(env(safe-area-inset-right)-44px))] sm:right-[max(-58px,calc(env(safe-area-inset-right)-58px))] top-0 z-[60] h-[clamp(132px,15vw,216px)] w-[clamp(132px,15vw,216px)] pointer-events-none transition-opacity duration-300"
      style={{ opacity: scrollable && visible && !heroInViewport ? 1 : 0, visibility: scrollable && !heroInViewport ? 'visible' : 'hidden' }}
    >
      <div className="h-full w-full rotate-90 transition-[filter] duration-300" style={{ filter: light ? 'brightness(0)' : 'brightness(0) invert(1)' }}>
        <Lottie lottieRef={lottieRef} animationData={animationData} loop={!reducedMotion} autoplay={!reducedMotion} className="h-full w-full" />
      </div>
    </div>
  );
}
