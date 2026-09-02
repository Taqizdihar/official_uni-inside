import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
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
};

const RouteDocumentState = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    document.title = routeTitles[pathname] ?? 'Official Uni-Inside';

    // Let browser back/forward restoration win; new route navigations begin at the top.
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [navigationType, pathname]);

  return null;
};

const RouteFallback = () => (
  <main aria-busy="true" aria-live="polite" aria-label="Loading page" className="min-h-screen w-full bg-[#f0f0f0]">
    <span className="sr-only">Loading page</span>
  </main>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<App key="landing" />} />
        <Route path="/news" element={
          <Suspense fallback={<RouteFallback />}>
            <NewsPage key="news" />
          </Suspense>
        } />
        <Route path="/media-kit" element={
          <Suspense fallback={<RouteFallback />}>
            <MediaKitPage key="media-kit" />
          </Suspense>
        } />
        <Route path="/products" element={
          <Suspense fallback={<RouteFallback />}>
            <ProductsPage key="products" />
          </Suspense>
        } />
        <Route path="/services" element={
          <Suspense fallback={<RouteFallback />}>
            <ServicesPage key="services" />
          </Suspense>
        } />
      </Routes>
    </AnimatePresence>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteDocumentState />
      <AnimatedRoutes />
    </BrowserRouter>
  </StrictMode>,
);
