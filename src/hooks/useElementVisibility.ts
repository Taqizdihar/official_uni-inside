import { useEffect, useState, type RefObject } from 'react';

/**
 * Tracks whether an element is close enough to the viewport to justify work.
 * A generous margin keeps existing scroll-controlled scenes ready before they
 * become visible.
 */
export const useElementVisibility = <T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = '400px 0px',
) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return { isVisible, isPageVisible };
};
