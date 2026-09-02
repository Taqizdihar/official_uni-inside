import { StrictMode, Suspense, createContext, lazy, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import App from './App.tsx';
import './index.css';

const NewsPage = lazy(() => import('./pages/NewsPage').then(({ NewsPage: Page }) => ({ default: Page })));
const MediaKitPage = lazy(() => import('./pages/MediaKitPage').then(({ MediaKitPage: Page }) => ({ default: Page })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(({ ProductsPage: Page }) => ({ default: Page })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(({ ServicesPage: Page }) => ({ default: Page })));

const routeTitles: Record<string, string> = {
  '/media-kit': 'Media Kit | Uni-Inside',
  '/products': 'Products | Uni-Inside',
  '/services': 'Services | Uni-Inside',
  '/news': 'News | Uni-Inside',
};

const landingScrollPositions = new Map<string, number>();
let lastLandingScroll = 0;

const RouteTransitionContext = createContext<{ enteredRouteKey: string; markRouteEntered: (key: string) => void } | null>(null);

const RouteTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [enteredRouteKey, setEnteredRouteKey] = useState(location.key);
  const markRouteEntered = useCallback((key: string) => setEnteredRouteKey(key), []);
  return <RouteTransitionContext.Provider value={{ enteredRouteKey, markRouteEntered }}>{children}</RouteTransitionContext.Provider>;
};

const useRouteTransition = () => {
  const transition = useContext(RouteTransitionContext);
  if (!transition) throw new Error('Route transition state is unavailable.');
  return transition;
};

const scrollImmediately = (top: number) => {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo({ top, left: 0, behavior: 'auto' });
  root.style.scrollBehavior = previousBehavior;
};

/** Owns SPA scroll restoration independently from landing-page ScrollStory. */
const RouteDocumentState = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { enteredRouteKey } = useRouteTransition();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    document.title = routeTitles[location.pathname] ?? 'Official Uni-Inside';
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/') return;
    const save = () => {
      const position = Math.max(0, window.scrollY);
      landingScrollPositions.set(location.key, position);
      lastLandingScroll = position;
    };
    save();
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      save();
      window.removeEventListener('scroll', save);
    };
  }, [location.key, location.pathname]);

  useLayoutEffect(() => {
    if (enteredRouteKey !== location.key) return;
    const wasOnLanding = previousPathnameRef.current === '/';
    const savedForEntry = landingScrollPositions.get(location.key);
    const target = location.pathname === '/'
      ? navigationType === 'POP'
        ? savedForEntry ?? 0
        : !wasOnLanding && lastLandingScroll > 0
          ? lastLandingScroll
          : 0
      : 0;
    previousPathnameRef.current = location.pathname;

    let firstFrame = 0;
    let secondFrame = 0;
    const restore = (allowRetry: boolean) => {
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      scrollImmediately(Math.min(Math.max(target, 0), maximum));
      if (allowRetry && target > maximum) secondFrame = window.requestAnimationFrame(() => restore(false));
    };

    // The incoming route is still transparent while these layout frames run.
    firstFrame = window.requestAnimationFrame(() => restore(true));
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [enteredRouteKey, location.key, location.pathname, navigationType]);

  return null;
};

const RouteFallback = () => <main aria-busy="true" aria-live="polite" aria-label="Loading page" className="min-h-screen w-full bg-white"><span className="sr-only">Loading page</span></main>;

const AnimatedRoutes = () => {
  const location = useLocation();
  const { markRouteEntered } = useRouteTransition();
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 0.12 : 0.32;

  return (
    <div className="min-h-screen bg-white">
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => markRouteEntered(location.key)}>
        <motion.div
          key={location.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'easeInOut' }}
          className="relative min-h-screen bg-white"
        >
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location}>
              <Route path="/" element={<App />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/media-kit" element={<MediaKitPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/services" element={<ServicesPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteTransitionProvider>
        <RouteDocumentState />
        <AnimatedRoutes />
      </RouteTransitionProvider>
    </BrowserRouter>
  </StrictMode>,
);
