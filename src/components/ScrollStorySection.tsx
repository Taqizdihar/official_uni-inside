import React, { Suspense, forwardRef, lazy, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ScrollStoryHandle, ScrollStoryProps } from './ScrollStory';
import { SCROLL_STORY_HEIGHT } from './scrollStoryLayout';

const ScrollStoryImpl = lazy(() => import('./ScrollStory').then(({ ScrollStory }) => ({ default: ScrollStory })));

/** Roughly ten seconds of frames before a queued scene request is abandoned. */
const MAX_FLUSH_FRAMES = 600;

let hasRequestedChunk = false;
const preloadScrollStory = () => {
  if (hasRequestedChunk) return;
  hasRequestedChunk = true;
  void import('./ScrollStory');
};

export interface ScrollStorySectionHandle extends ScrollStoryHandle {
  /** Start fetching the chunk before the visitor can need it. */
  preload: () => void;
}

interface PendingScroll {
  scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS';
  behavior: ScrollBehavior;
}

/**
 * Lazy boundary for ScrollStory.
 *
 * The placeholder reserves exactly the same `550vh` of document space, so
 * document height, scroll restoration and every ScrollTrigger position are
 * identical whether or not the chunk has arrived. Navbar navigation still works
 * before the chunk loads: the request is queued, the chunk is mounted, and the
 * original smooth scroll runs as soon as the scene API reports ready.
 */
export const ScrollStorySection = forwardRef<ScrollStorySectionHandle, ScrollStoryProps>((props, ref) => {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<ScrollStoryHandle | null>(null);
  const pendingScrollRef = useRef<PendingScroll | null>(null);
  const flushFrameRef = useRef(0);
  const [shouldMount, setShouldMount] = useState(false);

  const mountNow = useCallback(() => {
    preloadScrollStory();
    setShouldMount((mounted) => mounted || true);
  }, []);

  const flushAttemptsRef = useRef(0);

  const flushPendingScroll = useCallback(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    const story = storyRef.current;
    if (story && story.isReady()) {
      pendingScrollRef.current = null;
      flushAttemptsRef.current = 0;
      story.scrollToScene(pending.scene, pending.behavior);
      return;
    }
    // Wait for the scene API and its freshly measured layout.
    flushAttemptsRef.current += 1;
    if (flushAttemptsRef.current > MAX_FLUSH_FRAMES) {
      pendingScrollRef.current = null;
      flushAttemptsRef.current = 0;
      return;
    }
    flushFrameRef.current = window.requestAnimationFrame(flushPendingScroll);
  }, []);

  useEffect(() => () => window.cancelAnimationFrame(flushFrameRef.current), []);

  useImperativeHandle(ref, () => ({
    scrollToScene: (scene, behavior: ScrollBehavior = 'smooth') => {
      const story = storyRef.current;
      if (story && story.isReady()) {
        story.scrollToScene(scene, behavior);
        return;
      }
      pendingScrollRef.current = { scene, behavior };
      flushAttemptsRef.current = 0;
      mountNow();
      window.cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = window.requestAnimationFrame(flushPendingScroll);
    },
    // The placeholder occupies the same box, so section tracking keeps working.
    getContainer: () => storyRef.current?.getContainer() ?? placeholderRef.current,
    isReady: () => storyRef.current?.isReady() ?? false,
    preload: mountNow,
  }), [flushPendingScroll, mountNow]);

  useEffect(() => {
    if (shouldMount) return;
    const element = placeholderRef.current;
    if (!element) return;

    // Roughly two viewports of lead time; a restored scroll position already
    // inside the section intersects immediately and mounts on the first callback.
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) mountNow(); },
      { rootMargin: '200% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [mountNow, shouldMount]);

  if (!shouldMount) {
    return <div ref={placeholderRef} className="w-full relative" style={{ height: SCROLL_STORY_HEIGHT }} aria-hidden="true" />;
  }

  return (
    <Suspense fallback={<div ref={placeholderRef} className="w-full relative" style={{ height: SCROLL_STORY_HEIGHT }} aria-hidden="true" />}>
      <ScrollStoryImpl ref={storyRef} {...props} />
    </Suspense>
  );
});

ScrollStorySection.displayName = 'ScrollStorySection';
