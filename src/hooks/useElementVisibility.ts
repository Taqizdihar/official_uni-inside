import { useEffect, useState, type RefObject } from 'react';
import { usePageVisibility } from './usePageVisibility';

/**
 * Tracks whether an element is close enough to the viewport to justify work.
 * A generous margin keeps existing scroll-controlled scenes ready before they
 * become visible.
 *
 * Page visibility comes from a single shared document listener rather than one
 * listener per hook instance.
 */
export const useElementVisibility = <T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = '400px 0px',
) => {
  const [isVisible, setIsVisible] = useState(false);
  const isPageVisible = usePageVisibility();

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

  return { isVisible, isPageVisible };
};
