import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Aperture, Camera, Image as ImageIcon, Lightbulb, Monitor, PenTool, Scissors, Smartphone, Sparkles, Video } from 'lucide-react';
import { useElementVisibility } from '../hooks/useElementVisibility';
import { getPageVisibility, subscribeToPageVisibility } from '../hooks/usePageVisibility';

/** Unchanged rotation order and cadence. */
export const ABOUT_ICONS = [Camera, Video, Monitor, Sparkles, ImageIcon, Scissors, Aperture, Smartphone, PenTool, Lightbulb];
const ROTATION_INTERVAL_MS = 2000;

/**
 * One shared rotation clock.
 *
 * The index used to live in `App`, so every tick re-rendered the whole page and
 * the duplicated magnifier tree. It now lives in a store that only the icons
 * subscribe to, and the interval runs only while an icon is near the viewport
 * and the tab is visible. A single store also keeps the About icon and its
 * magnified copy on exactly the same frame.
 */
const listeners = new Set<() => void>();
let iconIndex = 0;
let intervalId: number | null = null;
let activeCount = 0;
let unsubscribeVisibility: (() => void) | null = null;

const emit = () => listeners.forEach((listener) => listener());

const tick = () => {
  iconIndex = (iconIndex + 1) % ABOUT_ICONS.length;
  emit();
};

const syncInterval = () => {
  const shouldRun = activeCount > 0 && getPageVisibility();
  if (shouldRun && intervalId === null) {
    intervalId = window.setInterval(tick, ROTATION_INTERVAL_MS);
  } else if (!shouldRun && intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => iconIndex;
const getServerSnapshot = () => 0;

const useAboutIconIndex = (isActive: boolean) => {
  const index = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isActive) return;

    activeCount += 1;
    if (activeCount === 1) unsubscribeVisibility = subscribeToPageVisibility(syncInterval);
    syncInterval();

    return () => {
      activeCount -= 1;
      syncInterval();
      if (activeCount === 0 && unsubscribeVisibility) {
        unsubscribeVisibility();
        unsubscribeVisibility = null;
      }
    };
  }, [isActive]);

  return index;
};

export const AboutRotatingIcon: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isVisible, isPageVisible } = useElementVisibility(containerRef, '600px 0px');
  const index = useAboutIconIndex(isVisible && isPageVisible);
  const CurrentIcon = ABOUT_ICONS[index];

  return (
    <div ref={containerRef} className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 overflow-hidden mx-4 flex-shrink-0">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={index}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.6, ease: 'backOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <CurrentIcon className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-[#202121]" strokeWidth={2.5} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
