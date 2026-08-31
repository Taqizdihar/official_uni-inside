import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import App from './App.tsx';
import './index.css';

const NewsPage = lazy(() => import('./pages/NewsPage').then(({ NewsPage: Page }) => ({ default: Page })));

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<App key="landing" />} />
        <Route path="/news" element={
          <Suspense fallback={<main aria-busy="true" aria-label="Loading news" className="w-full min-h-screen bg-[#f0f0f0]" />}>
            <NewsPage key="news" />
          </Suspense>
        } />
      </Routes>
    </AnimatePresence>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </StrictMode>,
);
