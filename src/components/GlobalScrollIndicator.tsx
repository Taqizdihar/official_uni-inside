import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useLocation } from 'react-router-dom';
import animationData from '../assets/lottie/scrollbar/scrollbar.json';

type Color = { r: number; g: number; b: number; a: number };

const parseColor = (value: string): Color | null => {
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? hex.split('').map((channel) => channel + channel).join('') : hex;
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: 1,
    };
  }
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
  const thumbRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const frameRef = useRef(0);
  const scrollingRef = useRef(false);
  const lightRef = useRef(false);
  const thumbColorRef = useRef('');
  const [scrollable, setScrollable] = useState(false);
  const [visible, setVisible] = useState(true);
  const [scrolling, setScrolling] = useState(false);
  const [thumbHovered, setThumbHovered] = useState(false);
  const [heroInViewport, setHeroInViewport] = useState(location.pathname === '/');
  const [underNavbar, setUnderNavbar] = useState(true);
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
      if (!canScroll) {
        setUnderNavbar(false);
        return;
      }

      const virtualThumbHeight = Math.min(viewportHeight, Math.max(20, viewportHeight * viewportHeight / documentScrollHeight));
      const progress = Math.min(1, Math.max(0, window.scrollY / maximumScroll));
      const center = virtualThumbHeight / 2 + progress * (viewportHeight - virtualThumbHeight);
      const thumb = thumbRef.current;
      if (thumb) {
        thumb.style.height = `${virtualThumbHeight}px`;
        thumb.style.transform = `translate3d(0, ${center - virtualThumbHeight / 2}px, 0)`;
      }
      const size = element.getBoundingClientRect().height;
      const top = Math.min(viewportHeight - size, Math.max(0, center - size / 2));
      element.style.transform = `translate3d(0, ${top}px, 0)`;
      const indicatorBounds = element.getBoundingClientRect();
      const indicatorZIndex = Number.parseInt(getComputedStyle(element).zIndex, 10);
      const navbarOccludesIndicator = Array.from(document.querySelectorAll('nav')).some((navbar) => {
        const navbarStyle = getComputedStyle(navbar);
        const navbarZIndex = Number.parseInt(navbarStyle.zIndex, 10);
        if (navbarStyle.position !== 'fixed' || !Number.isFinite(navbarZIndex) || navbarZIndex <= indicatorZIndex) return false;
        const navbarBounds = navbar.getBoundingClientRect();
        const overlaps = indicatorBounds.left < navbarBounds.right
          && indicatorBounds.right > navbarBounds.left
          && indicatorBounds.top < navbarBounds.bottom
          && indicatorBounds.bottom > navbarBounds.top;
        if (!overlaps) return false;
        const pointX = Math.min(indicatorBounds.right, navbarBounds.right) - 1;
        const pointY = Math.max(indicatorBounds.top, navbarBounds.top) + 1;
        return document.elementsFromPoint(pointX, pointY).some((node) => node === navbar || navbar.contains(node));
      });
      setUnderNavbar((previous) => previous === navbarOccludesIndicator ? previous : navbarOccludesIndicator);

      // The sample is at the actual painted position, so it follows ScrollStory's
      // interpolated background and also works on routes with different surfaces.
      const x = Math.max(0, window.innerWidth - 7);
      const y = Math.min(viewportHeight - 1, Math.max(0, center));
      const fallback = parseColor(getComputedStyle(document.documentElement).getPropertyValue('--scrollstory-bg'))
        ?? parseColor(getComputedStyle(document.body).backgroundColor)
        ?? { r: 255, g: 255, b: 255, a: 1 };
      const layers = document.elementsFromPoint(x, y)
        .filter((node) => !node.closest('[data-global-scroll-indicator], [data-global-scroll-thumb]'))
        .map((node) => parseColor(getComputedStyle(node).backgroundColor))
        .filter((color): color is Color => color !== null && color.a > 0);
      const surface = layers.reduceRight((behind, front) => blend(front, behind), fallback);
      const isLightSurface = luminance(surface) > 0.5;
      const thumbTint = isLightSurface ? { r: 0, g: 0, b: 0, a: 0.14 } : { r: 255, g: 255, b: 255, a: 0.16 };
      const nextThumbColor = blend(thumbTint, surface);
      const roundedColor = `rgb(${Math.round(nextThumbColor.r)}, ${Math.round(nextThumbColor.g)}, ${Math.round(nextThumbColor.b)})`;
      const thumbVisual = thumb?.firstElementChild;
      if (thumbVisual instanceof HTMLElement && thumbColorRef.current !== roundedColor) {
        thumbVisual.style.backgroundColor = roundedColor;
        thumbColorRef.current = roundedColor;
      }
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
      setScrolling(false);
      clearTimeout(graceTimer);
      setVisible(true);
    };
    const onScroll = () => {
      schedule();
      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setScrolling(true);
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
    setUnderNavbar(true);
    update();
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
    <>
      <div
      ref={elementRef}
      data-global-scroll-indicator
      aria-hidden="true"
        className="fixed right-[max(-44px,calc(env(safe-area-inset-right)-44px))] sm:right-[max(-58px,calc(env(safe-area-inset-right)-58px))] top-0 z-[60] h-[clamp(132px,15vw,216px)] w-[clamp(132px,15vw,216px)] pointer-events-none transition-opacity duration-200 ease-out"
        style={{
          opacity: scrollable && visible && !heroInViewport && !underNavbar ? 1 : 0,
          // Keep the element visible during the opacity transition so the
          // higher navbar's overlap no longer cuts the indicator off abruptly.
          visibility: scrollable && !heroInViewport ? 'visible' : 'hidden',
        }}
    >
      <div className="h-full w-full rotate-90 transition-[filter] duration-300" style={{ filter: light ? 'brightness(0)' : 'brightness(0) invert(1)' }}>
        <Lottie lottieRef={lottieRef} animationData={animationData} loop={!reducedMotion} autoplay={!reducedMotion} className="h-full w-full" />
      </div>
    </div>
      <div
        data-global-scroll-thumb
        aria-hidden="true"
        className="fixed right-0 top-0 z-[60] h-0 w-5 pointer-events-none transition-opacity duration-200 ease-out"
        style={{
          opacity: scrollable && !heroInViewport && !underNavbar ? (thumbHovered ? 0.88 : scrolling ? 0.55 : 0.3) : 0,
          visibility: scrollable && !heroInViewport ? 'visible' : 'hidden',
        }}
      >
        <div
          ref={thumbRef}
          className="pointer-events-auto absolute right-0 top-0 flex w-5 items-center justify-center"
          style={{ height: '100%' }}
          onMouseEnter={() => setThumbHovered(true)}
          onMouseLeave={() => setThumbHovered(false)}
        >
          <span className="h-full w-[5px] rounded-full" style={{ backgroundColor: 'rgb(226, 226, 226)' }} />
        </div>
      </div>
    </>
  );
}
